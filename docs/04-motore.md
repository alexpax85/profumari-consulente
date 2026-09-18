# 04 · Motore di raccomandazione

Deterministico, in JavaScript puro, senza DOM, senza rete. Prende le risposte del percorso, i profili delle referenze attive e la configurazione; restituisce tre codici ordinati, con motivazione, più una riserva. Vive in `app/js/motore.js` e si prova con `node scripts/test_motore.mjs`.

## Interfaccia

```js
// risposte: { [idDomanda]: idOpzione | idOpzione[] | numero }
// profili: array dei profili (già filtrati per attivo = true)
// config: { accordi, domande, pesi }
// ritorna: { proposte: [{ codice, punteggio, famiglia, descrizione, motivi: [..] }], riserva: {...} | null, desiderato: {...} }
export function raccomanda(risposte, profili, config, opzioni = { n: 3 })
export function costruisciDesiderato(risposte, config)      // testabile a parte
export function punteggio(desiderato, profilo, config)       // testabile a parte
export function spiega(desiderato, profilo, config)          // frasi della motivazione
```

## 1. Dalle risposte al profilo desiderato

Il profilo desiderato ha la stessa forma di un profilo di fragranza, più le esclusioni e i filtri:

```js
{
  accordi: { acquatico: 1.6, agrumato: 0.9, ... },   // somma dei contributi × peso della domanda
  attributi: { intensita: 2, dolcezza: 1, freschezza: 5 },  // media pesata dei contributi (solo quelli espressi)
  stagioni: { estate: 1 }, momento: { giorno: 1 },
  occasioni: ['ufficio'], carattere: ['fresco', 'energico'],
  esclusioni: { gourmand: 1, vaniglia: 0.7 },        // "non sopporto il dolce"
  filtri: { genere: 'uomo' | 'donna' | null, categorie: [...] | null }
}
```

Regole:
- Ogni opzione scelta somma i suoi `accordi` moltiplicati per il `peso` della domanda. Le domande a scelta multipla dividono il peso per il numero di scelte, così chi sceglie tre luoghi non pesa più di chi ne sceglie uno.
- Gli `attributi` (1-5) si combinano con media pesata; se nessuna domanda li tocca restano indefiniti e non contano.
- Le esclusioni sono un vettore separato; non si sottraggono dagli accordi desiderati, si applicano come penalità nel punteggio (vedi sotto), perché "non voglio il dolce" deve escludere anche fragranze che per altri versi somiglierebbero al desiderato.
- Filtro genere: "per lui" tiene `uomo` e `unisex`, "per lei" tiene `donna` e `unisex`, "senza vincoli" tiene tutto. Il genere del profilo vale più della categoria di listino (molte NICCHIA/PREMIUM sono unisex).

## 2. Punteggio di una fragranza

```
S = 0.60 · cos(accordi_desiderati, accordi_profilo)
  + 0.15 · vicinanza_attributi          // 1 − media(|d − p| / 4) sugli attributi espressi
  + 0.10 · contesto                     // media di stagione, momento, occasioni (0-1) sui campi espressi
  + 0.05 · carattere                    // quota di aggettivi desiderati presenti nel profilo
  − 1.00 · esclusione                   // max_k( esclusioni[k] · accordi_profilo[k] ), quindi fino a −1
  − 0.03 · (confidenza == 'bassa')
```

- La similarità coseno lavora sulle 24 chiavi della tassonomia; chiavi assenti valgono 0.
- I coefficienti stanno in `config.pesi` e si tarano dal backoffice.
- Un profilo con `esclusione` ≥ 0.5 (cioè un accordo escluso con valore alto) è di fatto tolto dalla rosa.
- Risultato in [−1, 1]; per il cliente si può mostrare come "affinità" in percentuale solo se davvero utile; nell'MVP meglio non mostrare numeri, solo l'ordine e le motivazioni.

## 3. Scelta dei tre con diversità

Ordinati per punteggio, si scelgono i tre migliori con questo vincolo: **non più di uno per `sottofamiglia`** e non più di due per `famiglia`. Se il vincolo scarta il secondo o terzo classificato, si passa al successivo. È una forma semplice di "maximal marginal relevance": la rosa serve a far provare cose diverse, non tre varianti della stessa idea.

Se restano meno di tre candidati sopra una soglia minima (es. S ≥ 0.25), si allenta prima la soglia, poi il vincolo di sottofamiglia, e infine si completa con i migliori disponibili; la schermata risultati lo segnala con una frase ("abbiamo cercato un po' più in largo").

Il quarto classificato valido diventa la **riserva**, mostrata solo al personale (tocco lungo sul risultato) o su richiesta ("nessuno di questi?").

## 4. Motivazioni

Per ciascun proposto, `spiega()` produce due o tre frasi brevi partendo da:
- i due accordi in cui desiderato e profilo coincidono di più ("legnoso e speziato, come volevi");
- un attributo azzeccato ("intensità discreta, adatta all'ufficio");
- un aggettivo di carattere in comune ("ha quel lato misterioso che hai scelto");
- la `descrizione` del profilo come riga finale.

Le frasi vengono da modelli in `app/config/frasi.json` con segnaposto, così il tono si cambia senza toccare il codice. Mai numeri, mai nomi, mai gergo ("chypre" va spiegato: "fresco e terroso insieme").

## 5. Casi di prova per `scripts/test_motore.mjs`

I test usano profili sintetici, non il catalogo reale, così restano stabili quando il personale modifica le bozze. Almeno questi:

1. **Mare, fresco, ufficio, per lui** → il primo proposto ha `acquatico` o `agrumato` dominante; nessuno dei tre ha `gourmand` > 0.3.
2. **Esclusione "troppo dolce"** → un profilo con `gourmand: 1` esce dalla rosa anche se identico per il resto al desiderato.
3. **Filtro genere "per lei"** → nessun profilo `uomo` nei risultati; gli `unisex` sì.
4. **Diversità** → con quattro profili quasi identici (stessa sottofamiglia) e un quinto diverso ma con punteggio inferiore, il quinto entra nei tre.
5. **Scelta multipla** → tre luoghi scelti pesano quanto un luogo solo (norma del vettore desiderato confrontabile).
6. **Nessuna risposta utile** (solo "per me" e genere) → il motore non esplode: propone tre famiglie diverse tra le più "universali" (pesi di default in config).
7. **Confidenza bassa** → a parità di tutto, il profilo `alta` precede il `bassa`.
8. **Catalogo reale**: un test separato (`scripts/prova_catalogo.mjs`) che carica `dati/profili.json` e stampa i tre risultati per una decina di scenari tipici, da leggere a occhio col personale. Non è un test automatico: è lo strumento di taratura.

## 6. Prestazioni

Trecentocinquanta profili per 24 chiavi: il calcolo è istantaneo anche su un iPad vecchio. Nessuna precomputazione necessaria. I vettori si normalizzano una volta all'avvio.

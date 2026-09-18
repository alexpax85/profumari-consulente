# 03 · Dati

Tre insiemi di dati, tutti in JSON: il **catalogo** (arriva dal gestionale), i **profili olfattivi** (compilati qui, uno per codice) e la **configurazione** del motore (tassonomia e pesi). Più un file **privato** che non va mai in repo.

## Catalogo · `dati/catalogo.json`

Un array di referenze. È l'unico dato che arriva dal gestionale, per export a senso unico.

```json
[{ "codice": "018", "categoria": "UOMO", "attivo": true }]
```

- `codice`: tre cifre, chiave in tutto il progetto.
- `categoria`: `UOMO`, `DONNA`, `NICCHIA`, `PREMIUM` (dal gestionale; se manca si ricava dal codice: < 200 UOMO, < 500 DONNA, < 800 NICCHIA, altrimenti PREMIUM).
- `attivo`: le referenze inattive non entrano mai nel motore.

La copia in questo kit deriva dall'export di Latina del 14/09/2026 (336 codici, due voci senza codice scartate: OLIBANO e PATCHOULI, che sembrano essenze singole). Va sostituita con l'export ufficiale del gestionale appena disponibile.

**Import dal gestionale (16/09/2026)**: non serve un pulsante nuovo nel gestionale. Il backoffice legge direttamente il suo **backup** («Storico e backup» → «Scarica backup»), che è lo stato intero: le referenze stanno in `fragranze`, un oggetto indicizzato per codice, e le categorie sono numerate (`"01 UOMO"`, `"02 DONNA"`, `"03 NICCHIA"`, `"04 PREMIUM"`). L'import riconosce anche un semplice array di referenze, un `{ catalogo: [...] }` e un backup del consulente.

Di ogni referenza si tengono **solo** `codice`, `categoria` e `attivo`; nome, brand, fornitori, costi, note e giacenze vengono scartati prima di qualsiasi salvataggio. Le voci senza un codice a tre cifre (le essenze singole tipo OLIBANO e PATCHOULI) restano fuori. Le referenze sparite dall'export restano in archivio con il loro profilo, ma disattivate: nel motore non entrano più.

Resta comunque utile, più avanti, un pulsante "Esporta catalogo per il consulente" nel gestionale che scarichi solo i tre campi: sarebbe un file da 10 KB invece che da 500, e non passerebbe nemmeno dalle mani di chi importa. Ma non è necessario per lavorare.

Le prove di tutto questo sono in `scripts/test_import.mjs`, comprese quelle che verificano che nome, brand, fornitori e costi non sopravvivano all'import.

## Profili olfattivi · `dati/profili.json`

Un array con una voce per codice. **Dal 17/09/2026 non si scrivono a mano: si generano** dalle piramidi del fornitore (vedi sotto). La `confidenza` dice da dove viene il profilo: `alta` se dietro c'è la card del fornitore, `media` o `bassa` se è ancora una ricostruzione.

> **17/09/2026**: le piramidi sono arrivate — 339 card PDF, una per codice, in quattro cartelle per categoria. Il nome del file è `codice BRAND-NOME.pdf`, quindi la cartella **non si versiona** (è in `.gitignore`: i nomi commerciali restano fuori dalla repo). La card contiene solo codice, famiglia e le tre file di note: nessun attributo, nessuna descrizione.

### Dalla card al profilo

```
card PDF  --estrai_piramidi.py-->  dati/piramidi.json  --genera_profili.mjs-->  dati/profili.json
                                                        ^
                                              app/config/note.json
```

1. `python3 scripts/estrai_piramidi.py` legge le card e scrive `dati/piramidi.json` (codice, categoria, famiglia, testa, cuore, fondo). Undici card sono state corrette a mano dal fornitore con annotazioni sopra la scheda vecchia: lo script scarta il testo coperto e tiene la correzione, altrimenti undici profili prenderebbero la piramide di un'altra fragranza.
2. `app/config/note.json` traduce ogni nota in accordi della tassonomia (331 voci, coprono tutte le note delle card), dice a quale famiglia corrisponde la parola stampata sulla card, e raddrizza le storpiature del fornitore quando la nota va scritta ("CAFFE’" → caffè, "MUSCIHO BIANCO" → muschio bianco). Si modifica senza toccare il codice.
3. `node scripts/genera_profili.mjs --scrivi` costruisce i profili: accordi dalle note (le note del fondo pesano un po' più di quelle di testa, e la famiglia della card entra come una nota in più), e da lì **stima** intensità, persistenza, dolcezza, freschezza, stagioni, momento, occasioni e carattere. Le prove stanno in `scripts/test_genera_profili.mjs`.

Quello che la card non dice resta una stima e va confermato al banco: è la parte da rivedere per prima, insieme al genere (che viene dal profilo precedente o dalla categoria di listino). Rigenerare sovrascrive le correzioni fatte dal backoffice, tranne `noteStaff` e genere: prima di rigenerare, esportare il backup.

```json
{
  "codice": "018",
  "genere": "uomo",
  "famiglia": "aromatico",
  "sottofamiglia": "aromatico fresco speziato",
  "testa": ["bergamotto", "pepe"],
  "cuore": ["lavanda", "pepe di sichuan", "geranio"],
  "fondo": ["ambroxan", "cedro", "labdano"],
  "accordi": { "agrumato": 0.6, "aromatico": 0.5, "speziato": 0.5, "ambrato": 0.7, "legnoso": 0.5 },
  "intensita": 4,
  "persistenza": 4,
  "dolcezza": 2,
  "freschezza": 4,
  "stagioni": { "primavera": 0.8, "estate": 0.8, "autunno": 0.6, "inverno": 0.4 },
  "momento": { "giorno": 0.8, "sera": 0.6 },
  "occasioni": ["quotidiano", "ufficio", "serata"],
  "carattere": ["energico", "sicuro"],
  "descrizione": "Fresco e magnetico: agrumi e pepe su un fondo ambrato e legnoso che resta tutto il giorno.",
  "confidenza": "alta"
}
```

| Campo | Valori | Uso nel motore |
|---|---|---|
| `genere` | `uomo`, `donna`, `unisex` | filtro morbido: a chi si rivolge davvero la fragranza (le NICCHIA e PREMIUM sono spesso unisex) |
| `famiglia` | agrumato, aromatico, acquatico, verde, floreale, fruttato-floreale, chypre, cipriato, orientale, ambrato, legnoso, cuoio, gourmand, fougère | mostrata nel risultato; usata per la diversità |
| `sottofamiglia` | testo libero breve | diversità dei tre risultati |
| `testa`, `cuore`, `fondo` | note in italiano | mostrate nel backoffice; in futuro per ricavare gli accordi |
| `accordi` | chiavi della tassonomia, valori 0-1 | **vettore principale** del matching |
| `intensita`, `persistenza`, `dolcezza`, `freschezza` | 1-5 | attributi confrontati con le risposte |
| `stagioni`, `momento` | 0-1 per chiave | bonus |
| `occasioni` | sottoinsieme di quotidiano, ufficio, serata, sport, speciale, romantico | bonus |
| `carattere` | 2-3 tra energico, calmo, sensuale, elegante, audace, coccola, misterioso, allegro, romantico, sicuro, fresco | bonus e testo della motivazione |
| `descrizione` | una frase ≤ 140 caratteri, senza marchi | mostrata al cliente |
| `confidenza` | `alta`, `media`, `bassa` | ordine di revisione nel backoffice; le "bassa" hanno una piccola penalità nel punteggio finché non vengono confermate |

Campi che il backoffice aggiunge quando il personale interviene: `rivisto` (data), `noteStaff` (testo libero interno, mai mostrato al cliente).

## Tassonomia degli accordi · `app/config/accordi.json`

Ventiquattro accordi; ogni profilo ne usa in genere da tre a sei. Il file di configurazione porta, per ciascuno, l'etichetta da mostrare al cliente e un'icona o colore.

| Chiave | Cosa raccoglie |
|---|---|
| `agrumato` | bergamotto, limone, arancia, pompelmo, mandarino, yuzu |
| `aromatico` | lavanda, salvia, rosmarino, menta, erbe |
| `verde` | foglie, fico, tè verde, galbano, erba tagliata |
| `acquatico` | note marine, ozoniche, sale, calone |
| `fruttato` | frutti rossi, pesca, pera, mela, litchi, ciliegia |
| `solare` | cocco, tiaré, ylang, monoi, sabbia calda, sale e pelle al sole |
| `floreale-bianco` | gelsomino, tuberosa, fiori d'arancio, gardenia, frangipani |
| `rosa` | rosa in tutte le forme |
| `floreale-fresco` | peonia, fresia, mughetto, lillà, fiori acquosi |
| `cipriato` | iris, violetta, eliotropio, aldeidi, talco |
| `speziato` | pepe, cardamomo, cannella, zafferano, zenzero, chiodi di garofano |
| `legnoso` | cedro, sandalo, vetiver, cipresso, legni secchi |
| `oud` | oud, agarwood |
| `ambrato` | ambra, labdano, benzoino, ambroxan |
| `vaniglia` | vaniglia, fava tonka |
| `gourmand` | caramello, praline, cioccolato, caffè, pistacchio, zucchero, mandorla |
| `muschiato` | muschi bianchi, pulito, pelle, lino |
| `cuoio` | cuoio, pelle conciata, zafferano-cuoio |
| `incenso` | incenso, fumo, resine, mirra |
| `tabacco` | foglia di tabacco, miele di tabacco |
| `patchouli` | patchouli, muschio di quercia, terroso |
| `tè` | tè nero, tè verde, matcha, maté |
| `miele` | miele, cera d'api |
| `boozy` | rum, whisky, cognac, vino |

Se in fase di revisione servisse un accordo nuovo, si aggiunge qui e nelle mappature di `05-percorso.md`; il motore non ha chiavi cablate.

## Corrispondenza privata · `dati/privato/nomi.json`

```json
[{ "codice": "018", "nome": "DIOR - SAUVAGE", "categoria": "UOMO" }]
```

Serve solo a rigenerare o correggere le bozze dei profili offline. È in `.gitignore`; non va condiviso, non va importato nell'app, non va mostrato nel backoffice. Se un giorno servisse aiutare il personale nella revisione con il nome dell'originale, farlo su un foglio a parte, non nel software.

## Configurazione delle domande · `app/config/domande.json`

Definisce il percorso (`05-percorso.md`): per ogni domanda l'elenco di opzioni e, per ogni opzione, i contributi al profilo desiderato (accordi, attributi, esclusioni, filtri). È il file che il backoffice modifica in taratura. Struttura:

```json
{
  "id": "luogo",
  "titolo": "Dove vorresti essere adesso?",
  "tipo": "singola",
  "peso": 1.0,
  "opzioni": [
    { "id": "mare", "etichetta": "In riva al mare", "icona": "mare",
      "accordi": { "acquatico": 1, "agrumato": 0.6, "solare": 0.4 },
      "attributi": { "freschezza": 5, "intensita": 2 } }
  ]
}
```

Tipi previsti: `singola`, `multipla` (con `max`), `scala` (1-5), `esclusioni` (contributi negativi con `peso` alto), `filtro` (genere, per sé o regalo). Le domande "gioco" hanno `peso` 0.3-0.4 e possono essere marcate `rotazione: true` per mostrarne una a caso.

## Statistiche anonime · `dati` del dispositivo, poi Firestore

Un contatore giornaliero: percorsi iniziati, completati, abbandonati per domanda, codici proposti (conteggio per codice), risposte per opzione. Nessun identificativo, nessun orario preciso oltre il giorno. Serve al cliente per capire cosa viene proposto più spesso e al personale per tarare i pesi.

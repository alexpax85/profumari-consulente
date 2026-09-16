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

**Export dal gestionale**: proporre al progetto gestionale un pulsante "Esporta catalogo per il consulente" nella scheda Referenze, che scarica esattamente questo JSON (senza brand, nome, fornitori, costi). Nel frattempo il backoffice accetta anche l'incolla di un JSON con campi in più: tiene solo `codice`, `categoria`, `attivo` e scarta il resto già al momento dell'import, così i nomi non vengono mai salvati.

## Profili olfattivi · `dati/profili.json`

Un array con una voce per codice. Le bozze presenti nel kit sono state generate il 16/09/2026 dalle piramidi degli originali commerciali; ognuna porta una `confidenza` che dice quanto fidarsi.

> **16/09/2026**: il cliente ha le piramidi olfattive in un PDF, quello da cui stampa le etichette, e lo manderà. Quando arriva sostituisce le bozze dove è più preciso: prima i 35 codici a confidenza bassa, poi i 66 a confidenza media. Le domande su cosa contenga esattamente quel file (tutte le referenze? note o descrizioni? compare il nome dell'originale?) sono nel questionario `10-questionario-cliente.docx`, sezione A. Se il PDF è regolare conviene scrivere uno script di import una volta sola, invece di ricopiare 336 schede a mano dal backoffice.

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

Ventitré accordi; ogni profilo ne usa in genere da tre a sei. Il file di configurazione porta, per ciascuno, l'etichetta da mostrare al cliente e un'icona o colore.

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

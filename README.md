# Profumari · Consulente olfattivo

Demo: <https://alexpax85.github.io/profumari-consulente/>

Chiosco (iPad in negozio) e web app con cui la clientela de **i profumari** (Latina e Aprilia) arriva, senza saper nulla di profumeria, a **qualche codice di fragranza da provare al banco**. Dopo la schermata di attesa si sceglie fra tre strade:

- **Rispondi a qualche domanda** — un minuto di domande "soft" (luoghi, colori, emozioni, stagioni, segno zodiacale, occasione, per sé o per un regalo) e alla fine tre codici con la loro motivazione. Per chi non ha un'idea precisa.
- **Parti dalle note che ti piacciono** — si sfoglia il catalogo per ingredienti (muschio, cuoio, agrumi, vaniglia), si vede quante fragranze contengono ogni nota e si leggono le piramidi. Per chi una mezza idea ce l'ha, e per il commesso che deve rispondere subito a una richiesta precisa.
- **Raccontami cosa cerchi** — il consulente a parole: *"un profumo fresco, che mi ricordi un bosco d'inverno"*, scritto, detto a voce o composto toccando degli spunti, e tre codici con il perché scritto sulla piramide (*"Per il bosco d'inverno: bacche di ginepro in testa, vetiver sul fondo"*). Nessun modello linguistico sull'iPad: un lessico di 840 scene e oltre seimila modi di dirle, scritto offline con Claude e controllato contro il catalogo, letto da un interprete deterministico (`docs/13-consulente.md`).

Tutte e tre lavorano sulle **piramidi olfattive** del catalogo, e finiscono allo stesso posto: "chiedi al banco di fartele provare".

Progetto **indipendente** dal gestionale di magazzino (`profumari-gestionale`): repo, hosting e dati separati. L'unico legame è un export a senso unico del catalogo (codice, categoria, attivo). Nel chiosco **non compare mai il nome commerciale**: solo il codice a tre cifre.

## Com'è fatto

HTML, CSS e JavaScript puro con moduli ES, **senza build e senza dipendenze**: font e immagini stanno nella repo, si pubblica su qualsiasi hosting statico. PWA con service worker, così sull'iPad funziona anche senza rete. Dati nel browser del dispositivo (`localStorage`) con export/import JSON e punti di ripristino; la fase 2 sostituirà `store-locale.js` con Firestore senza toccare il resto.

```
app/                  la web app (è anche la radice del sito pubblicato)
  index.html          le schermate: attesa, scelta, percorso, risultati, ricerca, trovati, backoffice
  style.css           palette e componenti del gestionale + le schede grandi del chiosco
  js/motore.js        il motore di raccomandazione: puro, senza DOM, senza rete
  js/ricerca.js       il motore della ricerca per note: puro anche lui
  js/interpreta.js    dalla frase del cliente al desiderio (lessico, negazioni, sfumature): puro
  js/consulente.js    dal desiderio ai tre codici, con il perché sulla piramide: puro
  js/percorso.js      il percorso guidato · js/risultati.js  i tre codici
  js/esplora.js       il banco delle note e i profumi che ne escono
  js/consiglio.js     il racconto (testo, voce, spunti) e i tre consigli
  js/backoffice.js    l'area del personale · js/store-locale.js  la persistenza
  js/editor-domande.js  scrivere e tarare le domande dal backoffice
  js/dati.js          caricamento e ripulitura del catalogo importato
  js/icone.js         le icone a linea, disegnate a mano · js/ui.js  aiutanti DOM
  js/scenari.js       gli scenari tipici di taratura (usati anche dagli script)
  config/             accordi, domande, pesi, frasi, testi, ricerca, note, consulente: le prime si
                      tarano dal backoffice, i gruppi di note e le loro spiegazioni si scrivono nel file;
                      lessico.json è compilato da dati/lessico/ e non si tocca a mano
  fonts/ img/ sw.js manifest.json
dati/                 catalogo.json, piramidi.json, profili.json, lessico/ (le scene del consulente
                      a parole, un file per argomento) e privato/ (mai versionato)
docs/                 brief, piano, dati, motore, percorso, backoffice, stile, domande
scripts/              prove e utilità da riga di comando
assets/               logo, favicon, font, CSS del gestionale, workflow di esempio
```

## Avvio locale

```bash
python3 -m http.server 8766
```

poi <http://localhost:8766/app/index.html>. Nessuna dipendenza da installare.

## Prove e utilità

```bash
node scripts/test_motore.mjs
```

Le quattordici prove del motore: i casi elencati in `docs/04-motore.md` (mare/ufficio, veti, filtro di genere, diversità, scelta multipla, nessuna risposta, confidenza) più i controlli di impianto. Profili sintetici, configurazione vera.

```bash
node scripts/test_ricerca.mjs
```

Le trentatré prove della ricerca per note: l'indice della tavolozza (gruppi, famiglie, sinonimi, note nascoste), il punteggio (nota in piramide contro somiglianza di famiglia, peso delle tre file), i veti, i filtri, l'ordine stabile, e una passata sul catalogo vero (ogni nota ha la sua famiglia, i nove gruppi sono pieni, le ricerche tipiche trovano qualcosa).

```bash
node scripts/prova_ricerca.mjs            # le ricerche tipiche sul catalogo vero
node scripts/prova_ricerca.mjs --indice   # la tavolozza com'è oggi: gruppi, note, conteggi
```

```bash
node scripts/test_interpreta.mjs
node scripts/test_consulente.mjs
```

Le prove del consulente a parole. L'interprete su un lessico sintetico (parole vuote, radici e genere, la forma più lunga che vince, negazioni prima e dopo, "non troppo", "un filo di", il tè che non è il pronome, la lettera sbagliata) più una passata sul lessico vero: ogni forma di ogni scena deve tornare alla sua scena. Il consulente su profili sintetici (note in piramide, veti, filtri, diversità, il perché) più le frasi tipiche di `app/js/scenari.js` sul catalogo vero, ognuna con le sue attese, e 220 frasi libere scritte alla cieca (`scripts/frasi_libere.json`): almeno l'85% deve dare una proposta.

```bash
node scripts/costruisci_lessico.mjs                  # dati/lessico/*.json -> app/config/lessico.json
node scripts/prova_consulente.mjs                    # le frasi tipiche, da leggere a occhio
node scripts/prova_consulente.mjs "una frase"        # una frase qualsiasi, con il dettaglio
node scripts/prova_consulente.mjs --copertura FILE   # quante frasi libere capisce
```

Il lessico si scrive in `dati/lessico/` e si compila: il compilatore rifiuta note che non stanno in nessuna piramide, accordi sconosciuti e forme doppie, e se trova un errore non scrive niente.

```bash
node scripts/valida_profili.mjs
```

Controlla che ogni profilo rispetti lo schema di `docs/09-schema-profilo.md` e che ogni referenza attiva abbia il suo profilo.

```bash
node scripts/test_editor_domande.mjs
```

Le dieci prove dell'editor delle domande: id ricavati dal titolo, i tre livelli con cui si dice quanto una risposta spinge, i controlli che segnalano una domanda incompleta, e la verifica che una domanda scritta dal negozio sposti il risultato esattamente come quelle di fabbrica e sopravviva agli aggiornamenti.

```bash
node scripts/test_import.mjs
```

Le ventidue prove sull'import del catalogo e sull'arrivo dei dati nuovi: le forme di file che arrivano dal gestionale (backup intero, export, array), le categorie numerate, lo stato attivo, e la garanzia che nome, brand, fornitori e costi non sopravvivano mai all'import.

```bash
node scripts/prova_catalogo.mjs            # tutti gli scenari
node scripts/prova_catalogo.mjs mare       # solo quelli col nome indicato
```

Fa girare il motore sul catalogo vero per undici scenari tipici e stampa i tre codici con la motivazione: è lo strumento da leggere a occhio insieme al personale quando si tara.

```bash
node scripts/controlla_nomi.mjs
```

Guardia sulla regola numero uno: confronta ogni profilo con il nome del suo originale (letto da `dati/privato/nomi.json`, che resta fuori dalla repo) e cerca i nomi commerciali interi dentro `app/` e `dati/`. Senza il file privato si salta da solo.

```bash
node scripts/test_genera_profili.mjs
```

Le diciannove prove della mappatura note → accordi (`app/config/note.json`) e della costruzione dei profili: normalizzazione delle note, copertura della tabella su tutte le piramidi in archivio, attributi nella scala 1-5, stagioni e occasioni sensate, descrizione entro i 140 caratteri.

```bash
python3 scripts/estrai_piramidi.py          # card PDF del fornitore -> dati/piramidi.json
node scripts/genera_profili.mjs             # prova a vuoto, stampa il riepilogo
node scripts/genera_profili.mjs --scrivi    # scrive dati/profili.json
```

Dopo una rigenerazione va alzato `VERSIONE_DATI` in `app/js/dati.js`: è così che i profili nuovi entrano anche nei dispositivi già in uso, lasciando però intatte le schede confermate dal personale e le note interne.

La catena che porta dalle piramidi del fornitore ai profili del motore: com'è fatta e cosa resta stima sta in `docs/03-dati.md` e in `dati/README.md`. L'estrattore è l'unico pezzo in Python (serve `pymupdf` per leggere i PDF), gira offline e non c'entra con l'app.

`scripts/genera_questionario.js` rigenera il foglio di domande per il cliente (`docs/10-questionario-cliente.docx`). È l'unica cosa del progetto che vuole una libreria (`npm install docx`) e non ha niente a che fare con l'app: `app/` resta senza build e senza dipendenze.

## I tre percorsi del cliente

Schermata di attesa scura → **il bivio** → una delle tre strade.

**Rispondi a qualche domanda** (`docs/05-percorso.md`): otto domande fisse (per chi, genere, luogo, cosa non sopporti, occasione, intensità, stagione, carattere) → una domanda gioco a rotazione (colore, bevanda, materiale, momento del giorno, zodiaco) → una domanda facoltativa sul ricordo → tre codici con due o tre righe di motivazione.

**Parti dalle note** (`docs/12-ricerca-note.md`): nove gruppi di odori → il cassetto di un gruppo, con le note vere del catalogo, una riga che spiega ognuna e quante fragranze la contengono → i profumi trovati, a fasce (*hanno tutto quello che hai chiesto* / *ne hanno una su due*), ognuno con la sua piramide e le note cercate accese. Toccando una nota della piramide la si aggiunge alla ricerca. Un interruttore *"Non lo voglio"* trasforma ogni tocco in un veto.

**Raccontami cosa cerchi** (`docs/13-consulente.md`): un riquadro per la frase, il microfono (se il browser sa ascoltare) e gli spunti da toccare — *un posto, un sapore, un momento, com'è, per chi* — per chi non vuole né scrivere né parlare. Poi *"Ho capito: bosco d'inverno · fresco · niente dolce"* come chip che si tolgono e si rimettono con un tocco, e tre schede con il perché e la piramide accesa. Se il lessico non conosce una parola lo dice; se la frase è troppo vaga propone le domande.

Dettagli utili:

- **Ripartenza automatica**: 45 secondi sul bivio, 60 nel percorso a domande, 90 nei risultati, 120 nella ricerca per note e nel consulente a parole (che si leggono o si scrivono, quindi serve più tempo).
- **"Nessuno mi convince"** mostra la riserva, cioè il quarto classificato.
- **Tocco lungo su una scheda risultato** (per il personale): punteggio, componenti e accordi in comune.
- **Le chip in fondo ai risultati** riportano alla domanda corrispondente, così si cambia una risposta sola.
- Il motore propone **non più di una fragranza per sottofamiglia e due per famiglia**; se non trova abbastanza candidati allarga la ricerca e la schermata lo dice.

## Il backoffice

Tocco lungo di tre secondi sul logo nella schermata di attesa, poi codice numerico (al primo accesso lo si sceglie; se si dimentica, si azzera da *Backup*). Cinque schede: **Catalogo** (import dal gestionale, attivo/inattivo, referenze senza profilo in rosso), **Profili** (revisione, con le bozze incerte in cima), **Taratura** (pesi, coefficienti, *prova rapida* con risultati in tempo reale, soglie e prova della *ricerca per note*, pesi e prova del *consulente a parole* con le frasi tipiche, ripristino dei valori consigliati), **Statistiche** (anonime e aggregate, comprese le note più cercate, le scene più raccontate e da quale delle tre porte entra la clientela; le frasi dei clienti non si salvano mai), **Backup** (export/import e punti di ripristino).

**Per aggiornare il catalogo** basta il backup del gestionale: *Storico e backup → Scarica backup*, poi nel consulente *Catalogo → Import*, scegliendo il file o incollandone il contenuto. Il consulente ne tiene **solo** codice, categoria e stato — nome, brand, fornitori, costi e giacenze vengono scartati prima di qualsiasi salvataggio — e dopo l'import il motore lavora sulle sole referenze attive. Quelle disattivate o sparite dall'export restano in archivio con il loro profilo, pronte a tornare.

## Pubblicazione

`main` va su GitHub Pages con `.github/workflows/pages.yml` (sorgente: "GitHub Actions"). Il workflow copia `dati/*.json` dentro `app/dati/` prima di caricare l'artefatto, perché sul sito la radice è `app/`; in locale la stessa app legge `../dati/`, quindi non serve nessun passaggio di build.

Sull'iPad: aprire il sito in Safari, *Condividi → Aggiungi alla schermata Home*, poi Accesso Guidato per bloccare il tablet sull'app.

## Stato del lavoro

Fatte le fasi 0-3 di `docs/02-piano.md`: motore con le sue prove, percorso completo, risultati, backoffice, PWA, pubblicazione su Pages. Dal 18/09/2026 c'è anche il secondo percorso, la ricerca per note (`docs/12-ricerca-note.md`), con il suo motore puro e le sue prove. Dal 24/09/2026 il terzo, il consulente a parole (`docs/13-consulente.md`): lessico compilato, interprete e motore puri, prove sulle frasi tipiche e su frasi libere scritte alla cieca. Il service worker si registra e mette in cache guscio, configurazione e dati, quindi il chiosco regge anche senza rete.

Da fare: rileggere col personale il lessico del consulente a partire dalle scene più raccontate, e provare la voce sull'iPad vero (domande 15-17 di `docs/08-domande-cliente.md`). Poi **fase 4**, la prova in negozio — installare la PWA sull'iPad (*Condividi → Aggiungi alla schermata Home* + Accesso Guidato), leggere insieme al personale l'uscita di `prova_catalogo.mjs`, tarare i pesi dal backoffice e rivedere per prime le trentacinque bozze a confidenza bassa. Poi la **fase 5**: Firebase, con `store-firebase.js` al posto di `store-locale.js` e la stessa interfaccia.

Restano aperte le domande di `docs/08-domande-cliente.md`: l'MVP procede con le ipotesi indicate lì.

## Regole non negoziabili

1. Mai nomi commerciali nel codice, nei dati versionati, nell'interfaccia, nei log, nelle stampe: solo il codice a tre cifre.
2. Nessun collegamento runtime col gestionale: il catalogo entra per file.
3. Solo referenze attive entrano nel motore.
4. Nessun dato personale del cliente finale: le statistiche sono anonime e aggregate.
5. Il risultato è una proposta da provare, non una sentenza — e l'interfaccia lo dice.

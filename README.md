# Profumari · Consulente olfattivo

Demo: <https://alexpax85.github.io/profumari-consulente/>

Chiosco (iPad in negozio) e web app con cui la clientela de **i profumari** (Latina e Aprilia) arriva, in circa un minuto e senza saper nulla di profumeria, a **tre codici di fragranza da provare al banco**. Il percorso parte da preferenze olfattive e da domande "soft" (luoghi, colori, emozioni, stagioni, segno zodiacale, occasione, per sé o per un regalo) e le confronta con le **piramidi olfattive** del catalogo.

Progetto **indipendente** dal gestionale di magazzino (`profumari-gestionale`): repo, hosting e dati separati. L'unico legame è un export a senso unico del catalogo (codice, categoria, attivo). Nel chiosco **non compare mai il nome commerciale**: solo il codice a tre cifre.

## Com'è fatto

HTML, CSS e JavaScript puro con moduli ES, **senza build e senza dipendenze**: font e immagini stanno nella repo, si pubblica su qualsiasi hosting statico. PWA con service worker, così sull'iPad funziona anche senza rete. Dati nel browser del dispositivo (`localStorage`) con export/import JSON e punti di ripristino; la fase 2 sostituirà `store-locale.js` con Firestore senza toccare il resto.

```
app/                  la web app (è anche la radice del sito pubblicato)
  index.html          le quattro schermate: attesa, percorso, risultati, backoffice
  style.css           palette e componenti del gestionale + le schede grandi del chiosco
  js/motore.js        il motore di raccomandazione: puro, senza DOM, senza rete
  js/percorso.js      il percorso guidato · js/risultati.js  i tre codici
  js/backoffice.js    l'area del personale · js/store-locale.js  la persistenza
  js/dati.js          caricamento e ripulitura del catalogo importato
  js/icone.js         le icone a linea, disegnate a mano · js/ui.js  aiutanti DOM
  js/scenari.js       gli scenari tipici di taratura (usati anche dagli script)
  config/             accordi, domande, pesi, frasi, testi: si modificano dal backoffice
  fonts/ img/ sw.js manifest.json
dati/                 catalogo.json, profili.json e privato/ (mai versionato)
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
node scripts/valida_profili.mjs
```

Controlla che ogni profilo rispetti lo schema di `docs/09-schema-profilo.md` e che ogni referenza attiva abbia il suo profilo.

```bash
node scripts/prova_catalogo.mjs            # tutti gli scenari
node scripts/prova_catalogo.mjs mare       # solo quelli col nome indicato
```

Fa girare il motore sul catalogo vero per undici scenari tipici e stampa i tre codici con la motivazione: è lo strumento da leggere a occhio insieme al personale quando si tara.

```bash
node scripts/controlla_nomi.mjs
```

Guardia sulla regola numero uno: confronta ogni profilo con il nome del suo originale (letto da `dati/privato/nomi.json`, che resta fuori dalla repo) e cerca i nomi commerciali interi dentro `app/` e `dati/`. Senza il file privato si salta da solo.

## Il percorso del cliente

Schermata di attesa scura → otto domande fisse (per chi, genere, luogo, cosa non sopporti, occasione, intensità, stagione, carattere) → una domanda gioco a rotazione (colore, bevanda, materiale, momento del giorno, zodiaco) → una domanda facoltativa sul ricordo → tre codici con due o tre righe di motivazione e l'invito a provarli al banco.

Dettagli utili:

- **Ripartenza automatica**: 60 secondi di inattività nel percorso, 90 nei risultati, poi si torna all'attesa.
- **"Nessuno mi convince"** mostra la riserva, cioè il quarto classificato.
- **Tocco lungo su una scheda risultato** (per il personale): punteggio, componenti e accordi in comune.
- **Le chip in fondo ai risultati** riportano alla domanda corrispondente, così si cambia una risposta sola.
- Il motore propone **non più di una fragranza per sottofamiglia e due per famiglia**; se non trova abbastanza candidati allarga la ricerca e la schermata lo dice.

## Il backoffice

Tocco lungo di tre secondi sul logo nella schermata di attesa, poi codice numerico (al primo accesso lo si sceglie; se si dimentica, si azzera da *Backup*). Cinque schede: **Catalogo** (import dal gestionale, attivo/inattivo, referenze senza profilo in rosso), **Profili** (revisione, con le bozze incerte in cima), **Taratura** (pesi, coefficienti, *prova rapida* con risultati in tempo reale, ripristino dei valori consigliati), **Statistiche** (anonime e aggregate), **Backup** (export/import e punti di ripristino).

Dall'import si tengono **solo** codice, categoria e attivo: nome, brand, fornitori e costi vengono scartati prima di qualsiasi salvataggio.

## Pubblicazione

`main` va su GitHub Pages con `.github/workflows/pages.yml` (sorgente: "GitHub Actions"). Il workflow copia `dati/*.json` dentro `app/dati/` prima di caricare l'artefatto, perché sul sito la radice è `app/`; in locale la stessa app legge `../dati/`, quindi non serve nessun passaggio di build.

Sull'iPad: aprire il sito in Safari, *Condividi → Aggiungi alla schermata Home*, poi Accesso Guidato per bloccare il tablet sull'app.

## Stato del lavoro

Fatte le fasi 0-3 di `docs/02-piano.md`: motore con le sue prove, percorso completo, risultati, backoffice, PWA, pubblicazione su Pages. Il service worker si registra e mette in cache guscio, configurazione e dati (trenta file), quindi il chiosco regge anche senza rete.

Da fare: **fase 4**, la prova in negozio — installare la PWA sull'iPad (*Condividi → Aggiungi alla schermata Home* + Accesso Guidato), leggere insieme al personale l'uscita di `prova_catalogo.mjs`, tarare i pesi dal backoffice e rivedere per prime le trentacinque bozze a confidenza bassa. Poi la **fase 5**: Firebase, con `store-firebase.js` al posto di `store-locale.js` e la stessa interfaccia.

Restano aperte le domande di `docs/08-domande-cliente.md`: l'MVP procede con le ipotesi indicate lì.

## Regole non negoziabili

1. Mai nomi commerciali nel codice, nei dati versionati, nell'interfaccia, nei log, nelle stampe: solo il codice a tre cifre.
2. Nessun collegamento runtime col gestionale: il catalogo entra per file.
3. Solo referenze attive entrano nel motore.
4. Nessun dato personale del cliente finale: le statistiche sono anonime e aggregate.
5. Il risultato è una proposta da provare, non una sentenza — e l'interfaccia lo dice.

# 02 · Piano di lavoro

Stesso approccio del gestionale: prima una demo completa che gira sul dispositivo senza server, da far provare al cliente; poi la versione condivisa su Firebase. Le fasi sono in ordine di dipendenza; ogni fase lascia qualcosa di mostrabile.

## Fase 0 · Impianto (mezza giornata)

- `git init`, `.gitignore`, primo commit con questo kit.
- Scheletro `app/`: `index.html` con testata scura e logo, `style.css` che riparte dalle variabili del gestionale, `fonts/`, `manifest.json`, `sw.js`, `js/app.js` con il router delle schermate.
- Workflow GitHub Pages (`assets/pages.yml.esempio` → `.github/workflows/pages.yml`).
- Caricamento di `dati/catalogo.json` e `dati/profili.json` all'avvio (in seguito sostituiti dai dati importati nel backoffice).

**Verifica**: la pagina si apre su Pages e sull'iPad con la testata e la schermata di attesa.

## Fase 1 · Motore (1 giorno)

- `app/js/motore.js`: costruzione del profilo desiderato dalle risposte, punteggio, esclusioni, filtro di genere e categoria, diversità, spiegazioni. Vedi `04-motore.md`.
- `app/config/accordi.json` (tassonomia) e `app/config/domande.json` (domande, opzioni, pesi).
- `scripts/test_motore.mjs` con i casi di prova di `04-motore.md`.
- `scripts/valida_profili.mjs`: controlla che ogni profilo rispetti lo schema (chiavi ammesse, intervalli) e che ogni codice attivo del catalogo abbia un profilo.

**Verifica**: `node scripts/test_motore.mjs` e `node scripts/valida_profili.mjs` passano.

## Fase 2 · Percorso cliente (1-2 giorni)

- Schermata di attesa, sequenza di domande di `05-percorso.md`, barra di avanzamento, tasto indietro, ripartenza automatica dopo inattività.
- Schermata risultati: tre codici grandi, motivazione, famiglia, "chiedi al banco"; pulsante "Ricomincia"; eventuale biglietto stampabile o QR.
- Modalità chiosco: tutto schermo, niente zoom, niente selezione testo, tocco grande (≥ 60 px).

**Verifica**: percorso completo in meno di 90 secondi su iPad; tre codici sempre diversi per sottofamiglia; nessun nome commerciale visibile in nessuna schermata né nel sorgente pubblicato.

## Fase 3 · Backoffice del personale (1-2 giorni)

- Accesso con PIN locale (MVP), poi accessi Firebase.
- Import catalogo dal gestionale (JSON o incolla), stato attivo/inattivo, referenze senza profilo evidenziate.
- Scheda profilo modificabile: famiglia, note, accordi con cursori, intensità, stagioni, occasioni, carattere, descrizione, confidenza. Lista ordinata per confidenza crescente per la revisione.
- Taratura: modifica dei pesi delle domande, "prova rapida" che mostra i risultati per un insieme di risposte.
- Statistiche anonime: percorsi completati, codici proposti, domande abbandonate.
- Export e import completo dei dati (JSON) come backup.

**Verifica**: il personale modifica un profilo e la modifica cambia i risultati del percorso senza ricaricare.

## Fase 4 · Prova in negozio e taratura (una settimana di uso)

- iPad in Accesso Guidato con la PWA.
- Raccolta impressioni dei commessi: risultati sensati? domande capite? durata giusta?
- Aggiustamento pesi da backoffice; revisione profili a confidenza bassa.

## Fase 5 · Versione condivisa (dopo l'approvazione)

- Progetto Firebase dedicato (nome proposto: `profumari-consulente`), separato da `profumari-magazzino`.
- Firestore: collezioni `catalogo` (codice, categoria, attivo), `profili` (per codice), `config` (pesi, domande), `statistiche` (aggregati giornalieri, anonimi).
- Regole: lettura pubblica delle sole collezioni necessarie al chiosco (`catalogo`, `profili`, `config`) oppure, meglio, chiosco autenticato con un accesso "negozio"; scrittura solo per l'accesso "personale".
- Hosting Firebase da workflow su push del ramo `produzione`, come nel gestionale. `main` resta la demo su Pages.
- Store: sostituire `store-locale.js` con `store-firebase.js` mantenendo la stessa interfaccia.

Alternative gratuite valutabili se Firebase non convince: Supabase (Postgres, piano gratuito), Cloudflare Pages + KV/D1. Firebase resta la scelta consigliata perché il cliente e il flusso di lavoro lo conoscono già.

## Fase 6 · Idee successive (non nell'MVP)

- Domanda a testo libero ("descrivi la persona a cui lo regali") interpretata da un modello linguistico che restituisce pesi sugli accordi; il motore resta lo stesso.
- Versione da casa sul sito iprofumari.it (stesso codice, senza modalità chiosco).
- "Mi è piaciuto / non mi è piaciuto" al banco per apprendere dai risultati (richiede dati condivisi).
- Stampa del biglietto con i tre codici da una stampantina termica Bluetooth.

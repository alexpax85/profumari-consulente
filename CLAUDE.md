# Profumari · Consulente olfattivo — istruzioni per Claude

Leggi questo file e poi `docs/01-brief.md` … `docs/08-domande-cliente.md` prima di scrivere codice. Il progetto è nato il 16/09/2026 come seconda commessa dello stesso cliente del gestionale di magazzino (`~/Coding/Profumari gestionale`, repo `alexpax85/profumari-gestionale`): stesso stile di lavoro, stessa veste grafica, ma **codice, repo, hosting e dati completamente separati**.

## Regole non negoziabili

1. **Mai nomi commerciali o brand** nel codice, nei dati versionati, nell'interfaccia, nei log, nelle stampe. Solo il codice a tre cifre. La corrispondenza codice → originale sta solo in `dati/privato/` (in `.gitignore`) e serve unicamente alla compilazione offline dei profili.
2. **Nessun collegamento runtime col gestionale**: niente lettura del suo Firestore, niente import di suoi moduli. Il catalogo entra per file (export JSON o incolla) dal backoffice.
3. **Solo referenze attive** entrano nel motore. Le inattive restano in archivio con i loro profili, ma non vengono mai proposte.
4. **Nessun dato personale** del cliente finale viene chiesto o salvato. Le statistiche (facoltative) sono anonime e aggregate.
5. Il risultato è una **proposta da provare**, non una sentenza: il tono dell'interfaccia lo dice sempre.

## Stack e convenzioni (come nel gestionale)

- HTML, CSS e JavaScript puro con moduli ES, **senza build**, pubblicabile su qualsiasi hosting statico. Niente framework, niente CDN: librerie e font stanno in `app/lib` e `app/fonts`.
- PWA con `manifest.json` e service worker; funziona offline sull'iPad (modalità "Aggiungi alla schermata Home", Accesso Guidato di iOS per il chiosco).
- Lingua del codice, dei commenti, dei nomi di variabile e dell'interfaccia: **italiano**, come nel gestionale (`stato`, `fragranze`, `salva()`…).
- Il motore vive in `app/js/motore.js` (puro, senza DOM) e si testa con `node scripts/test_motore.mjs` usando `node:assert/strict`, nello stile di `scripts/test_store.mjs` del gestionale. Ogni modifica al motore o alle mappature va accompagnata da un test.
- Le mappature domanda → pesi e i pesi degli accordi stanno in **file di configurazione JSON** (`app/config/`), modificabili dal backoffice senza toccare il codice.
- Persistenza dell'MVP: `localStorage` con punti di ripristino ed export/import JSON (come `store.js` del gestionale), dietro un'interfaccia `Store` con `carica()`, `salva()`, `esporta()`, `importa()` così da sostituirla con Firestore nella fase 2 senza toccare l'interfaccia.
- Layout: `app/` (index.html, style.css, js/, config/, lib/, fonts/, sw.js, manifest.json), `scripts/` (test e utilità), `dati/` (catalogo, profili, `privato/` ignorato), `docs/`.
- Commit in italiano, brevi, all'imperativo o al participio come nel gestionale ("Motore: esclusioni con penalità forte"). `main` pubblicato su GitHub Pages dal workflow in `assets/pages.yml.esempio` (spostarlo in `.github/workflows/pages.yml`).

## Veste grafica

Segui `docs/07-stile.md`: palette nero `#121212`, bianco, verde petrolio `#018a86`, font Assistant (in `assets/fonts`), logo `assets/logo.svg` (bianco su fondo scuro), favicon `assets/favicon.svg`. `assets/style-magazzino.css` è il CSS del gestionale: riusane variabili, testata scura, pulsanti, badge e dialog; il percorso cliente ha però schermate a tutto schermo con schede grandi, non tabelle.

## Primo compito della nuova sessione

1. `git init`, `.gitignore` (già pronto in questa cartella), primo commit con il kit.
2. Creare `app/` con lo scheletro PWA (testata, font, manifest, service worker) riprendendo `assets/`.
3. Scrivere `app/js/motore.js` e `scripts/test_motore.mjs` seguendo `docs/04-motore.md`, con i casi di prova elencati lì, **prima** di qualsiasi schermata.
4. Caricare `dati/catalogo.json` e `dati/profili.json`, costruire il percorso di `docs/05-percorso.md` e la schermata dei risultati.
5. Backoffice di `docs/06-backoffice.md` (accesso con codice PIN locale nell'MVP).
6. Pubblicare su GitHub Pages e provare sull'iPad.

Quando è pronta la demo, aggiornare `README.md` con struttura e istruzioni, come nel gestionale.

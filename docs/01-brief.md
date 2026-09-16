# 01 · Brief

## Il cliente e il contesto

**I Profumari di Marini Giorgio** (iprofumari.it), profumeria di fragranze equivalenti con due negozi, a Latina e ad Aprilia. Il catalogo conta circa 340 referenze identificate da un **codice a tre cifre** e organizzate in quattro categorie di listino: UOMO (000-199), DONNA (200-499), NICCHIA (500-799), PREMIUM (800+). Ogni referenza è ispirata a un originale commerciale noto; in negozio il cliente vede e chiede il codice, mai il nome dell'originale, e così deve essere anche nel chiosco.

Al cliente è piaciuto molto il gestionale di magazzino sviluppato nel settembre 2026 (stessa persona, stesso stile di lavoro: niente costi fissi, web app senza build, iPad in negozio). Da lì nasce questa seconda commessa.

## Il problema da risolvere

Chi entra in negozio senza un'idea precisa, o deve fare un regalo, ha "l'ansia da foglio bianco": non sa da dove partire e il commesso deve fare venti domande. Il cliente vuole un **chiosco** che faccia quelle domande in modo piacevole e restituisca **tre candidati** da provare, così il commesso parte da una rosa ristretta invece che dal nulla.

Il cliente stesso sa che il percorso **non sarà mai deterministico né perfetto**: lo scopo è sbloccare la conversazione e far provare tre cose sensate, non indovinare il profumo giusto.

## Obiettivo

Un percorso guidato, con interfaccia semplice ed "engaging", usabile **in autonomia** dal cliente finale o con un leggero aiuto del personale, che:

1. raccoglie preferenze olfattive e non (luoghi, colori, emozioni, stagione, occasione, intensità, cosa non si sopporta, per sé o per regalo, segno zodiacale e altre domande gioco);
2. le trasforma in un profilo desiderato;
3. lo confronta con la **piramide olfattiva** di ogni referenza attiva del catalogo;
4. propone **tre codici** (con margine per una quarta riserva), diversi tra loro, ciascuno con una breve motivazione leggibile;
5. invita a farli provare al banco.

## Vincoli decisi dal cliente

- Progetto **esterno** e non collegato al gestionale in nessun modo, salvo il catalogo delle fragranze (scartando le inattive).
- Repo e web app **a sé stanti**.
- Nel chiosco **solo il codice della fragranza**, mai il nome commerciale.
- Matching basato sulle piramidi olfattive delle referenze.
- Interfaccia semplice, "engaging", per iPad; utilizzabile anche dal personale come supporto.

## Decisioni prese nella sessione di avvio (16/09/2026)

- **Cartella e repo separati**: `~/Coding/Profumari consulente`, repo `profumari-consulente`.
- **Stessa stack del gestionale**: HTML/CSS/JS senza build, PWA, pubblicazione gratuita (GitHub Pages per l'MVP, poi Firebase Hosting + Firestore come per il gestionale). Vedi `02-piano.md`.
- **MVP senza database**: dati nel browser del dispositivo (`localStorage` + export/import JSON), poi migrazione su Firebase o stack equivalente per gratuità e affidabilità.
- **Le piramidi non esistono nel gestionale**: sono state generate come **bozza** a partire dagli originali commerciali (file `dati/profili.json`, 336 codici). Vanno riviste dal personale nel backoffice, partendo da quelle marcate a confidenza bassa.
- **Backoffice per il personale**: import del catalogo dal gestionale, revisione di note e piramidi, taratura dei pesi, statistiche anonime. Vedi `06-backoffice.md`.
- **Veste grafica coerente col gestionale**: palette, logo, font. Vedi `07-stile.md`.
- **Motore deterministico** in JavaScript puro, offline, configurabile da JSON. Un modello linguistico non è necessario nell'MVP; può entrare in una fase successiva per domande a testo libero.

## Cosa NON è in perimetro

- Prezzi, giacenze, vendite, ordini: restano nel gestionale.
- Vendita online o carrello.
- Raccolta di dati personali (nome, email, telefono) del cliente finale.
- Sostituire il commesso: il chiosco prepara la conversazione, la prova al banco resta il momento decisivo.

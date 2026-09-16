# Dati del kit

- `catalogo.json` — 336 referenze (codice, categoria, attivo) dall'export di Latina del 14/09/2026. **Sostituire** con l'export ufficiale del gestionale appena disponibile: potrebbero esserci codici nuovi o disattivati.
- `profili.json` — bozze dei profili olfattivi, una per codice, generate il 16/09/2026 dalle piramidi degli originali commerciali seguendo `docs/09-schema-profilo.md`. Validate: campi, chiavi degli accordi, intervalli, nessun brand né nome commerciale nel testo.
- `privato/nomi.json` — corrispondenza codice → originale commerciale. **In `.gitignore`, non versionare, non importare nell'app.**

## Stato delle bozze

| Confidenza | Codici | Cosa fare |
|---|---|---|
| alta | 235 | usare così, rivedere a campione |
| media | 66 | rivedere quando capita |
| bassa | 35 | rivedere per primi nel backoffice |

Codici a confidenza bassa: 000, 060, 273, 313, 551, 552, 553, 586, 587, 590, 591, 595, 607, 608, 613, 614, 616, 807, 808, 811, 812, 817, 820, 821, 824, 825, 826, 829, 830, 831, 832, 833, 834, 835, 836. Sono per lo più brand di nicchia meno documentati (Morph, Kajal, Pantheon Roma, Lorenzo Pazzaglia, Giardini di Toscana, The Spirit of Dubai), i due "feromoni" e nomi storpiati nell'export.

Distribuzione delle famiglie nelle bozze: orientale 82, floreale 60, legnoso 33, gourmand 32, fruttato-floreale 30, acquatico 17, agrumato 16, ambrato 14, chypre 14, fougère 10, aromatico 9, cuoio 8, cipriato 6, verde 5. Genere: donna 141, unisex 116, uomo 79.

Controllo dei nomi: `node scripts/controlla_nomi.mjs` confronta ogni profilo con il nome del suo originale (letto da `privato/nomi.json`, che resta fuori dalla repo) e cerca i nomi interi in `app/` e `dati/`. Quattro descrizioni riprendono una parola del nome perché descrive davvero l'odore — "confetto", "gelato al pistacchio", "stile shabby", "cola" — e sono elencate come eccezioni dentro lo script: il personale può riformularle se preferisce. Le altre sono state riscritte il 16/09/2026 (codici 039, 270, 290, 500).

## Rigenerare o estendere le bozze

Per un codice nuovo: aggiungere la riga a `privato/nomi.json`, poi chiedere a Claude di produrre il profilo seguendo `docs/09-schema-profilo.md` e incollarlo in `profili.json` (o inserirlo dal backoffice). Il nome resta nel file privato.

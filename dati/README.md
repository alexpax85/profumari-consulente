# Dati del kit

- `catalogo.json` — 336 referenze (codice, categoria, attivo) dall'export di Latina del 14/09/2026. **Sostituire** con l'export ufficiale del gestionale appena disponibile: le card del fornitore contengono già sette codici che qui non ci sono (038, 041, 050, 204, 236, 240, 301).
- `piramidi.json` — le piramidi olfattive del fornitore, estratte dalle 339 card PDF il 17/09/2026 con `python3 scripts/estrai_piramidi.py`. Copia fedele della card: codice, categoria, famiglia e le tre file di note. Nessun nome commerciale (sta solo nei nomi dei file PDF, che restano fuori dalla repo).
- `profili.json` — i profili olfattivi usati dal motore, **generati** da `piramidi.json` con `node scripts/genera_profili.mjs --scrivi`. Schema in `docs/09-schema-profilo.md`.
- `privato/nomi.json` — corrispondenza codice → originale commerciale. **In `.gitignore`, non versionare, non importare nell'app.**

## Da dove viene ogni campo del profilo

| Campo | Da dove viene | Quanto fidarsi |
|---|---|---|
| `famiglia`, `sottofamiglia`, `testa`, `cuore`, `fondo` | dalla card del fornitore | è un dato, non una stima |
| `accordi` | calcolati dalle note con `app/config/note.json` | dipende dalla tabella: si corregge lì, e vale per tutti i profili insieme |
| `intensita`, `persistenza`, `dolcezza`, `freschezza`, `stagioni`, `momento`, `occasioni`, `carattere` | calcolati dagli accordi con le regole di `scripts/genera_profili.mjs` | **stima**: è la parte da rivedere al banco |
| `descrizione` | la piramide detta a parole | va bene per partire, si riscrive dal backoffice quando serve |
| `genere` | dal profilo precedente, o dalla categoria di listino | la card non lo dice |

## Stato al 17/09/2026

343 profili: 337 costruiti sulla card del fornitore (`confidenza: alta`), 6 senza card e quindi ancora ricostruiti — 067, 309, 314 (`media`) e 000, 586, 587 (`bassa`, i feromoni non hanno piramide). Sono i primi che il backoffice mette in cima.

Famiglie: orientale 98, legnoso 52, floreale 41, gourmand 36, fruttato-floreale 25, cuoio 22, ambrato 20, chypre 18, agrumato 11, aromatico 9, fougère 7, acquatico 4. Genere: donna 145, unisex 116, uomo 82. Sottofamiglie diverse: 58 (sono le combinazioni scritte sulle card, e il motore le usa per non proporre tre fragranze della stessa idea).

Medie degli attributi stimati: intensità 3.4, persistenza 3.8, dolcezza 3.0, freschezza 2.4 — un catalogo sbilanciato sull'orientale, come dicono le card.

## Rigenerare

```
python3 scripts/estrai_piramidi.py          # card PDF -> dati/piramidi.json  (serve pymupdf)
node scripts/genera_profili.mjs             # prova a vuoto: stampa il riepilogo
node scripts/genera_profili.mjs --scrivi    # scrive dati/profili.json
node scripts/test_genera_profili.mjs        # prove della mappatura
node scripts/valida_profili.mjs             # schema e incroci con il catalogo
node scripts/controlla_nomi.mjs             # nessun nome commerciale nei dati versionati
```

Attenzione: rigenerare **sovrascrive** le correzioni fatte dal backoffice, tranne `noteStaff` e il genere, che vengono riportati dal profilo precedente. Prima di rigenerare, esportare il backup dal backoffice.

Dopo aver rigenerato, **alzare di uno `VERSIONE_DATI` in `app/js/dati.js`**: è il segnale con cui il chiosco capisce che la base è cambiata e sostituisce i profili che ha sul dispositivo (tenendo le schede che il personale ha confermato con "Confermato" e le note interne, e facendo prima un punto di ripristino). Senza quel numero, un iPad già in uso continuerebbe a proporre i profili vecchi. Il catalogo invece non viene mai toccato: quello lo decide il negozio con l'import dal gestionale.

Per un codice nuovo: aggiungere la card PDF alla cartella delle piramidi e rilanciare l'estrazione; se la card non c'è, aggiungere la riga a `privato/nomi.json` e scrivere il profilo dal backoffice seguendo `docs/09-schema-profilo.md`.

Controllo dei nomi: `node scripts/controlla_nomi.mjs` confronta ogni profilo con il nome del suo originale (letto da `privato/nomi.json`) e cerca i nomi interi in `app/` e `dati/`. Cinque parole sono ammesse perché descrivono davvero l'odore — "confetto", "gelato", "shabby", "cola", "tiarè" — ed è scritto nello script.

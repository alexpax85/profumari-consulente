# Profumari · Consulente olfattivo

Chiosco (iPad in negozio) e web app con cui la clientela de **i profumari** (Latina e Aprilia) arriva, in circa un minuto e senza saper nulla di profumeria, a **tre codici di fragranza da provare al banco**. Il percorso parte da preferenze olfattive e da domande "soft" (luoghi, colori, emozioni, stagioni, segno zodiacale, occasione, per sé o per un regalo) e le confronta con le **piramidi olfattive** del catalogo.

Progetto **indipendente** dal gestionale di magazzino (`profumari-gestionale`): repo, hosting e dati separati. L'unico legame è un export a senso unico del catalogo (codice, categoria, attivo). Nel chiosco **non compare mai il nome commerciale**: solo il codice a tre cifre.

## Questo kit di avvio

Questa cartella è il punto di partenza della nuova sessione di lavoro. Contiene le decisioni prese, i dati già preparati e gli asset grafici; non contiene ancora codice applicativo.

| Cosa | Dove |
|---|---|
| Istruzioni operative per Claude (stack, regole, comandi, primo compito) | `CLAUDE.md` |
| Contesto, obiettivo, vincoli, decisioni | `docs/01-brief.md` |
| Piano di lavoro a fasi: MVP senza database → Firebase | `docs/02-piano.md` |
| Dati: catalogo, profili olfattivi, tassonomia, export dal gestionale, privacy dei nomi | `docs/03-dati.md` |
| Motore di raccomandazione: vettori, punteggio, esclusioni, diversità, spiegazioni, test | `docs/04-motore.md` |
| Percorso guidato: schermate, domande, opzioni e pesi | `docs/05-percorso.md` |
| Backoffice del personale: import, revisione profili, taratura, statistiche | `docs/06-backoffice.md` |
| Linee guida grafiche, coerenti col gestionale | `docs/07-stile.md` |
| Domande aperte per il cliente | `docs/08-domande-cliente.md` |
| Logo, favicon, font Assistant, CSS del gestionale come riferimento, workflow Pages | `assets/` |
| Catalogo (codice, categoria, attivo) e bozze dei profili olfattivi per codice | `dati/catalogo.json`, `dati/profili.json` |
| Corrispondenza codice → originale commerciale (**mai in repo**) | `dati/privato/nomi.json` |

Ordine di lettura consigliato per la nuova sessione: `CLAUDE.md`, poi i documenti in `docs/` nell'ordine numerico.

## Avvio locale (quando esisterà `app/`)

```bash
python3 -m http.server 8766
```

poi <http://localhost:8766/app/index.html>. Nessuna dipendenza esterna: font e librerie sono nella repo.

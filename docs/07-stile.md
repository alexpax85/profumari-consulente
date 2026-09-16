# 07 · Veste grafica

Il chiosco deve sembrare "della stessa famiglia" del gestionale e del sito iprofumari.it: nero, bianco, verde petrolio, tipografia Assistant leggera, molto spazio bianco, nessun ornamento gratuito. Il CSS del gestionale è in `assets/style-magazzino.css`: riprendere le variabili e i componenti, non copiarlo per intero (le tabelle e le KPI servono solo al backoffice).

## Palette (dal gestionale)

| Variabile | Valore | Uso |
|---|---|---|
| `--nero` | `#121212` | testata, schermata di attesa, testo |
| `--bg` / `--bg2` | `#ffffff` / `#f6f6f6` | sfondi |
| `--ink` / `--ink2` / `--muted` | `#121212` / `rgba(18,18,18,.72)` / `rgba(18,18,18,.55)` | testo e testo secondario |
| `--line` / `--line2` | `rgba(18,18,18,.12)` / `rgba(18,18,18,.06)` | bordi |
| `--teal` / `--teal-scuro` / `--teal-bg` | `#018a86` / `#016b68` / `#e6f3f2` | accento: selezioni, codici, barra di avanzamento, pulsante primario |
| `--warn` / `--bad` | `#b7791f` / `#b3261e` | solo backoffice (avvisi, referenze senza profilo) |
| `--radius` / `--tap` | `6px` / `46px` | raggio e altezza minima dei tocchi nel backoffice |

Nel percorso cliente la tocco minima sale a **60 px** e le schede opzione hanno raggio 10 px: è un'interfaccia a tutto schermo da usare in piedi, con il dito.

Aggiunte proposte per il percorso (da dichiarare come variabili accanto a quelle esistenti):

- `--teal-luce: #5fc3bf` per l'accento su fondo nero (attesa, risultati in modalità scura).
- Una famiglia di tinte tenui per le icone delle opzioni, tutte desaturate per non litigare col petrolio: sabbia `#e9e2d3`, salvia `#dfe8e1`, cipria `#efe1e3`, notte `#2a2f3a`. Usate solo come sfondo delle icone, mai per testo.

## Tipografia

- Font **Assistant** (300-700) da `assets/fonts` (copiare in `app/fonts` con il suo `assistant.css`). Fallback di sistema come nel gestionale.
- Titoli in peso 300 con spaziatura ampia e maiuscolo per le etichette di sezione (come `header.top h1`: `.95rem`, `letter-spacing: .28em`, uppercase).
- Domande del percorso: peso 300, 2-2.4 rem su iPad, allineate a sinistra, max 18 parole.
- **Codice della fragranza** nel risultato: peso 700, 4-5 rem, colore `--teal-scuro` su bianco (o `--teal-luce` su nero), `font-variant-numeric: tabular-nums`.
- Corpo 1.05-1.15 rem, interlinea 1.45.

## Logo e icona

- `assets/logo.svg`: scritta "i profumari" bianca con la foglia in petrolio; va **sempre su fondo scuro** (testata, attesa). Altezza 34 px nella testata, 56-72 px nella schermata di attesa.
- `assets/favicon.svg`: quadrato nero con angoli arrotondati e foglia; usarlo come icona PWA e `apple-touch-icon`.
- `manifest.json`: `name` "Profumari Consulente", `short_name` "Consulente", `theme_color` `#121212`, `background_color` `#121212` (l'attesa è scura), `display` `standalone`, `orientation` libera (l'iPad può stare in verticale o orizzontale sul supporto).

## Componenti riusati dal gestionale

- `header.top` con logo, separatore verticale e titolo in maiuscolo spaziato ("Consulente"). Nel percorso cliente la testata è più sottile e senza dati utente; nel backoffice identica al gestionale.
- `button` e `button.primario` (petrolio, testo bianco, maiuscolo spaziato). Nel percorso: pulsante primario più alto (60 px) e a larghezza piena su schermi stretti.
- `.card` con sottolineatura petrolio sotto l'`h2` per il backoffice.
- `nav.tabs` a sottolineatura per le schede del backoffice.
- `dialog` con bordo superiore petrolio e `#toast` per le conferme.
- `.badge` (`ok`, `sotto`, `esaurito`, `neutro`, `grigio`) per confidenza e stato nel backoffice: alta = `ok`, media = `sotto`, bassa = `esaurito`, inattivo = `grigio`.

## Componenti nuovi del percorso

- **Scheda opzione**: rettangolo bianco con bordo `--line`, icona in cerchio tinta tenue, etichetta in peso 600, riga secondaria in `--muted`. Selezionata: bordo 2 px petrolio, sfondo `--teal-bg`, spunta in alto a destra. Griglia a 2 colonne in verticale, 3 in orizzontale, mai più di 10 schede per schermata.
- **Barra di avanzamento**: linea sottile petrolio in alto, sotto la testata, con etichetta "3 di 8" in `--muted`.
- **Scala a tacche** (intensità): cinque cerchi collegati, etichetta sotto quello attivo.
- **Chip** per le scelte multiple già fatte (riassunto nella schermata risultati, tocco per tornare alla domanda).
- **Scheda risultato**: sfondo bianco, codice enorme in alto, famiglia in maiuscolo spaziato, due-tre righe di motivazione con la parola chiave in grassetto, descrizione in corsivo leggero. Le tre schede affiancate in orizzontale, impilate in verticale.
- **Schermata di attesa**: fondo `--nero` con il gradiente radiale petrolio già usato in `#accesso` del gestionale, logo, invito, animazione lenta "respiro" (`@keyframes respiro`, rispettando `prefers-reduced-motion`).

## Immagini e icone

Nessuna fotografia di prodotto e nessuna immagine con marchi. Icone semplici a linea, monocrome, in SVG inline (una per opzione: onda, albero, luna e palazzi, croissant, fiore, spezie, palma, baita, limone, libro, ecc.). Se si vogliono illustrazioni più ricche, restare su tratti sottili e due colori (nero e petrolio) per non tradire il tono del marchio.

## Modalità chiosco

- `meta viewport` con `user-scalable=no`, `-webkit-user-select: none`, `touch-action: manipulation`, niente menu contestuali (`-webkit-touch-callout: none`).
- Tutto schermo via PWA ("Aggiungi alla schermata Home") e Accesso Guidato di iOS per bloccare l'iPad sull'app.
- Nessun campo di testo nel percorso cliente: la tastiera non deve mai comparire.
- Contrasto AA su tutti i testi; il petrolio `#018a86` su bianco va usato solo per testi ≥ 18 px o in grassetto (contrasto 4,3:1); per testi piccoli usare `--teal-scuro`.
- Rispettare `prefers-reduced-motion`.

## Tono dei testi

Seconda persona singolare, frasi brevi, verbi concreti, niente esclamativi in serie, niente termini tecnici senza spiegazione ("chypre: fresco e terroso insieme"). Il risultato si presenta come un invito a provare, non come un verdetto: "Tre profumi che potrebbero piacerti. Chiedi al banco di fartele sentire."

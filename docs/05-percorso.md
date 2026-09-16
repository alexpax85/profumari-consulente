# 05 · Percorso guidato

Otto schermate fisse più una o due "domande gioco" a rotazione. Solo tocco, niente tastiera, schede grandi con icona e testo breve, barra di avanzamento in alto, tasto "Indietro" sempre visibile, durata obiettivo 60-90 secondi. Il tono è quello di un commesso gentile che chiede, non di un questionario.

Ogni opzione qui sotto elenca i contributi che finiscono in `app/config/domande.json`. I numeri sono il punto di partenza per la taratura, non verità definitive. Notazione: `accordo +0.8` è un contributo agli accordi desiderati; `attr: freschezza 5` è un attributo; `escludi: gourmand 1` è un'esclusione.

## 0 · Attesa

Schermo scuro con logo, animazione lenta, "Tocca per trovare il tuo profumo". Ripartenza automatica dopo 60 secondi di inattività in qualsiasi punto del percorso. Tocco lungo sul logo (3 s) apre il backoffice con PIN.

## 1 · Per chi è? (`per_chi`, filtro, peso 1)

- **Per me** → nessun contributo; abilita le domande in prima persona.
- **Per un regalo** → abilita la variante "regalo" delle domande (frasi al "lui/lei"), e aggiunge la domanda 1b.

### 1b · Chi è? (`destinatario`, solo regalo, peso 0.4)

- Partner → `carattere: sensuale, romantico`, `occasioni: serata, romantico`
- Genitore → `carattere: elegante, calmo`, `cipriato +0.3`, `legnoso +0.3`
- Amico/amica → `carattere: allegro, fresco`, `agrumato +0.3`
- Collega → `carattere: elegante, sicuro`, `occasioni: ufficio`, `attr: intensita 2`
- Un ragazzo/una ragazza giovane → `fruttato +0.3`, `muschiato +0.3`, `attr: dolcezza 4`

## 2 · Per chi lo indosserà (`genere`, filtro, peso 1)

- **Lui** → filtro `uomo` + `unisex`
- **Lei** → filtro `donna` + `unisex`
- **Senza vincoli** → nessun filtro (tiene tutto, anche i profili di genere "opposto")

Nota: il filtro guarda il campo `genere` del profilo, non la categoria di listino.

## 3 · Dove vorresti essere adesso? (`luogo`, singola o multipla max 2, peso 1.0: è la domanda che conta di più)

| Opzione | Accordi | Attributi |
|---|---|---|
| In riva al mare | acquatico +1, agrumato +0.6, solare +0.4 | freschezza 5, intensita 2 |
| In un bosco dopo la pioggia | verde +0.8, legnoso +0.8, patchouli +0.4, aromatico +0.3 | freschezza 3, dolcezza 1 |
| In una città di notte | ambrato +0.6, legnoso +0.5, speziato +0.5, incenso +0.3, cuoio +0.3 | intensita 4, momento sera |
| In una pasticceria | gourmand +1, vaniglia +0.8, fruttato +0.3 | dolcezza 5 |
| In un giardino in fiore | floreale-fresco +0.8, rosa +0.6, floreale-bianco +0.6, verde +0.3 | freschezza 4 |
| In un mercato delle spezie | speziato +1, ambrato +0.5, oud +0.3, incenso +0.3 | intensita 4 |
| Su una spiaggia tropicale | solare +1, fruttato +0.5, vaniglia +0.3 | dolcezza 4, stagione estate |
| In una baita in montagna | legnoso +0.8, incenso +0.5, boozy +0.3, tabacco +0.3 | stagione inverno |
| In un agrumeto al sole | agrumato +1, verde +0.4, aromatico +0.3 | freschezza 5 |
| In una biblioteca antica | cuoio +0.6, tabacco +0.5, legnoso +0.5, cipriato +0.3 | intensita 3, carattere misterioso |

## 4 · Cosa proprio non sopporti? (`esclusioni`, multipla max 3, peso 1, contributi negativi)

- Troppo dolce → `escludi: gourmand 1, vaniglia 0.7, miele 0.6`
- Troppo fresco/da doccia → `escludi: acquatico 0.8, muschiato 0.5`
- Troppo forte → `attr: intensita 2` + penalità per `intensita ≥ 4` (gestita come esclusione su attributo)
- Troppo "da signora" / troppo cipriato → `escludi: cipriato 1, floreale-bianco 0.4`
- Fiori → `escludi: rosa 0.9, floreale-bianco 0.9, floreale-fresco 0.9`
- Fumo e incenso → `escludi: incenso 1, tabacco 0.7, oud 0.5`
- Legno e terra → `escludi: legnoso 0.8, patchouli 0.9, oud 0.6`
- Niente, sono curioso → nessuna esclusione

## 5 · Quando lo userai? (`occasione`, multipla max 2, peso 0.7)

- Tutti i giorni → `occasioni: quotidiano`, `attr: intensita 3`
- Al lavoro → `occasioni: ufficio`, `attr: intensita 2`, `muschiato +0.3`, `agrumato +0.2`
- La sera fuori → `occasioni: serata`, `momento: sera`, `attr: intensita 4`, `ambrato +0.3`
- Per lo sport → `occasioni: sport`, `acquatico +0.4`, `agrumato +0.4`, `attr: freschezza 5`
- In un'occasione speciale → `occasioni: speciale`, `attr: persistenza 5`, `oud +0.2`, `ambrato +0.2`
- Per un appuntamento → `occasioni: romantico`, `carattere: sensuale`, `vaniglia +0.3`, `muschiato +0.3`

## 6 · Quanto deve farsi sentire? (`intensita`, scala visiva 1-5, peso 0.8)

Cinque tacche con etichette: "Una carezza sulla pelle" (1) … "Si sente entrando nella stanza" (5). Contributo: `attr: intensita = valore`, `attr: persistenza = valore` (arrotondato).

## 7 · In che stagione siamo nella tua testa? (`stagione`, singola, peso 0.6)

- Primavera → `stagioni: primavera`, `floreale-fresco +0.3`, `verde +0.3`
- Estate → `stagioni: estate`, `agrumato +0.3`, `acquatico +0.3`, `attr: freschezza 4`
- Autunno → `stagioni: autunno`, `legnoso +0.3`, `speziato +0.3`
- Inverno → `stagioni: inverno`, `ambrato +0.3`, `vaniglia +0.3`, `attr: intensita 4`
- Tutto l'anno → `stagioni: tutte 0.5` (nessun bonus di stagione, attributi neutri)

## 8 · Come vuoi sentirti? (`carattere`, multipla max 2, peso 0.7)

| Opzione | Carattere | Accordi |
|---|---|---|
| Pieno di energia | energico, fresco | agrumato +0.4, aromatico +0.3 |
| Calmo e a mio agio | calmo | muschiato +0.4, tè +0.3, cipriato +0.2 |
| Sensuale | sensuale | vaniglia +0.3, ambrato +0.3, muschiato +0.2 |
| Elegante | elegante | cipriato +0.3, legnoso +0.3, rosa +0.2 |
| Audace | audace | oud +0.3, speziato +0.4, cuoio +0.3 |
| Coccolato | coccola | gourmand +0.4, vaniglia +0.4 |
| Misterioso | misterioso | incenso +0.4, oud +0.3, patchouli +0.2 |
| Allegro | allegro | fruttato +0.4, solare +0.3 |
| Romantico | romantico | rosa +0.4, floreale-bianco +0.3 |

## 9 · Domanda gioco (una a rotazione, peso 0.35)

Serve a rendere il percorso leggero e a rompere i pareggi, non a decidere. Il backoffice può attivarne o disattivarne ciascuna.

**Colore preferito** (`colore`)
- Blu → acquatico +0.5, agrumato +0.3 · Rosso → speziato +0.5, ambrato +0.4 · Verde → verde +0.5, aromatico +0.3 · Nero → oud +0.4, cuoio +0.4, incenso +0.3 · Rosa → rosa +0.4, fruttato +0.3 · Giallo → agrumato +0.5, solare +0.3 · Viola → cipriato +0.4, floreale-bianco +0.3 · Bianco → muschiato +0.5, floreale-fresco +0.3 · Oro → ambrato +0.4, vaniglia +0.3 · Marrone → legnoso +0.4, tabacco +0.3

**Bevanda** (`bevanda`)
- Caffè → gourmand +0.4, legnoso +0.3 · Tè → tè +0.5, verde +0.3 · Cocktail al tramonto → fruttato +0.4, solare +0.3, boozy +0.2 · Vino rosso → boozy +0.4, ambrato +0.3, speziato +0.2 · Limonata → agrumato +0.6 · Cioccolata calda → gourmand +0.5, vaniglia +0.4

**Materiale** (`materiale`)
- Lino → muschiato +0.4, agrumato +0.3 · Cuoio → cuoio +0.6 · Seta → cipriato +0.3, rosa +0.3, muschiato +0.2 · Lana → legnoso +0.3, ambrato +0.3 · Velluto → vaniglia +0.3, oud +0.3, ambrato +0.3 · Legno grezzo → legnoso +0.6

**Segno zodiacale** (`zodiaco`, mappato sull'elemento; dodici schede, quattro contributi)
- Fuoco (Ariete, Leone, Sagittario) → speziato +0.4, ambrato +0.3, carattere audace
- Terra (Toro, Vergine, Capricorno) → legnoso +0.4, verde +0.3, patchouli +0.2, carattere calmo
- Aria (Gemelli, Bilancia, Acquario) → agrumato +0.4, aromatico +0.3, floreale-fresco +0.2, carattere allegro
- Acqua (Cancro, Scorpione, Pesci) → acquatico +0.3, floreale-bianco +0.3, muschiato +0.3, carattere sensuale

**Momento della giornata preferito** (`momento`)
- Alba → agrumato +0.4, verde +0.3, momento giorno · Pomeriggio al sole → solare +0.4, fruttato +0.3 · Tramonto → ambrato +0.4, rosa +0.2 · Notte fonda → oud +0.3, incenso +0.3, momento sera

## 10 · Facoltativa · Un profumo che hai amato (`ricordo`, singola, peso 0.6, si può saltare)

Non per nome: per famiglia illustrata, con una riga di esempio senza marchi. "Fresco e pulito come un bucato steso", "Fiori appena colti", "Dolce come un dessert", "Legno e spezie calde", "Fumo, cuoio, notte", "Agrumi e sole", "Cipria e rossetto". Ogni scheda somma gli accordi della famiglia corrispondente (+0.8 sul principale, +0.3 sui vicini).

## 11 · Risultati

- Titolo: "Tre profumi da provare" (o "Tre idee per il tuo regalo").
- Tre schede grandi: **codice** in evidenza (tipografia grande, colore petrolio), famiglia in parole semplici, due o tre righe di motivazione, descrizione.
- Sotto: "Chiedi al banco di fartele provare: dì i codici o mostra questo schermo." Pulsanti: "Ricomincia", "Nessuno mi convince" (mostra la riserva e propone di rifare la domanda 3 con altre scelte), eventuale "Stampa biglietto"/QR.
- Tocco lungo su una scheda (personale): mostra punteggio, accordi coincidenti e riserva.
- Dopo 90 secondi senza tocco torna all'attesa.

## Testi

Tutti i testi delle schermate stanno in `app/config/testi.json` (versione "per me" e versione "regalo"), così il cliente può cambiarli dal backoffice. Tono: seconda persona, frasi corte, niente punti esclamativi a raffica, niente gergo tecnico senza spiegazione.

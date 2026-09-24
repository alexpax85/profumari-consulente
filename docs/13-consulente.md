# 13 · Il consulente a parole — il terzo percorso

> Deciso il 24/09/2026: accanto alle domande e alle note, il chiosco ha una terza porta. Il cliente **racconta** cosa cerca — *"un profumo fresco, che mi ricordi un bosco d'inverno"*, *"qualcosa che sappia di caffè e cioccolato"*, *"per un primo appuntamento d'estate"* — scrivendo, a voce o toccando degli spunti, e riceve tre codici con il perché scritto sulla piramide.
>
> Il principio: **l'intelligenza si costruisce fuori, sul dispositivo gira solo il risultato.** Nessun modello linguistico sull'iPad, nessuna rete, nessun costo per consulto. Il "cervello" è un lessico di scene scritto in grande con l'aiuto di Claude, controllato contro il catalogo vero e rivisto dalle persone; sul chiosco lo legge un interprete di poche centinaia di righe, deterministico e provato.

Regole di sempre, che valgono anche qui: **solo referenze attive**, **mai un nome commerciale** (solo il codice a tre cifre), **nessun dato del cliente salvato** (la frase non si salva mai, nemmeno nelle statistiche), il risultato è **una proposta da provare**.

## 1. Perché non un modello linguistico sul chiosco

| | Lessico compilato (scelto) | Modello generativo sull'iPad | Modello in cloud |
|---|---|---|---|
| Peso | ~400 KB di JSON, in cache | 0,5–2 GB | niente |
| Offline | sì | sì | no |
| Costo per consulto | zero | zero | a consumo |
| Note inventate | impossibile: il controllo rifiuta ogni nota che non è in una piramide | possibile ("note di pino": il pino non c'è) | possibile |
| Nomi commerciali | impossibile: sceglie il motore, sui codici | il modello conosce gli originali | idem |
| Stessa frase, stessi codici | sì | no | no |
| Si prova con `node:assert` | sì | no | no |

Il prezzo del lessico è che capisce solo quello che qualcuno ha previsto. Per questo è **grande** (oltre ottocento scene, migliaia di forme) e per questo le frasi che non capisce si dicono al cliente invece di tirare a indovinare.

## 2. Come funziona

```
"fresco, come un bosco d'inverno, niente di dolce"
    │
    ▼  interpreta.js  (lessico.json)
scene capite:  fresco (sensazione) · bosco d'inverno (luogo) · dolce (rifiutato)
desiderio:     accordi { legnoso, verde, aromatico, agrumato… }
               note    { abete, cipresso, bacche di ginepro, muschio di quercia, vetiver }
               misure  { freschezza 4,5 }   stagioni { inverno }
               veti    { gourmand, vaniglia, dolcezza alta }
    │
    ▼  consulente.js  (stesso motore, più le note)
tre codici diversi fra loro + riserva
"Per il bosco d'inverno: abete in testa, vetiver sul fondo."
```

### 2.1 Il lessico · `app/config/lessico.json`

Una **scena** è una cosa che un cliente racconta — un luogo, un ambiente, un cibo, una bevanda, una situazione, una persona, un momento, una stagione, il tempo che fa, un colore, uno stato d'animo, una sensazione, un materiale, un viaggio, un ricordo — con i modi in cui la si dice e quello che vuol dire in profumeria:

```json
{ "chiave": "bosco-inverno", "tipo": "luogo",
  "forme": ["bosco d'inverno", "bosco innevato", "foresta innevata", "bosco con la neve"],
  "evoca": "il bosco d'inverno",
  "accordi": { "legnoso": 0.9, "verde": 0.6, "aromatico": 0.4, "incenso": 0.2 },
  "note": { "abete": 1, "cipresso": 0.8, "bacche di ginepro": 0.7, "muschio di quercia": 0.6 },
  "misure": { "freschezza": 4, "dolcezza": 1 },
  "stagioni": { "inverno": 0.8 },
  "manca": ["pino"] }
```

- `note` usa **solo** nomi che esistono in qualche piramide, scritti come sulla card.
- `manca` dice onestamente cosa il catalogo non ha: il cliente legge *"In catalogo non c'è pino: ti propongo quello che ci va più vicino."*
- `evoca` è come la motivazione nomina la scena: *"Per {evoca}: …"*.
- `filtro` (solo le persone: *per mio marito*, *per la mamma*) e `modo: "regalo"`.

Oltre alle scene, l'interprete riconosce da solo **ogni nota del catalogo di oggi** (con i sinonimi di `ricerca.json`) e **ogni famiglia** della tassonomia (*agrumi*, *legni*, *cuoio*). A parità di parole vince la scena, poi la nota, poi la famiglia: *"gelato alla vaniglia"* è un dolce, non la nota nuda.

### 2.2 Come si scrive · `dati/lessico/*.json` → `scripts/costruisci_lessico.mjs`

Il lessico **non si modifica a mano** nel file dell'app. Le scene stanno in `dati/lessico/`, un file per argomento, e si compilano:

```bash
node scripts/costruisci_lessico.mjs                         # controlla tutto e scrive app/config/lessico.json
node scripts/costruisci_lessico.mjs --controlla FILE.json   # controlla un file solo
```

Il compilatore rifiuta: note che non sono in nessuna piramide, accordi che non esistono, valori fuori scala, chiavi doppie, **la stessa forma in due scene**. Un errore ferma la scrittura: sul chiosco non arriva mai una scena che promette una nota che non c'è.

La prima versione (24/09/2026) è stata scritta da otto generatori in parallelo, uno per argomento (luoghi naturali, ambienti, cibi, bevande, situazioni e persone, momenti e colori, sensazioni e materiali, viaggi e ricordi), con il vocabolario vero del catalogo davanti e il compilatore come arbitro. **Va riletta dal personale**: è lì che si correggono gli accostamenti da profumiere e si aggiungono i modi di dire dei clienti veri.

### 2.3 La grammatica · `dati/lessico/_grammatica.json`

Poche regole, tutte nel file:

- **Parole vuote** (articoli, preposizioni, "profumo", "vorrei", "che sa di"): non contano. *"bosco d'inverno"* = *"un bosco in inverno"*.
- **Radice**: singolare e plurale, maschile e femminile cadono insieme (*bosco/boschi*, *fresca/freschi*). Le parole in cui il genere conta — *ragazzo/ragazza*, *nonno/nonna* — stanno in `intere` e non si accorciano, perché accendono filtri diversi.
- **La forma più lunga vince**: *"bosco d'inverno"* è una scena, non *bosco* + *inverno*. La virgola spezza.
- **Negazioni** (*non, niente, senza, odio, evito…*): dal "non" fino alla virgola, al "ma", o alla prossima parola che riapre il desiderio (*"niente fiori, vorrei legni"*). Anche dopo: *"il dolce no"*.
- **Attenuazioni**: *"non troppo dolce"* non è un veto — la dolcezza scende a metà e la famiglia pesa un po' contro.
- **Poco / molto**: *"un filo di vaniglia"*, *"molto fresco"* cambiano il peso della scena.
- **Chi chiede per nome vince su un veto più largo**: *"vaniglia, ma niente di dolce"* tiene la vaniglia e toglie lo zucchero.
- **Una lettera sbagliata** si corregge (*vanigla*), se il candidato è uno solo.

### 2.4 Il punteggio · `consulente.js`

La media, sulle sole parti che la frase ha toccato, di:

| Parte | Peso | Cosa misura |
|---|---|---|
| accordi | 0,42 | somiglianza (coseno) fra gli accordi chiesti e quelli della fragranza |
| note | 0,33 | le note chieste trovate in piramide (fondo e cuore 1, testa 0,85); una nota assente vale 0,4 × la forza della sua famiglia |
| misure | 0,12 | intensità, persistenza, dolcezza, freschezza |
| contesto | 0,08 | stagione, momento, occasione |
| carattere | 0,05 | sensuale, elegante, calmo… |

Meno i veti colpiti (un veto a 0,5 o più toglie la fragranza), meno una piccola penalità per le schede a confidenza bassa. Poi la stessa diversità del percorso guidato: al massimo una per sottofamiglia, due per famiglia. I pesi stanno in `app/config/consulente.json` e si tarano dal backoffice.

### 2.5 Il perché

Due o tre frasi, legate a quello che il cliente ha detto e a quello che c'è nella piramide:

> *Per il bosco d'inverno: abete in testa, vetiver sul fondo.*
> *Cuoio sul fondo, come chiedevi.*
> *Fresco, come cercavi.*

Mai un numero, mai un punteggio. Sulla scheda la piramide si accende come nella ricerca per note: in pieno le note chieste, più tenui quelle della famiglia giusta.

## 3. Le schermate

- **Il bivio** ha tre porte: *Rispondi a qualche domanda*, *Parti dalle note che ti piacciono*, *Raccontami cosa cerchi*.
- **Il racconto** (`#racconto`): un riquadro grande per la frase; il **microfono**, se il browser sa ascoltare (Safari su iPad lo sa: il testo compare mentre si parla, e si corregge con la tastiera); e gli **spunti da toccare** — *un posto, un sapore, un momento, com'è, per chi* — che compongono la frase senza tastiera. Chi non vuole scrivere né parlare costruisce *"il mare, d'estate, fresco, per lui"* con quattro tocchi.
- **I consigli** (`#consigli`): *"Ho capito: bosco d'inverno · fresco · niente dolce"* come chip — toccandone una la si toglie e i codici si ricalcolano, toccandola di nuovo torna. Poi le tre schede (codice, famiglia, perché, piramide, descrizione), *Nessuno mi convince* per la riserva, *Cambia la frase*, *Ricomincia*. Tocco lungo su una scheda: il dettaglio del punteggio per il personale.
- Quando non capisce abbastanza lo dice, e nomina le parole che non conosce: *"Queste parole non le conosco ancora: «astronave»."*

## 4. Tastiera e voce sul chiosco — da decidere col cliente

`docs/12-ricerca-note.md` diceva "nessun campo di testo sul chiosco". Il consulente a parole ne ha uno, per forza. Le strade:

1. **Voce e spunti in primo piano, tastiera possibile** (com'è adesso): il microfono e gli spunti bastano per quasi tutti, la tastiera c'è per chi la vuole.
2. **Solo voce e spunti**: il riquadro diventa di sola lettura. Meno libertà, zero tastiera.
3. **Il consulente a parole solo per il commesso**, fuori dal percorso del cliente.

Il riconoscimento vocale di Safari manda l'audio ad Apple se il dispositivo non lo fa in locale: va detto al cliente, ed è una ragione in più per lasciare sempre la strada degli spunti. **Da provare sull'iPad vero**, anche in modalità "Aggiungi alla schermata Home", dove in passato è stato instabile.

## 5. Statistiche

Anonime e aggregate: quante persone entrano da questa porta, **quali scene** vengono raccontate e quali rifiutate (le chiavi del lessico, che sono nostre), quanti racconti non hanno dato abbastanza per proporre, quanti avevano parole sconosciute. **La frase non si salva mai**, nemmeno le parole sconosciute: una frase libera è un dato del cliente, e potrebbe contenere un nome commerciale.

## 6. Prove e taratura

```bash
node scripts/test_interpreta.mjs    # la grammatica su un lessico sintetico, più: ogni forma del lessico vero torna alla sua scena
node scripts/test_consulente.mjs    # il punteggio e il perché su profili sintetici, più le frasi tipiche sul catalogo vero
node scripts/prova_consulente.mjs   # le frasi tipiche, da leggere a occhio col personale ("frase libera" per provarne una)
```

Le **frasi tipiche** stanno in `app/js/scenari.js` (`FRASI`), ognuna con le sue attese scritte in termini di catalogo, non di scene — *"almeno due delle tre hanno legni o note verdi"*, *"nessuna è gourmand"*, *"nessuna è da donna"* — così restano valide quando il lessico cresce. Sono le stesse che il backoffice prova con un tocco (Taratura → *Consulente a parole*), dove si scrive anche una frase qualsiasi e si vede cosa ha capito e perché propone quello che propone.

## 7. Come si fa crescere

1. Il personale prova frasi vere dal backoffice e segna quelle capite male.
2. Si aggiungono forme o scene in `dati/lessico/` (a mano, o chiedendo a Claude con lo stesso vocabolario davanti), si compila, si lanciano le prove.
3. Una frase che deve funzionare sempre diventa una riga di `FRASI`, con le sue attese.

Il lessico cresce senza toccare il codice, e ogni versione è controllata contro il catalogo di quel momento.

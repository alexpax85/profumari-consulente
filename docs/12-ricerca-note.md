# 12 · Ricerca per note — il secondo percorso

> Deciso il 18/09/2026 con il cliente: il chiosco non ha più un percorso solo. Dopo la schermata di attesa si sceglie **come si vuole essere aiutati**.
>
> - **Fatti guidare** — il percorso a domande di `05-percorso.md`: si risponde per immagini e sensazioni, escono tre codici da provare.
> - **Cerca per note** — quello di questo documento: si parte dagli ingredienti (muschio, cuoio, agrumi) e si sfoglia il catalogo. Meno astratto, più analitico; stesso tono e stessa veste.
>
> Il primo è per chi non sa da dove cominciare, il secondo per chi una mezza idea ce l'ha ("mi piacciono i legni", "cerco qualcosa col cuoio") o per il commesso che vuole rispondere subito a una richiesta precisa. Nessuno dei due è "quello giusto": sono due porte sulla stessa stanza.

Regole di sempre, che valgono anche qui: **solo referenze attive**, **mai un nome commerciale** (solo il codice a tre cifre), nessun dato del cliente, nessun campo di testo (niente tastiera sul chiosco), tocco minimo 60 px.

## 1. Le schermate

### 0-bis · Il bivio (`#scelta`)

Si apre al primo tocco sull'attesa, prima di qualsiasi altra cosa. Due schede grandi, pari fra loro — nessuna delle due è quella di serie B — con icona, una riga che dice a chi serve, e la durata:

| | Rispondi a qualche domanda | Parti dalle note che ti piacciono |
|---|---|---|
| per chi | non ha un'idea precisa | una mezza idea ce l'ha ("mi piacciono i legni") |
| cosa fa | il percorso di `05-percorso.md` | il banco delle note di qui |
| durata | circa un minuto | quanto vuole |

Sotto, una riga piccola: *"Se non sai decidere, comincia dalle domande."* Il tocco lungo di tre secondi sul logo dell'attesa resta l'unica maniglia del backoffice. Dopo 45 secondi fermi si torna all'attesa. Dai risultati del percorso guidato, "Ricomincia" riporta qui: da una porta si può passare all'altra senza ripartire dall'attesa.

### 1 · La tavolozza (`#ricerca`)

Nove schede, tutte visibili senza scorrere: **Agrumi · Fiori · Frutta e sole · Erbe e foglie · Mare e bucato · Legni e terra · Spezie · Dolce · Ambra, incenso e cuoio**. Sotto ogni titolo, tre note vere del catalogo di oggi (*bergamotto, limone, mandarino*): l'assaggio è calcolato a runtime, quindi non promette mai note che il negozio ha disattivato.

I ventiquattro accordi della tassonomia stanno tutti dentro un gruppo e uno solo (lo verifica `test_ricerca.mjs`): nessuna nota del catalogo resta irraggiungibile. I gruppi sono in `app/config/ricerca.json` e si cambiano senza toccare il codice.

Qui non ci sono numeri: questa schermata deve essere solo piacevole. I conteggi cominciano dal cassetto.

### 2 · Il cassetto di un gruppo

Le note vere, ordinate per quante fragranze le contengono, ognuna con **una riga che dice cos'è, senza gergo** e il suo conteggio:

> **cuoio** · pelle conciata, come una giacca nuova · **33 profumi**

Le spiegazioni stanno in `ricerca.json` (`spiegazioni`): una nota senza riga mostra solo nome e numero. Se il gruppo ha più di una dozzina di note, un pulsante **"Vedi tutte le N note"** apre il resto: quello che non si mostra subito non deve diventare irraggiungibile. In fondo, sotto il titolino *"Oppure prendi tutta una famiglia"*, le famiglie del gruppo come chip: sono più larghe di una nota sola, perché prendono anche chi quella nota non ce l'ha scritta ma di quella famiglia sa lo stesso.

### 3 · Il cesto (sempre in fondo)

Le chip di quello che si è scelto (tocco per toglierle), una riga che conta in tempo reale — *"33 profumi ce l'hanno davvero, altri 15 ci somigliano"* — e due pulsanti: **Non lo voglio** e **Vedi i profumi**. Il numero che si muove a ogni tocco è il manuale del percorso: spiega la regola del gioco senza scriverla.

**Non lo voglio** è un interruttore a due stati, non un tocco lungo: un tocco lungo non si scopre da solo, e un cliente che esclude credendo di aggiungere resta senza risultati e non capisce perché. Con l'interruttore acceso il titolo diventa *"C'è qualcosa che non sopporti?"* e quello che si tocca — una nota o una famiglia intera — finisce fra i veti, come chip scura e barrata.

### 4 · I profumi trovati (`#trovati`)

- In alto le chip della ricerca (si tolgono con un tocco) e due file di filtri con il **conteggio vero accanto a ogni scelta**: *Per chiunque 163 · Per lui 120 · Per lei 108* e *Come viene · Discreto · Medio · Deciso*. I numeri contano quelle che hanno almeno una delle cose chieste, cioè esattamente quelle che la lista mostra. Un filtro che porterebbe a zero resta visibile, ma spento. **Un filtro acceso torna sul banco come chip**, insieme alle note: un filtro invisibile che azzera la lista è il vicolo cieco peggiore, perché il cliente non ha niente da togliere. Se una lista resta vuota per colpa sua, la frase lo nomina: *"Con «Discreto» non resta niente: tocca la sua chip per toglierlo."*
- Poi i risultati **a fasce**: *Hanno tutto quello che hai chiesto (4)*, *Ne hanno una su due (39)*. Chi non ha niente di quello che è stato chiesto entra solo se sopra non c'è abbastanza roba: centoventi "ci somigliano" dietro a quattro risposte giuste sono rumore.
- Ogni scheda: **codice** grande, famiglia in parole semplici, la **piramide** con le note cercate accese in petrolio e quelle della famiglia giusta in petrolio chiaro, la descrizione. **Toccando una nota della piramide la si aggiunge alla ricerca**: è il modo naturale di affinare, e il motivo per cui questo percorso si chiama analitico.
- "Guarda la scheda" apre la fragranza intera: piramide per file (*testa · i primi minuti*, *cuore · la prima ora*, *fondo · quello che resta*), le quattro misure a pallini (mai un numero nudo), la descrizione e *"Al banco chiedi il codice 831"*. Tocco lungo sulla scheda: il dettaglio tecnico per il personale (punteggio, criteri presi, confidenza).
- Quando nessuna fragranza mette insieme tutto, lo dice una riga morbida prima dell'elenco: *"Non c'è un profumo che le metta insieme tutte. Da sola, «tè» sta in 4 profumi."*

Mai un punteggio né una percentuale davanti al cliente: l'ordine e i conteggi sono la risposta.

## 2. Da dove vengono le note

I profili (`dati/profili.json`) portano la piramide del fornitore in tre file: `testa`, `cuore`, `fondo`. Nel catalogo attivo sono **316 note distinte**, molto sbilanciate: `vaniglia` compare in 117 fragranze e `muschio`, contando le sue forme, in 100, mentre 143 note compaiono una volta sola. È il motivo per cui la tavolozza mostra poche note per gruppo e le altre restano dietro: un elenco di trecento voci non è una scelta, è un elenco.

Sopra le note c'è la tassonomia dei 24 **accordi** (`app/config/accordi.json`), che è quella che il cliente capisce: *agrumi, legni, spezie, cuoio, muschi puliti*. `app/config/note.json` — lo stesso file che serve a costruire i profili dalle card — dice a quali accordi porta ogni nota, e quindi **in quale famiglia della tavolozza la nota va a finire**: la famiglia di una nota è l'accordo che pesa di più nella sua riga.

Da questa sessione `note.json` viene letto anche **a runtime** (prima serviva solo a `scripts/genera_profili.mjs`): è lui che costruisce l'indice della ricerca. Modificarlo dal backoffice cambia la tavolozza senza toccare il codice.

## 3. L'indice · `indiceNote(profili, config)`

Si costruisce all'avvio sulle sole referenze attive e dice **cosa c'è davvero nel catalogo di oggi**:

```js
{
  gruppi: [{ chiave: 'legni', etichetta: 'Legni e terra', icona: 'albero', tinta: 'sabbia',
             quante: 224, famiglie: [/* legnoso, patchouli, oud */],
             note: [{ nome: 'patchouli', quante: 63 }, …],
             assaggio: ['patchouli', 'sandalo', 'legno di cedro'], altre: 15 }],
  famiglie: [{ chiave: 'legnoso', etichetta: 'legni', semplice: 'cedro, sandalo, vetiver',
               icona: 'albero', tinta: 'sabbia', quante: 194,
               note: [{ nome: 'sandalo', quante: 58 }, …], altre: 14 }],
  note: [...],        // tutte, ordinate per frequenza
  perNota: Map,       // nota mostrata -> { nome, quante, famiglia }
  senzaFamiglia: 0,   // note della piramide che note.json non conosce: da sistemare
}
```

- `quante` di un gruppo conta le fragranze che hanno almeno una delle sue famiglie; `quante` di una famiglia conta quelle con quell'accordo sopra la sua soglia; `quante` di una nota conta le fragranze che ce l'hanno in piramide. **Sono numeri veri e si mostrano al cliente**: è quello che rende la ricerca concreta invece che astratta.
- **Sinonimi**: `rosa bulgara`, `rosa di damasco` e `rosa taif` per un cliente sono *rosa*. I gruppi stanno in `app/config/ricerca.json`; l'indice li conta insieme e ne mostra uno solo, la ricerca li trova tutti.
- Le note sotto `minimoOccorrenze` (2) non si mostrano — un elenco di note che esistono in una fragranza sola non aiuta nessuno — ma restano cercabili e continuano a contare per la loro famiglia.

## 4. La ricerca · `cerca(criteri, profili, config)`

```js
criteri = {
  accordi: ['legnoso'],       // famiglie scelte dalla tavolozza
  note: ['pepe rosa'],        // note precise
  escludi: ['gourmand'],      // quello che non si vuole
  genere: 'uomo' | 'donna' | null,
  intensita: 'leggera' | 'media' | 'decisa' | null,
}
```

**Non è un filtro secco.** Ogni criterio dà da 0 a 1, e il punteggio è la media sui criteri chiesti:

| Criterio | Quando è preso | Quanto vale |
|---|---|---|
| Famiglia (`accordi`) | `profilo.accordi[k] ≥ 0.3` | `min(1, valore)` |
| Famiglia appena accennata | sotto la soglia | `valore × 0.5`, e non conta come preso |
| Nota (`note`) | la nota o un suo sinonimo è in piramide | `peso della fila × (0.7 + 0.3 × forza)` |
| Nota assente ma famiglia presente | — | `forza × 0.45`, non conta come preso |

- **Peso della fila**: fondo 1, cuore 1, testa 0,85. La nota che resta sulla pelle conta più di quella che evapora in dieci minuti.
- **Forza**: quanto quella nota è protagonista in quella fragranza (il valore del suo accordo nel profilo). Serve all'ordine: chi cerca *cuoio* vuole prima le fragranze che sul cuoio sono costruite, non quelle che ne hanno una goccia.
- `pieno` è chi ha **tutto** quello che è stato chiesto; gli altri restano in lista, dietro, perché "ci somiglia" al banco è un'informazione utile. L'ordine è: prima quanti criteri sono presi, poi il punteggio, poi la confidenza della scheda, poi il codice — **deterministico**, la stessa ricerca dà sempre la stessa lista.
- **Veti** (`escludi`): un accordo ≥ 0,5 toglie la fragranza dalla lista, e non torna. Un accenno (0,3) no: escludere "il dolce" non deve cancellare mezzo catalogo.
- `daSoli` dice quante fragranze soddisfano **ogni criterio da solo**, con il suo tipo. È così che una lista corta si spiega invece di lasciare il vuoto: *"il tabacco è raro: da solo sono sette fragranze"*. Famiglia e nota restano contate a parte anche quando si chiamano allo stesso modo — otto parole del catalogo (rosa, oud, vaniglia, cuoio, incenso, tabacco, patchouli, miele) sono insieme famiglia e nota, e sommarle darebbe numeri più grandi del catalogo.

### Una nota, una sola forma

Una nota arriva scritta in due modi: dal cassetto come chiave già risolta (`rosa`, `te`) e dalla piramide di un risultato come sta sulla card (`rosa bulgara`, `tè`). `chiaveDiNota(nome, config)` le riporta tutte e due alla stessa identità — normalizzazione più capogruppo dei sinonimi — e da lì passano tutti i tocchi. Senza, la stessa nota diventa due criteri e il tocco su una pastiglia accesa la aggiunge invece di toglierla.

## 5. La piramide nel risultato · `piramide(profilo, criteri, config)`

È la parte che il percorso guidato non dà e che qui è il punto: la scheda del risultato mostra **testa, cuore e fondo**, con acceso quello che si è chiesto — in pieno le note cercate (`voluta`), più tenui quelle che appartengono a una famiglia scelta (`accordo`). Chi cerca "legni" vede accendersi cedro, sandalo e vetiver, non la parola "legni".

## 6. Configurazione · `app/config/ricerca.json`

| Voce | Cosa decide |
|---|---|
| `pesiFila`, `sogliaAccordo`, `sogliaVeto`, `affinita`, `forzaNota` | il punteggio (sopra) |
| `soglieFamiglia` | le eccezioni alla soglia: **`ambrato` sta a 0,5** perché l'accordo arriva anche dalla parola "ORIENTALE" stampata sulla card, e settantotto profili lo portano senza avere una sola nota ambrata in piramide. A 0,25 la famiglia "ambra" ne contava 182 su 336; a 0,5 ne conta 95, che è la verità |
| `gruppi` | i nove gruppi della tavolozza, con le famiglie che ci stanno dentro |
| `sinonimi` | le forme che per un cliente sono la stessa nota (`rosa bulgara` → *rosa*) |
| `famigliaNota` | dove mettere una nota quando la famiglia di `note.json` non è quella che il cliente si aspetta. Il caso da non sbagliare è **muschio di quercia**: il nome dice muschio, ma è terra e sottobosco, e fra la lavanda e la menta non ci sta |
| `nascoste` | le note da profumiere (`ambroxan`, `iso e super`, `cypriol`): restano cercabili e continuano a contare per la loro famiglia, ma nella tavolozza non si mostrano |
| `spiegazioni` | la riga che dice cos'è una nota, in parole normali |
| `massimoScelte`, `minimoOccorrenze`, `quanteNotePerGruppo`, `quantiRisultati` | quanto si può chiedere e quanto si mostra |

Le soglie si tarano dal backoffice (Taratura → *Ricerca per note*); gruppi, sinonimi e spiegazioni si scrivono nel file. Dopo una modifica:

```bash
node scripts/test_ricerca.mjs
```

## 7. Prove e taratura

- `node scripts/test_ricerca.mjs` — le prove: indice, sinonimi, peso delle file, pieno contro parziale, veti, filtri, ordine stabile, più una passata sul catalogo vero (ogni nota ha la sua famiglia, nessuna famiglia resta senza note, le ricerche tipiche trovano qualcosa).
- `node scripts/prova_ricerca.mjs` — le ricerche tipiche sul catalogo vero, da leggere a occhio col personale; `--indice` stampa la tavolozza com'è oggi (gruppi, famiglie, note e conteggi).
- Backoffice → Taratura → **Ricerca per note**: le stesse cose dal banco, con le soglie da muovere, gli scenari pronti e i controlli di salute (famiglie rimaste senza note, famiglie con poche referenze attive).

## 8. Statistiche

Anonime e aggregate come sempre (regola 4): quante persone entrano da ciascuna delle due porte, quali note e famiglie vengono chieste, quante volte una ricerca è finita senza niente, quali codici sono stati aperti per leggerne la piramide. Nessuna combinazione di note viene registrata: *muschio* e *cuoio* si contano una per una, non come coppia. Si leggono nel backoffice, scheda Statistiche.

Una ricerca si conta **quando cambia la domanda del cliente**, non a ogni ridisegno: provare tre filtri di fila non è cercare tre volte la stessa nota, e quella tabella il personale la legge come "cosa chiede la clientela".

## 9. Cosa non fa

- Non cerca per nome commerciale, mai, in nessuna forma.
- Non mostra punteggi né percentuali al cliente: mostra le note e i conteggi, che sono fatti.
- Non sostituisce il banco: anche qui il finale è "chiedi di fartele provare".

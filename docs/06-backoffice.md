# 06 · Backoffice del personale

Area riservata dentro la stessa web app, raggiungibile con tocco lungo di tre secondi sul logo nella schermata di attesa e protetta da PIN (MVP; poi accessi Firebase come nel gestionale: "negozio" e "titolare"). Stessa impostazione visiva del gestionale: testata scura, schede con navigazione a sottolineatura, tabelle, badge, dialog.

## Schede

### Catalogo

- Import: file JSON esportato dal gestionale, oppure incolla del testo. Vengono tenuti solo `codice`, `categoria`, `attivo`; qualsiasi altro campo (brand, nome, fornitori, costi) viene scartato prima del salvataggio. Report dell'import: nuovi, disattivati, riattivati, invariati.
- Tabella per categoria: codice, attivo, ha profilo (sì/no), confidenza, ultima revisione. Filtri: senza profilo, confidenza bassa, inattivi.
- Un codice attivo **senza profilo** è evidenziato in rosso: non entra nel motore finché non ha un profilo.
- Interruttore attivo/inattivo manuale (per correzioni rapide in attesa del prossimo export).

### Profili

- Lista ordinata per confidenza crescente (prima le bozze da verificare), poi per codice. Ricerca per codice.
- Scheda di modifica: genere, famiglia (menu), sottofamiglia, note testa/cuore/fondo (chip aggiungibili), accordi con **cursori 0-1** su tutte le chiavi della tassonomia (i non nulli in alto), intensità/persistenza/dolcezza/freschezza a cinque tacche, stagioni e momento a cursori, occasioni e carattere a chip, descrizione (contatore 140 caratteri), confidenza, note interne.
- "Confermato": imposta `confidenza: alta` e `rivisto` alla data odierna.
- Anteprima: "Con che risposte esce questo profumo?" mostra, per il profilo aperto, i tre scenari tipici in cui finirebbe in rosa (calcolati dal motore sugli scenari di `prova_catalogo`). Aiuta a capire se la scheda è credibile.
- Duplica da un altro codice (per varianti tipo "intense", "elixir", "eau fraîche").

### Taratura

- Coefficienti del punteggio (`config.pesi`), soglia minima, vincoli di diversità.
- **Domande del percorso**: si scrivono da qui, non dai file. La tabella elenca titolo, tipo, gruppo, numero di risposte, peso e interruttore, e permette di riordinarle. Aprendone una si modificano titolo e sottotitolo, il tipo (una risposta sola, più risposte, cursore 1-5), il gruppo (percorso o gioco), e ogni risposta: testo, icona scelta da una griglia, e **verso cosa porta** — gli accordi si toccano a giro su tre livelli (*un tocco · abbastanza · tanto*) invece di scrivere numeri, più le chip di carattere e occasioni. "Nuova domanda", "Duplica" (nasce spenta) e "Elimina" completano il giro; un badge *da completare* segnala le domande che non hanno ancora titolo, due risposte o un contributo.
- Una domanda modificata qui viene marcata `toccata`: da quel momento gli aggiornamenti dell'app non la riscrivono più. Quelle di fabbrica mai toccate invece si riallineano da sole quando l'app si aggiorna, tenendo però peso e interruttore. Se una domanda di fabbrica viene eliminata, l'id finisce in `config.domandeRimosse` e non torna più indietro.
- La Prova rapida qui sotto usa la configurazione del momento: una domanda appena scritta si prova subito, senza uscire dalla scheda.
- **Ricerca per note** (`12-ricerca-note.md`): le soglie del secondo percorso — quando una famiglia c'è, quando un veto colpisce, quanto vale una somiglianza, quante cose si possono mettere insieme, quante note per cassetto — più la prova sul catalogo vero (famiglie e note da toccare, scenari pronti, tabella dei risultati con il motivo per cui ognuno è uscito) e i **controlli di salute**: famiglie rimaste senza note da mostrare, famiglie con poche referenze attive, note del catalogo senza riga in `note.json`. Sono le cose che un import del catalogo può rompere in silenzio. I gruppi della tavolozza, i sinonimi e le spiegazioni delle note stanno in `app/config/ricerca.json`.
- Testi del percorso (versione "per me" e "regalo").
- **Prova rapida**: un pannello dove il personale compila il percorso in forma compatta (tutte le domande in una schermata) e vede in tempo reale i tre risultati con punteggi e accordi coincidenti. È lo strumento principale per capire e correggere il motore.
- "Ripristina i valori consigliati" riporta ai file di configurazione di fabbrica.

### Statistiche

- Per giorno e in totale: percorsi iniziati (tutti e due i percorsi), domande completate e tempo mediano (che riguardano solo il percorso a domande: la ricerca per note non ha una fine), domanda in cui si abbandona di più, e **da quale delle due porte entra la clientela**.
- **Ricerca per note**: quali note e famiglie vengono chieste più spesso, quante ricerche sono finite senza niente, cosa viene escluso, quali codici sono stati aperti per leggerne la piramide. È la traccia più diretta per capire dove il catalogo ha un buco: se in venti ricerche qualcuno chiede il tabacco e in catalogo ce ne sono sette, quello è un dato da portare al fornitore.
- Codici proposti più spesso (tabella con conteggi) e mai proposti (per capire se un profilo è tarato male o se il catalogo ha buchi).
- Distribuzione delle risposte per domanda.
- Tutto anonimo; nessun dato personale esiste da nessuna parte.
- **Azzera le statistiche**: i conteggi ripartono da zero, senza toccare catalogo, profili, domande e tarature. Serve alla fine del collaudo e quando si porta un banco in un altro negozio.

### Backup

- Esporta tutto (catalogo, profili, configurazione, statistiche) in un JSON; importa da JSON con conferma. Punti di ripristino automatici come in `store.js` del gestionale.
- **Scarica solo la configurazione** (domande, pesi, frasi, testi, ricerca per note) e **importala** su un altro banco: è il modo per portare la messa a punto da un negozio all'altro senza portarsi dietro profili e statistiche. Il file di sola configurazione si rilegge, ma va bene anche un backup intero: da lì viene presa solo la configurazione.
- All'import di un backup intero si può **tenere le statistiche del dispositivo**, e il codice del banco resta quello locale: un backup portato da un altro negozio non si porta dietro i suoi numeri né il suo PIN.

## Conferme che dicono cosa succede

Dove qualcosa viene sostituito o perso — eliminare una domanda, rimettere i valori consigliati, importare, tornare a un punto di ripristino, azzerare le statistiche, dimenticare il PIN — non compare un "sei sicuro?", ma due o tre righe che dicono **cosa cambia** (freccia) e **cosa resta** (punto), più le eventuali scelte (tenere le proprie domande, tenere le proprie statistiche). Il tono è descrittivo, non allarmistico.

Sugli interruttori, sui pesi e sulle modifiche normali non c'è nessuna finestra: una conferma che si clicca senza leggere non protegge niente, e toglierebbe attenzione a quelle che contano davvero. `chiediConferma()` in `app/js/ui.js` è l'unico posto dove queste finestre si costruiscono.
- Nella fase Firebase: sincronizzazione automatica, l'export resta come backup manuale.

## Permessi (fase Firebase)

| Funzione | Titolare | Negozio |
|---|---|---|
| Percorso cliente | sì | sì |
| Catalogo: import, attivo/inattivo | sì | sì |
| Profili: modifica e conferma | sì | sì |
| Taratura pesi e testi | sì | no |
| Statistiche | sì | sì (senza export) |
| Backup e ripristino | sì | no |

## Persistenza nell'MVP

`app/js/store-locale.js`: un unico oggetto `stato` in `localStorage` con `{ catalogo, profili, config, statistiche, pin, versione }`, salvataggio con debounce, dieci punti di ripristino a rotazione. Interfaccia:

```js
export const store = { carica(), salva(stato), esporta(), importa(json), puntiRipristino(), ripristina(id) }
```

`store-firebase.js` (fase 5) espone la stessa interfaccia più `ascolta(callback)` per gli aggiornamenti in tempo reale. Il chiosco carica una copia locale dei dati all'avvio e continua a funzionare senza rete.

# 08 · Domande aperte per il cliente

Da chiarire con il titolare prima o durante la fase 2. Per ciascuna è indicata l'ipotesi con cui l'MVP procede se non arriva una risposta.

> **Da mandare al cliente**: `10-questionario-cliente.docx`, che raccoglie queste domande in un foglio da compilare, tenendo solo quelle che cambiano davvero qualcosa e aggiungendo le domande sul PDF delle piramidi. Si rigenera con `node scripts/genera_questionario.js`. Le risposte si riversano in `app/config/domande.json` e `app/config/testi.json`, senza toccare il codice.
>
> Chiuse il 16/09/2026: la 1 (le piramidi esistono, in PDF, in arrivo) e la 13 (accessi: rimandata con Firebase, vedi `02-piano.md`).

1. **Piramidi olfattive**: ne ha già una raccolta (schede fornitore, appunti)? Se sì, in che formato? *Ipotesi: si parte dalle bozze generate dagli originali, il personale le rivede nel backoffice.*
2. **Le equivalenti seguono fedelmente l'originale?** Ci sono referenze note per discostarsi (più dolci, meno persistenti)? *Ipotesi: fedeli; le eccezioni si correggono nella scheda profilo.*
3. **Cosa mostrare nel risultato oltre al codice**: la famiglia olfattiva in parole semplici va bene? Le note? *Ipotesi: codice, famiglia, motivazione, descrizione; niente note tecniche.*
4. **Come arriva il cliente al banco**: legge i codici, mostra lo schermo, biglietto stampato, QR? *Ipotesi: schermo e voce; biglietto in fase successiva.*
5. **Numero di proposte**: tre fisse, con una riserva a richiesta? O quattro? *Ipotesi: tre più riserva.*
6. **Quarta domanda "cosa non sopporti"**: va bene come formulazione o preferisce qualcosa di più morbido? *Ipotesi: come in `05-percorso.md`.*
7. **Domande gioco**: quali tenere (colore, bevanda, materiale, zodiaco, momento del giorno)? Il segno zodiacale può far storcere il naso a qualcuno: tenerlo a rotazione o su richiesta? *Ipotesi: tutte attive a rotazione, disattivabili dal backoffice.*
8. **Regalo**: la domanda "chi è?" con le opzioni partner, genitore, amico, collega, giovane è sufficiente? *Ipotesi: sì.*
9. **Dispositivo**: iPad esistente o nuovo, su supporto, in verticale o orizzontale? Uno per negozio? *Ipotesi: un iPad per negozio, in verticale su supporto.*
10. **Da casa**: vuole che il percorso sia raggiungibile anche dal sito iprofumari.it? Cambierebbe il finale ("vieni in negozio a provarli"). *Ipotesi: solo negozio nell'MVP.*
11. **Statistiche**: gli interessa sapere quali codici vengono proposti più spesso e quali risposte danno i clienti? *Ipotesi: sì, anonime.*
12. **Referenze particolari**: "Feromoni uomo/donna" (586, 587), "Grigio Perla" (000), le referenze senza codice (OLIBANO, PATCHOULI) e i codici dei brand meno noti (Morph, Kajal, Pantheon Roma, Lorenzo Pazzaglia, Giardini di Toscana): entrano nel chiosco? Ha schede per descriverli? *Ipotesi: entrano se attivi; i loro profili sono a confidenza bassa e vanno rivisti per primi.*
13. **Accessi**: nella versione condivisa bastano "negozio" e "titolare" come nel gestionale? *Ipotesi: sì.*
14. **Nome del progetto** da mostrare nella testata: "Consulente", "Il tuo profumo", "Percorso olfattivo", altro? *Ipotesi: "Consulente" nella testata, "Trova il tuo profumo" nella schermata di attesa.*

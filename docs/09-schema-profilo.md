# 09 · Schema del profilo olfattivo (usato per generare le bozze del 16/09/2026)

Output: un array JSON. Ogni elemento ha ESATTAMENTE questi campi. Mai inserire brand o nome commerciale: solo il codice.

```json
{
  "codice": "018",
  "genere": "uomo",                 // "uomo" | "donna" | "unisex": a chi si rivolge davvero la fragranza (non la categoria di listino)
  "famiglia": "aromatico",          // una tra: agrumato, aromatico, acquatico, verde, floreale, fruttato-floreale, chypre, cipriato, orientale, ambrato, legnoso, cuoio, gourmand, fougère
  "sottofamiglia": "aromatico fresco speziato",   // testo libero breve, in italiano, minuscolo
  "testa": ["bergamotto", "pepe"],  // 2-5 note in italiano, minuscolo
  "cuore": ["lavanda", "pepe di sichuan", "geranio"],
  "fondo": ["ambroxan", "cedro", "labdano"],
  "accordi": { "agrumato": 0.6, "aromatico": 0.5, "speziato": 0.5, "ambrato": 0.7, "legnoso": 0.5 },
  "intensita": 4,                   // 1-5: quanto si sente (proiezione)
  "persistenza": 4,                 // 1-5: quanto dura
  "dolcezza": 2,                    // 1-5
  "freschezza": 4,                  // 1-5
  "stagioni": { "primavera": 0.8, "estate": 0.8, "autunno": 0.6, "inverno": 0.4 },  // 0-1 ciascuna
  "momento": { "giorno": 0.8, "sera": 0.6 },   // 0-1
  "occasioni": ["quotidiano", "ufficio", "serata"],   // sottoinsieme di: quotidiano, ufficio, serata, sport, speciale, romantico
  "carattere": ["energico", "sicuro"],                // 2-3 tra: energico, calmo, sensuale, elegante, audace, coccola, misterioso, allegro, romantico, sicuro, fresco
  "descrizione": "Fresco e magnetico: agrumi e pepe su un fondo ambrato e legnoso che resta tutto il giorno.",  // 1 frase in italiano, max 140 caratteri, senza nomi di marca
  "confidenza": "alta"              // "alta" se la piramide dell'originale è nota e consolidata, "media" se ricostruita a memoria con qualche dubbio, "bassa" se il nome è ambiguo o poco conosciuto
}
```

## Accordi ammessi (chiavi di `accordi`, valori 0-1, indicare solo quelli >= 0.2, tipicamente 3-6 chiavi)

agrumato, aromatico, verde, acquatico, fruttato, solare (cocco, tiaré, ylang, monoi, sabbia calda), floreale-bianco (gelsomino, tuberosa, fiori d'arancio, gardenia), rosa, floreale-fresco (peonia, fresia, mughetto, lillà), cipriato (iris, violetta, eliotropio, aldeidi), speziato, legnoso, oud, ambrato, vaniglia, gourmand (caramello, praline, cioccolato, caffè, pistacchio, zucchero), muschiato (muschi bianchi, pulito, pelle), cuoio, incenso (incenso, fumo, resine), tabacco, patchouli, tè (tè verde/nero, matcha), miele, boozy (rum, whisky, cognac), acquatico-salino (usare "acquatico" con nota "sale" invece: NON usare questa chiave).

Regole:
- Il totale degli accordi non deve essere normalizzato: assegna 0.8-1.0 all'accordo dominante, poi decrescere.
- Per gli originali molto noti usa la piramide ufficiale. Per nomi ambigui o storpiati (es. "PHANTEON ROMA - Z", "MORPH - VAPOR", "KAJIAL- KOLADA") fai la tua migliore ipotesi ragionata e metti confidenza "bassa".
- Per "FEROMONI UOMO/DONNA": profilo muschiato neutro, confidenza "bassa".
- "GRIGIO PERLA" (codice 000): profilo fresco/aromatico classico maschile, confidenza "bassa".
- `descrizione` deve essere leggibile da un cliente su un chiosco: evocativa, concreta, senza gergo tecnico eccessivo, senza citare marchi né nomi commerciali.

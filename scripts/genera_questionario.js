// Genera docs/10-questionario-cliente.docx, il foglio di domande da mandare al cliente.
//
//   npm install docx            (unica dipendenza di tutto il progetto, e sta qui)
//   node scripts/genera_questionario.js docs/10-questionario-cliente.docx
//
// Non c'entra con l'app: app/ resta senza build e senza librerie. Serve solo a
// rigenerare il documento quando le domande cambiano, invece di rifarlo a mano.
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType, TabStopType, PageBreak, HeightRule,
} = require('docx');
const fs = require('fs');

const TEAL = '016B68';
const NERO = '121212';
const GRIGIO = '595959';
const LARGHEZZA = 9638; // A4 meno 2 cm di margine per lato

const R = (text, opt = {}) => new TextRun({ text, font: 'Arial', ...opt });

const p = (testo, opt = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  ...opt,
  children: typeof testo === 'string' ? [R(testo, { size: 22, color: NERO })] : testo,
});

const nota = (testo) => new Paragraph({
  spacing: { after: 160, line: 264 },
  indent: { left: 340 },
  children: [R(testo, { size: 19, italics: true, color: GRIGIO })],
});

const sezione = (lettera, titolo) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 380, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: TEAL, space: 6 } },
  children: [
    R(`${lettera}  `, { size: 26, bold: true, color: TEAL }),
    R(titolo.toUpperCase(), { size: 22, bold: true, color: NERO, characterSpacing: 60 }),
  ],
});

const domanda = (numero, testo) => new Paragraph({
  spacing: { before: 260, after: 90 },
  children: [
    R(`${numero}. `, { size: 22, bold: true, color: TEAL }),
    R(testo, { size: 22, bold: true, color: NERO }),
  ],
});

// Caselle da barrare. Con `colonne` le mette una accanto all'altra.
const opzioni = (elenco, colonne = 1) => {
  if (colonne === 1) {
    return elenco.map((testo) => new Paragraph({
      spacing: { after: 70 },
      indent: { left: 340 },
      children: [R('☐   ', { size: 24, color: TEAL }), R(testo, { size: 22 })],
    }));
  }
  const righe = [];
  for (let i = 0; i < elenco.length; i += colonne) righe.push(elenco.slice(i, i + colonne));
  return righe.map((riga) => new Paragraph({
    spacing: { after: 70 },
    indent: { left: 340 },
    tabStops: [1, 2, 3].map((n) => ({ type: TabStopType.LEFT, position: 340 + n * Math.floor(8600 / colonne) })),
    children: riga.flatMap((testo, i) => [
      ...(i ? [R('\t')] : []),
      R('☐   ', { size: 24, color: TEAL }),
      R(testo, { size: 22 }),
    ]),
  }));
};

// Righe su cui scrivere. Trattini bassi veri: il bordo di un paragrafo vuoto
// non lo disegnano tutti i lettori, questi sì, anche stampando.
const RIGA = '_'.repeat(68);
const righe = (quante = 2) => Array.from({ length: quante }, (v, i) => new Paragraph({
  spacing: { before: 260, after: i === quante - 1 ? 200 : 0 },
  indent: { left: 340 },
  children: [R(RIGA, { size: 22, color: 'B4B4B4' })],
}));

const cella = (figli, larghezza, opt = {}) => new TableCell({
  width: { size: larghezza, type: WidthType.DXA },
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  ...opt,
  children: figli,
});

const intestazione = (testo) => new Paragraph({
  children: [R(testo, { size: 18, bold: true, color: NERO, characterSpacing: 30 })],
});

// Tabella "questa cosa va bene / da cambiare"
function tabellaScelte(colonne, dati, etichette) {
  const bordo = { style: BorderStyle.SINGLE, size: 2, color: 'D9D9D9' };
  return new Table({
    columnWidths: colonne,
    width: { size: LARGHEZZA, type: WidthType.DXA },
    borders: { top: bordo, bottom: bordo, left: bordo, right: bordo, insideHorizontal: bordo, insideVertical: bordo },
    rows: [
      new TableRow({
        tableHeader: true,
        children: etichette.map((testo, i) => cella([intestazione(testo)], colonne[i], {
          shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
        })),
      }),
      ...dati.map((riga) => new TableRow({
        children: riga.map((contenuto, i) => {
          if (contenuto === '☐') {
            return cella([new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [R('☐', { size: 26, color: TEAL })],
            })], colonne[i]);
          }
          if (Array.isArray(contenuto)) {
            return cella([
              new Paragraph({ children: [R(contenuto[0], { size: 21, bold: true })] }),
              new Paragraph({ children: [R(contenuto[1], { size: 18, color: GRIGIO })] }),
            ], colonne[i]);
          }
          return cella([new Paragraph({ children: [R(contenuto, { size: 21 })] })], colonne[i]);
        }),
      })),
    ],
  });
}

const riquadro = (titolo, testo) => new Table({
  columnWidths: [LARGHEZZA],
  width: { size: LARGHEZZA, type: WidthType.DXA },
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE },
    left: { style: BorderStyle.SINGLE, size: 18, color: TEAL },
  },
  rows: [new TableRow({
    children: [cella([
      new Paragraph({ spacing: { after: 60 }, children: [R(titolo, { size: 20, bold: true, color: TEAL, characterSpacing: 30 })] }),
      ...[].concat(testo).map((t) => new Paragraph({ spacing: { after: 60 }, children: [R(t, { size: 21, color: NERO })] })),
    ], LARGHEZZA, { shading: { type: ShadingType.CLEAR, fill: 'F3F8F8' } })],
  })],
});

// ---------------------------------------------------------------- contenuto

const corpo = [];

// Testata
corpo.push(
  new Paragraph({
    spacing: { after: 40 },
    children: [R('I PROFUMARI', { size: 20, bold: true, color: TEAL, characterSpacing: 120 })],
  }),
  new Paragraph({
    spacing: { after: 60 },
    children: [R('Consulente olfattivo', { size: 44, color: NERO })],
  }),
  new Paragraph({
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 10 } },
    children: [R('Le scelte da fare prima di rifinire il chiosco', { size: 24, color: GRIGIO })],
  }),
  new Paragraph({
    spacing: { after: 300 },
    children: [R('Latina e Aprilia  ·  16 settembre 2026', { size: 19, color: GRIGIO, characterSpacing: 20 })],
  }),
);

corpo.push(
  p('La demo del consulente è in linea e funziona: fa le domande, propone tre codici e spiega in due righe perché. Quello che manca adesso non è software, sono decisioni che riguardano il negozio.'),
  p('Qui sotto ci sono solo le domande che cambiano davvero qualcosa. Per ognuna è indicata l\'ipotesi con cui si va avanti se non arriva risposta: dove l\'ipotesi va bene, si può saltare la domanda e passare alla successiva. Barrare le caselle, scrivere sulle righe, rimandare il file.'),
  new Paragraph({ spacing: { after: 120 }, children: [] }),
  riquadro('Prima di rispondere', [
    'Vale la pena provare il percorso: alexpax85.github.io/profumari-consulente',
    'Funziona anche dal telefono. Bastano due minuti e la sezione B diventa molto più facile da compilare.',
  ]),
);

// ------------------------------------------------------------------ A
corpo.push(sezione('A', 'Le piramidi olfattive'));
corpo.push(
  p('Il motore confronta le risposte del cliente con la piramide olfattiva di ogni referenza. Oggi lavora su schede ricostruite a tavolino: 235 sono affidabili, 66 da controllare, 35 da rifare. Il PDF delle etichette serve a sostituirle dove è più preciso.'),
);

corpo.push(domanda('A1', 'Il PDF copre tutte le referenze?'));
corpo.push(...opzioni(['Tutte e 336', 'Solo una parte — quante, all\'incirca? ______________', 'Da verificare']));

corpo.push(domanda('A2', 'Per ogni codice, cosa riporta?'));
corpo.push(...opzioni([
  'Le note di testa, cuore e fondo',
  'Una descrizione della fragranza',
  'La famiglia olfattiva (agrumato, legnoso, orientale…)',
  'Altro: ________________________________________________',
]));

corpo.push(domanda('A3', 'Nel file compare anche il nome dell\'originale?'));
corpo.push(...opzioni(['Sì', 'No'], 2));
corpo.push(nota('Se c\'è non è un problema: resta sul computer, serve solo a compilare le schede. Nel chiosco non compare mai, in nessuna schermata — quella è la regola numero uno del progetto.'));

corpo.push(domanda('A4', 'Ci sono referenze che si discostano dall\'originale?'));
corpo.push(p('Più dolci, meno persistenti, più tenaci del profumo a cui si ispirano. Bastano i codici.'));
corpo.push(...righe(3));
corpo.push(nota('Ipotesi: seguono l\'originale. Le eccezioni si correggono a mano, una scheda alla volta.'));

// ------------------------------------------------------------------ B
corpo.push(new Paragraph({ children: [new PageBreak()] }));
corpo.push(sezione('B', 'Le domande del percorso'));

corpo.push(domanda('B1', 'Le domande di oggi vanno bene?'));
corpo.push(p('Una per schermata, nell\'ordine. Segnare quelle da cambiare e scrivere come.'));
corpo.push(tabellaScelte(
  [4900, 1100, 3638],
  [
    [['Per chi cerchiamo un profumo?', 'per me · è un regalo'], '☐', ''],
    [['Chi lo indosserà?', 'un uomo · una donna · senza vincoli'], '☐', ''],
    [['Dove vorresti essere adesso?', 'dieci luoghi, se ne scelgono uno o due'], '☐', ''],
    [['Cosa proprio non sopporti?', 'otto cose, fino a tre'], '☐', ''],
    [['Quando lo userai?', 'sei occasioni, fino a due'], '☐', ''],
    [['Quanto deve farsi sentire?', 'cinque tacche, da una carezza a tutta la stanza'], '☐', ''],
    [['In che stagione siamo nella tua testa?', 'quattro stagioni o tutto l\'anno'], '☐', ''],
    [['Come vuoi sentirti?', 'nove parole, se ne scelgono una o due'], '☐', ''],
    [['Un profumo che hai amato somigliava a…', 'sette famiglie illustrate, si può saltare'], '☐', ''],
  ],
  ['Domanda', 'Cambiare', 'Come'],
));

corpo.push(domanda('B2', 'Le domande gioco: quali tenere?'));
corpo.push(p('Ne compare una sola per percorso, a rotazione. Servono a rendere il giro leggero e a sciogliere i pareggi, non a decidere.'));
corpo.push(tabellaScelte(
  [6000, 1819, 1819],
  [
    [['Un colore, senza pensarci troppo', 'dieci colori'], '☐', '☐'],
    [['Cosa berresti adesso?', 'caffè, tè, cocktail, vino, limonata, cioccolata'], '☐', '☐'],
    [['Quale ti piace toccare?', 'lino, cuoio, seta, lana, velluto, legno'], '☐', '☐'],
    [['Il tuo momento della giornata', 'alba, pomeriggio, tramonto, notte'], '☐', '☐'],
    [['Il segno zodiacale', 'dodici segni, contano i quattro elementi'], '☐', '☐'],
  ],
  ['Domanda', 'Tengo', 'Tolgo'],
));
corpo.push(nota('Il segno zodiacale diverte molti e infastidisce qualcuno. Terza strada: tenerlo, ma mostrarlo solo se è il cliente a chiederlo.'));

corpo.push(domanda('B3', 'Quante domande gioco per percorso?'));
corpo.push(...opzioni(['Una (come adesso)', 'Due', 'Nessuna'], 3));

corpo.push(domanda('B4', 'Domande nuove da aggiungere?'));
corpo.push(p('Scrivere la domanda e le risposte possibili. Va bene anche un\'idea abbozzata: le risposte si traducono poi in peso sugli accordi.'));
corpo.push(...righe(4));

corpo.push(domanda('B5', '«Cosa proprio non sopporti?»: la formulazione va bene?'));
corpo.push(...opzioni([
  'Va bene così',
  'Più morbida: «C\'è qualcosa che proprio non ti piace?»',
  'Altro: _______________________________________________',
]));
corpo.push(nota('È la domanda che evita gli errori più grossi: quella che tiene fuori dalla rosa il dolce a chi odia il dolce.'));

corpo.push(domanda('B6', 'Il cliente può orientare la scelta verso una linea?'));
corpo.push(p('Oggi il motore pesca da tutto il catalogo — UOMO, DONNA, NICCHIA, PREMIUM — guardando il carattere della fragranza, non lo scaffale.'));
corpo.push(...opzioni([
  'Va bene così: pesca da tutto',
  'Aggiungere una domanda: «Un classico o qualcosa di più particolare?»',
  'Tenere fuori sempre una linea: ______________________',
]));
corpo.push(nota('Nel chiosco non si parla mai di prezzi: sarebbe solo un modo per orientare la rosa.'));

corpo.push(domanda('B7', 'La durata va bene?'));
corpo.push(p('Oggi dieci schermate, circa un minuto.'));
corpo.push(...opzioni(['Va bene', 'Più corto: sei domande', 'Più lungo, se serve precisione'], 3));

// ------------------------------------------------------------------ C
corpo.push(new Paragraph({ children: [new PageBreak()] }));
corpo.push(sezione('C', 'I tre codici'));

corpo.push(domanda('C1', 'Quante proposte?'));
corpo.push(...opzioni([
  'Tre, più una quarta di riserva su richiesta (come adesso)',
  'Quattro fisse',
  'Altro: ______________',
]));

corpo.push(domanda('C2', 'Cosa mostrare, oltre al codice?'));
corpo.push(p('Oggi compaiono le prime tre voci.'));
corpo.push(...opzioni([
  'La famiglia in parole semplici («Caldo e speziato»)',
  'Due o tre righe di motivazione («legni e spezie, come volevi»)',
  'La descrizione della fragranza',
  'Le note di testa, cuore e fondo',
  'Solo il codice, niente altro',
]));

corpo.push(domanda('C3', 'Come arriva al banco?'));
corpo.push(...opzioni([
  'Mostra lo schermo',
  'Dice i tre codici a voce',
  'Biglietto stampato',
  'QR da inquadrare col telefono',
]));
corpo.push(nota('Ipotesi: schermo e voce. Biglietto e QR si aggiungono dopo, se servono davvero.'));

corpo.push(domanda('C4', 'Una frase di chiusura tua?'));
corpo.push(p('Adesso dice: «Chiedi al banco di fartele sentire: di\' i codici, o mostra questo schermo.»'));
corpo.push(...righe(2));

// ------------------------------------------------------------------ D
corpo.push(sezione('D', 'In negozio'));

corpo.push(domanda('D1', 'Il dispositivo'));
corpo.push(...opzioni(['iPad già in negozio', 'Da comprare'], 2));
corpo.push(...opzioni(['In verticale', 'In orizzontale'], 2));
corpo.push(...opzioni(['Uno per negozio', 'Solo Latina, per cominciare'], 2));

corpo.push(domanda('D2', 'Chi lo usa?'));
corpo.push(...opzioni(['Il cliente da solo', 'Il commesso insieme al cliente', 'Tutti e due'], 3));

corpo.push(domanda('D3', 'Le statistiche interessano?'));
corpo.push(p('Quanti percorsi al giorno, quali codici escono più spesso, quali non escono mai, dove ci si ferma.'));
corpo.push(...opzioni(['Sì', 'No'], 2));
corpo.push(nota('Del cliente finale non si chiede e non si salva niente: nessun nome, nessuna email, nessun orario. Solo conteggi.'));

corpo.push(domanda('D4', 'Chi rivede le schede olfattive, e quando?'));
corpo.push(p('Le 35 schede incerte sono già in cima alla lista nell\'area del personale: sono un pomeriggio di lavoro, non di più.'));
corpo.push(...righe(2));

// ------------------------------------------------------------------ E
corpo.push(sezione('E', 'Nome e parole'));

corpo.push(domanda('E1', 'La scritta in alto, nel chiosco'));
corpo.push(...opzioni(['Consulente (come adesso)', 'Il tuo profumo', 'Percorso olfattivo', 'Altro: ____________'], 2));

corpo.push(domanda('E2', 'La schermata di attesa'));
corpo.push(p('Adesso dice: «Trova il tuo profumo» e sotto «Poche domande, un minuto, tre codici da provare al banco».'));
corpo.push(...opzioni(['Va bene', 'Cambiare in:']));
corpo.push(...righe(2));

corpo.push(domanda('E3', 'Il percorso anche sul sito iprofumari.it?'));
corpo.push(...opzioni([
  'Solo in negozio, per ora',
  'Sì, anche da casa — con un finale diverso: «vieni a provarli in negozio»',
]));

// ------------------------------------------------------------- chiusura
corpo.push(new Paragraph({ spacing: { before: 400, after: 120 }, children: [] }));
corpo.push(riquadro('Per andare avanti servono tre cose', [
  '1.  Il PDF delle piramidi olfattive, anche solo una parte per cominciare.',
  '2.  Queste risposte, anche parziali: su tutto quello che resta in bianco si va avanti con l\'ipotesi indicata, niente si blocca.',
  '3.  Quando ci sarà, l\'export aggiornato del catalogo dal gestionale. Fino ad allora si lavora su quello del 14 settembre: 336 referenze, tutte attive.',
]));

const documento = new Document({
  creator: 'i profumari · consulente olfattivo',
  title: 'Consulente olfattivo — le scelte da fare',
  description: 'Domande aperte da chiudere con il cliente prima di rifinire il chiosco.',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: NERO } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
      },
    },
    children: corpo,
  }],
});

Packer.toBuffer(documento).then((buffer) => {
  fs.writeFileSync(process.argv[2] || 'questionario.docx', buffer);
  console.log('scritto', process.argv[2]);
});

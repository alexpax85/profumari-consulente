// Prove della ricerca per note — docs/12-ricerca-note.md.
// Profili sintetici per le regole (restano stabili quando il personale rivede le
// bozze) e una passata sul catalogo vero per le cose che solo i dati veri dicono.
//
//   node scripts/test_ricerca.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  indiceNote, cerca, piramide, noteDelProfilo, normalizzaNota, tabellaNote, famigliaDellaNota,
  chiaveDiNota,
} from '../app/js/ricerca.js';
import { profiliAttivi } from '../app/js/motore.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  note: leggi('app/config/note.json'),
  ricerca: leggi('app/config/ricerca.json'),
  pesi: leggi('app/config/pesi.json'),
};

// ------------------------------------------------------------- impalcatura

let passate = 0;
const fallite = [];

function prova(nome, fn) {
  try {
    fn();
    passate++;
    console.log(`  ok  ${nome}`);
  } catch (errore) {
    fallite.push({ nome, errore });
    console.log(`  NO  ${nome}\n      ${errore.message.split('\n')[0]}`);
  }
}

function profilo(codice, extra = {}) {
  return {
    codice,
    genere: 'unisex',
    famiglia: 'legnoso',
    sottofamiglia: 'legnoso generico',
    testa: [], cuore: [], fondo: [],
    accordi: {},
    intensita: 3, persistenza: 3, dolcezza: 2, freschezza: 3,
    stagioni: { primavera: 0.5, estate: 0.5, autunno: 0.5, inverno: 0.5 },
    momento: { giorno: 0.7, sera: 0.5 },
    occasioni: ['quotidiano'],
    carattere: ['fresco'],
    descrizione: 'Profilo di prova.',
    confidenza: 'alta',
    ...extra,
  };
}

const codici = (esito) => esito.risultati.map((r) => r.codice);

// Un catalogo sintetico: cuoio in fondo, cuoio in testa, solo la famiglia, e un dolce.
const CATALOGO = [
  profilo('101', { famiglia: 'cuoio', sottofamiglia: 'cuoio speziato',
    testa: ['bergamotto'], cuore: ['pepe rosa'], fondo: ['cuoio', 'sandalo'],
    accordi: { cuoio: 0.9, speziato: 0.5, legnoso: 0.5 } }),
  profilo('102', { famiglia: 'legnoso', sottofamiglia: 'legnoso agrumato',
    testa: ['cuoio'], cuore: ['iris'], fondo: ['legno di cedro'],
    accordi: { cuoio: 0.4, legnoso: 0.7, cipriato: 0.3 } }),
  profilo('103', { famiglia: 'legnoso', sottofamiglia: 'legnoso secco',
    testa: ['limone'], cuore: ['geranio'], fondo: ['vetiver', 'sandalo'],
    accordi: { legnoso: 0.9, agrumato: 0.4 } }),
  profilo('104', { famiglia: 'gourmand', sottofamiglia: 'gourmand vaniglia', genere: 'donna',
    testa: ['pera'], cuore: ['gelsomino'], fondo: ['vaniglia', 'caramello'],
    accordi: { gourmand: 0.9, vaniglia: 0.8, fruttato: 0.4 },
    intensita: 5, dolcezza: 5 }),
  profilo('105', { famiglia: 'floreale', sottofamiglia: 'floreale rosa', genere: 'donna',
    testa: ['pompelmo'], cuore: ['rosa bulgara', 'peonia'], fondo: ['muschio bianco'],
    accordi: { rosa: 0.9, 'floreale-fresco': 0.5, muschiato: 0.4 },
    intensita: 2 }),
  profilo('106', { famiglia: 'orientale', sottofamiglia: 'orientale vanigliato', genere: 'uomo',
    testa: ['cardamomo'], cuore: ['rosa'], fondo: ['vaniglia', 'legno di cedro'],
    accordi: { vaniglia: 0.7, rosa: 0.4, legnoso: 0.5, speziato: 0.4 },
    intensita: 4, confidenza: 'bassa' }),
];

// ============================================================ 1. l'indice

prova('indice: ogni famiglia porta le sue note, contate sulle fragranze attive', () => {
  const indice = indiceNote(CATALOGO, config);
  const cuoio = indice.famiglie.find((f) => f.chiave === 'cuoio');
  assert.ok(cuoio, 'la famiglia cuoio deve esserci');
  assert.equal(cuoio.quante, 2, '101 e 102 hanno cuoio sopra la soglia');
  const legnoso = indice.famiglie.find((f) => f.chiave === 'legnoso');
  assert.ok(legnoso.note.some((n) => n.nome === 'sandalo'), 'il sandalo sta fra i legni');
});

prova('indice: una nota conta una volta per fragranza, anche se ripetuta', () => {
  const doppia = profilo('107', { testa: ['sandalo'], cuore: ['sandalo'], fondo: ['sandalo'], accordi: { legnoso: 0.8 } });
  const indice = indiceNote([...CATALOGO, doppia], config);
  const sandalo = indice.perNota.get('sandalo');
  assert.equal(sandalo.quante, 3, '101, 103 e la fragranza con il sandalo ovunque');
});

prova('indice: le note rare restano fuori dall\'elenco mostrato ma non spariscono', () => {
  const indice = indiceNote(CATALOGO, config);
  const gourmand = indice.famiglie.find((f) => f.chiave === 'gourmand');
  assert.ok(!gourmand.note.some((n) => n.nome === 'caramello'), 'una sola occorrenza: non si mostra');
  assert.ok(indice.perNota.has('caramello'), 'ma l\'indice la conosce');
});

prova('indice: i sinonimi si contano insieme e si mostrano con un nome solo', () => {
  const indice = indiceNote(CATALOGO, config);
  assert.ok(!indice.perNota.has('rosa bulgara'), '"rosa bulgara" sta sotto "rosa"');
  assert.equal(indice.perNota.get('rosa').quante, 2, '105 (bulgara) e 106 (rosa)');
});

prova('indice: una nota che note.json non conosce non rompe niente', () => {
  const strana = profilo('108', { testa: ['profumo di nuvola'], accordi: { legnoso: 0.6 } });
  const indice = indiceNote([...CATALOGO, strana], config);
  assert.equal(indice.senzaFamiglia, 1);
  assert.ok(indice.famiglie.length > 0);
});

prova('tavolozza: i gruppi tengono dentro le loro famiglie e contano le fragranze', () => {
  const indice = indiceNote(CATALOGO, config);
  const ambra = indice.gruppi.find((g) => g.chiave === 'ambra');
  assert.ok(ambra, 'il gruppo "Ambra, incenso e cuoio" deve esserci');
  assert.ok(ambra.famiglie.some((f) => f.chiave === 'cuoio'));
  assert.equal(ambra.quante, 2, '101 e 102 hanno cuoio sopra la soglia; nessun altro accordo del gruppo');
  assert.ok(ambra.assaggio.length <= 3, 'l\'assaggio è di tre note, non di più');
  assert.ok(ambra.note.every((n) => n.quante >= 1));
});

prova('tavolozza: l\'assaggio dice note che esistono davvero adesso', () => {
  const indice = indiceNote(CATALOGO, config);
  for (const gruppo of indice.gruppi) {
    for (const nome of gruppo.assaggio) {
      assert.ok(indice.perNota.has(normalizzaNota(nome)), `${nome} non è nel catalogo`);
    }
  }
});

prova('soglia per famiglia: l\'ambra chiede più delle altre, perché la card la gonfia', () => {
  const opzioni = { ...config, ricerca: { ...config.ricerca, soglieFamiglia: { ambrato: 0.5 } } };
  const gonfia = profilo('301', { accordi: { ambrato: 0.35 }, fondo: ['legno di cedro'] });
  const vera = profilo('302', { accordi: { ambrato: 0.8 }, fondo: ['ambra'] });
  const esito = cerca({ accordi: ['ambrato'] }, [gonfia, vera], opzioni);
  assert.equal(esito.pieni, 1, 'solo quella con l\'ambra vera conta come presa');
  assert.equal(esito.risultati[0].codice, '302');
  const indice = indiceNote([gonfia, vera], opzioni);
  assert.equal(indice.famiglie.find((f) => f.chiave === 'ambrato').quante, 1);
});

prova('curatela: una nota può essere spostata nella famiglia giusta', () => {
  // "muschio di quercia" per note.json è verde; nella tavolozza sta con la terra,
  // altrimenti finisce fra la lavanda e la menta e chi cerca il pulito si sbaglia.
  const conMuschio = profilo('303', { accordi: { verde: 0.6, patchouli: 0.5 }, fondo: ['muschio di quercia'] });
  const indice = indiceNote([conMuschio, ...CATALOGO], config);
  assert.equal(indice.perNota.get('muschio di quercia').famiglia, 'patchouli');
  assert.ok(!indice.famiglie.find((f) => f.chiave === 'verde').note.some((n) => n.nome === 'muschio di quercia'));
});

prova('curatela: le note da profumiere non si mostrano, ma si cercano lo stesso', () => {
  const conGergo = profilo('304', { accordi: { legnoso: 0.8 }, fondo: ['iso e super', 'sandalo'] });
  const indice = indiceNote([conGergo, ...CATALOGO], config);
  assert.ok(indice.perNota.has('iso e super'), 'l\'indice la conosce');
  for (const famiglia of indice.famiglie) {
    assert.ok(!famiglia.note.some((n) => n.nome === 'iso e super'), 'ma non si mostra da nessuna parte');
  }
  const esito = cerca({ note: ['iso e super'] }, [conGergo, ...CATALOGO], config);
  assert.equal(esito.risultati[0].codice, '304', 'e chi la cerca la trova');
});

// ============================================================ 2. la ricerca

prova('nota cercata: chi ce l\'ha davvero precede chi ha solo la famiglia', () => {
  const esito = cerca({ note: ['cuoio'] }, CATALOGO, config);
  assert.equal(esito.risultati[0].codice, '101', 'cuoio nel fondo e protagonista');
  assert.equal(esito.risultati[1].codice, '102', 'cuoio in testa, più marginale');
  assert.equal(esito.pieni, 2);
});

prova('nota nel fondo: pesa più della stessa nota in testa', () => {
  const esito = cerca({ note: ['cuoio'] }, CATALOGO, config);
  const primo = esito.risultati.find((r) => r.codice === '101');
  const secondo = esito.risultati.find((r) => r.codice === '102');
  assert.ok(primo.punteggio > secondo.punteggio);
  assert.equal(primo.trovate[0].fila, 'fondo');
});

prova('due criteri: chi li ha tutti e due è "pieno" e sta davanti', () => {
  const esito = cerca({ accordi: ['legnoso'], note: ['sandalo'] }, CATALOGO, config);
  assert.equal(esito.risultati[0].codice, '103', 'legni forti più sandalo');
  assert.ok(esito.risultati[0].pieno);
  const parziale = esito.risultati.find((r) => !r.pieno);
  assert.ok(parziale, 'chi ha solo una delle due cose resta in lista, in coda');
  assert.ok(esito.risultati.filter((r) => r.pieno).every((pieno, i, tutti) => pieno.punteggio <= tutti[0].punteggio));
});

prova('affinità: chi non ha la nota ma ne ha la famiglia resta in coda, non sparisce', () => {
  const esito = cerca({ note: ['fava tonka'] }, CATALOGO, config);
  assert.ok(esito.risultati.length > 0, 'nessuno ha la fava tonka, ma la vaniglia sì');
  assert.equal(esito.pieni, 0);
  assert.equal(esito.risultati[0].codice, '104', 'la fragranza più vanigliata');
});

prova('sinonimi: cercare "rosa" trova anche chi in piramide ha "rosa bulgara"', () => {
  const esito = cerca({ note: ['rosa'] }, CATALOGO, config);
  assert.ok(codici(esito).includes('105'));
  assert.ok(esito.risultati.find((r) => r.codice === '105').pieno);
});

prova('veto: la famiglia che non si vuole toglie la fragranza dalla lista', () => {
  const senza = cerca({ note: ['vaniglia'], escludi: ['gourmand'] }, CATALOGO, config);
  assert.ok(!codici(senza).includes('104'), 'gourmand 0.9: fuori');
  assert.ok(codici(senza).includes('106'), 'vanigliata ma non da pasticceria: resta');
  assert.equal(senza.fuoriPerVeto, 1);
});

prova('veto su una nota: "niente vaniglia" vuol dire proprio niente vaniglia', () => {
  const senza = cerca({ accordi: ['legnoso'], escludiNote: ['vaniglia'] }, CATALOGO, config);
  assert.ok(!codici(senza).includes('106'), 'ha la vaniglia in piramide: fuori');
  assert.ok(codici(senza).includes('103'), 'legni senza vaniglia: resta');
});

prova('veto su una nota: prende anche i sinonimi', () => {
  const senza = cerca({ accordi: ['rosa'], escludiNote: ['rosa'] }, CATALOGO, config);
  assert.ok(!codici(senza).includes('105'), '"rosa bulgara" è rosa: fuori');
});

prova('veto: un accenno non basta a escludere', () => {
  const esito = cerca({ accordi: ['legnoso'], escludi: ['cipriato'] }, CATALOGO, config);
  assert.ok(codici(esito).includes('102'), 'cipriato 0.3: sotto la soglia del veto');
});

prova('filtro genere: "per lei" tiene donna e unisex, mai uomo', () => {
  const esito = cerca({ accordi: ['vaniglia'], genere: 'donna' }, CATALOGO, config);
  assert.ok(codici(esito).includes('104'));
  assert.ok(!codici(esito).includes('106'), '106 è uomo');
});

prova('filtro intensità: leggera, media, decisa', () => {
  const leggera = cerca({ accordi: ['rosa'], intensita: 'leggera' }, CATALOGO, config);
  assert.deepEqual(codici(leggera), ['105']);
  const decisa = cerca({ accordi: ['vaniglia'], intensita: 'decisa' }, CATALOGO, config);
  assert.ok(codici(decisa).includes('104') && codici(decisa).includes('106'));
});

prova('quante ne trova ogni criterio da solo: serve a spiegare una lista corta', () => {
  const esito = cerca({ note: ['cuoio'], accordi: ['gourmand'] }, CATALOGO, config);
  const cuoio = esito.daSoli.find((d) => d.chiave === 'cuoio');
  const gourmand = esito.daSoli.find((d) => d.chiave === 'gourmand');
  assert.equal(cuoio.quante, 2);
  assert.equal(gourmand.quante, 1);
  assert.equal(esito.pieni, 0, 'nessuna fragranza ha tutte e due le cose');
});

prova('senza criteri non si cerca, ma non si esplode', () => {
  const esito = cerca({}, CATALOGO, config);
  assert.equal(esito.risultati.length, 0);
  assert.equal(esito.criteri, 0);
});

prova('ordine stabile: stessa domanda, stessa risposta; a pari punteggio prima la scheda sicura', () => {
  const uno = codici(cerca({ accordi: ['legnoso'] }, CATALOGO, config));
  const due = codici(cerca({ accordi: ['legnoso'] }, [...CATALOGO].reverse(), config));
  assert.deepEqual(uno, due, 'l\'ordine non dipende da come arrivano i profili');
  const conBassa = cerca({ accordi: ['vaniglia'] }, [
    profilo('201', { accordi: { vaniglia: 0.8 }, confidenza: 'bassa', fondo: ['vaniglia'] }),
    profilo('202', { accordi: { vaniglia: 0.8 }, confidenza: 'alta', fondo: ['vaniglia'] }),
  ], config);
  assert.deepEqual(codici(conBassa), ['202', '201']);
});

prova('solo le referenze attive entrano: la ricerca vede quello che le si passa', () => {
  const catalogo = [
    { codice: '101', categoria: 'UOMO', attivo: true },
    { codice: '104', categoria: 'DONNA', attivo: false },
  ];
  const attivi = profiliAttivi(catalogo, CATALOGO);
  const esito = cerca({ accordi: ['gourmand'] }, attivi, config);
  assert.ok(!codici(esito).includes('104'), 'la referenza spenta non si propone mai');
});

prova('identità di una nota: la piramide e il cassetto parlano della stessa cosa', () => {
  // Il cassetto manda la chiave già risolta, la piramide il nome come sta sulla
  // card: senza chiaveDiNota lo stesso fiore diventerebbe due criteri, e il tocco
  // su una pastiglia accesa aggiungerebbe invece di togliere.
  assert.equal(chiaveDiNota('rosa bulgara', config), 'rosa');
  assert.equal(chiaveDiNota('Rosa Bulgara', config), 'rosa');
  assert.equal(chiaveDiNota('tè', config), normalizzaNota('tè'));
  assert.equal(chiaveDiNota('muschio bianco', config), 'muschio');
  assert.equal(chiaveDiNota('pepe rosa', config), 'pepe rosa', 'quello che non ha sinonimi resta sé stesso');

  const righe = piramide(CATALOGO[4], { note: ['rosa'] }, config);
  const accesa = righe.flatMap((r) => r.note).find((n) => n.voluta);
  assert.equal(accesa.nome, 'rosa bulgara', 'in piramide c\'è il sinonimo');
  assert.equal(chiaveDiNota(accesa.nome, config), 'rosa', 'ma toccandola si tocca "rosa"');
});

prova('ogni criterio da solo: famiglia e nota con lo stesso nome non si sommano', () => {
  // Otto parole del catalogo sono insieme famiglia e nota (cuoio, rosa, vaniglia,
  // oud, incenso, tabacco, patchouli, miele): un conteggio solo darebbe numeri
  // più grandi del catalogo, e la frase mostrata al cliente sarebbe falsa.
  const dueVolti = [
    // ha la nota scritta in piramide, ma di cuoio ne ha appena un'ombra
    profilo('401', { fondo: ['cuoio'], accordi: { cuoio: 0.2, legnoso: 0.8 } }),
    // è costruita sul cuoio, ma in piramide il cuoio non è scritto
    profilo('402', { fondo: ['betulla'], accordi: { cuoio: 0.9 } }),
  ];
  const esito = cerca({ accordi: ['cuoio'], note: ['cuoio'] }, dueVolti, config);
  const famiglia = esito.daSoli.find((d) => d.tipo === 'accordo' && d.chiave === 'cuoio');
  const nota = esito.daSoli.find((d) => d.tipo === 'nota' && d.chiave === 'cuoio');
  assert.equal(famiglia.quante, 1, 'solo 402 ha l\'accordo sopra la soglia');
  assert.equal(nota.quante, 1, 'solo 401 ha la nota in piramide');
  assert.equal(esito.daSoli.length, 2, 'due criteri, due conteggi distinti');
  // Sommati sarebbero due su due fragranze: il numero che il cliente leggerebbe
  // ("da sola, cuoio sta in 2 profumi") sarebbe falso in tutte e due le direzioni.
  assert.equal(esito.pieni, 0, 'nessuna delle due ha tutte e due le cose');
});

// ========================================================== 3. la piramide

prova('piramide: le note cercate si riconoscono, le altre restano al loro posto', () => {
  const righe = piramide(CATALOGO[0], { note: ['cuoio'] }, config);
  const fondo = righe.find((r) => r.fila === 'fondo');
  assert.equal(fondo.note.find((n) => n.nome === 'cuoio').voluta, true);
  assert.equal(fondo.note.find((n) => n.nome === 'sandalo').voluta, false);
  assert.equal(righe.length, 3);
});

prova('piramide: un sinonimo cercato si accende lo stesso', () => {
  const righe = piramide(CATALOGO[4], { note: ['rosa'] }, config);
  const cuore = righe.find((r) => r.fila === 'cuore');
  assert.equal(cuore.note.find((n) => n.nome === 'rosa bulgara').voluta, true);
});

prova('piramide: chi chiede una famiglia vede accese le note che ci stanno dentro', () => {
  const righe = piramide(CATALOGO[0], { accordi: ['legnoso'] }, config);
  const fondo = righe.find((r) => r.fila === 'fondo');
  assert.equal(fondo.note.find((n) => n.nome === 'sandalo').accordo, 'legnoso');
  assert.equal(fondo.note.find((n) => n.nome === 'cuoio').accordo, null);
  assert.equal(fondo.note.find((n) => n.nome === 'sandalo').voluta, false, 'la famiglia non è la nota');
});

// ====================================================== 4. il catalogo vero

const catalogoVero = leggi('dati/catalogo.json');
const profiliVeri = profiliAttivi(catalogoVero, leggi('dati/profili.json'));

prova('catalogo vero: ogni nota della piramide ha la sua famiglia in note.json', () => {
  const tabella = tabellaNote(config);
  const orfane = new Set();
  for (const p of profiliVeri) {
    for (const [, voce] of noteDelProfilo(p)) {
      if (!famigliaDellaNota(voce.nome, tabella)) orfane.add(voce.nome);
    }
  }
  assert.deepEqual([...orfane], [], `note senza famiglia: ${[...orfane].join(', ')}`);
});

prova('catalogo vero: la tavolozza ha nove gruppi e nessuno è vuoto', () => {
  const indice = indiceNote(profiliVeri, config);
  assert.equal(indice.gruppi.length, 9, 'i nove gruppi di app/config/ricerca.json');
  for (const gruppo of indice.gruppi) {
    assert.ok(gruppo.quante > 0, `${gruppo.etichetta} non tocca nessuna fragranza`);
    assert.ok(gruppo.note.length >= 4, `${gruppo.etichetta} ha solo ${gruppo.note.length} note da mostrare`);
    assert.ok(gruppo.assaggio.length === 3, `${gruppo.etichetta} non ha tre note da mostrare sotto il titolo`);
  }
  // Ogni accordo della tassonomia sta in un gruppo e in uno solo: nessuna nota
  // del catalogo resta irraggiungibile dalla tavolozza.
  const dentro = indice.gruppi.flatMap((g) => g.famiglie.map((f) => f.chiave));
  assert.equal(new Set(dentro).size, dentro.length, 'una famiglia in due gruppi');
  for (const famiglia of indice.famiglie) {
    assert.ok(dentro.includes(famiglia.chiave), `la famiglia ${famiglia.chiave} non sta in nessun gruppo`);
  }
});

prova('catalogo vero: le note oltre la dozzina restano raggiungibili dal cassetto', () => {
  const indice = indiceNote(profiliVeri, config);
  for (const gruppo of indice.gruppi) {
    assert.ok(gruppo.tutte.length >= gruppo.note.length, `${gruppo.etichetta}: "tutte" deve contenere le mostrate`);
    assert.equal(gruppo.altre, gruppo.tutte.length - gruppo.note.length);
    // Quelle sotto minimoOccorrenze restano fuori anche da "tutte": sono le rare,
    // che si cercano ma non si mostrano.
    assert.ok(gruppo.tutte.every((n) => n.quante >= config.ricerca.minimoOccorrenze));
  }
  const fiori = indice.gruppi.find((g) => g.chiave === 'fiori');
  assert.ok(fiori.tutte.length > fiori.note.length, 'nei fiori ce n\'è più di una dozzina');
  assert.ok(fiori.rare > 0, 'e ci sono anche le rare, contate a parte');
});

prova('catalogo vero: nessuna famiglia della tavolozza resta senza note da mostrare', () => {
  const indice = indiceNote(profiliVeri, config);
  const vuote = indice.famiglie.filter((f) => !f.note.length).map((f) => f.chiave);
  assert.deepEqual(vuote, [], `famiglie senza note: ${vuote.join(', ')}`);
  assert.ok(indice.famiglie.length >= 20, 'la tavolozza deve restare ricca');
});

prova('catalogo vero: le ricerche tipiche trovano qualcosa di sensato', () => {
  const cuoio = cerca({ note: ['cuoio'] }, profiliVeri, config);
  assert.ok(cuoio.pieni >= 20, `cuoio in piramide: ${cuoio.pieni}`);
  assert.ok(cuoio.risultati[0].trovate.some((t) => t.tipo === 'nota'));
  const raro = cerca({ accordi: ['tabacco'] }, profiliVeri, config);
  assert.ok(raro.risultati.length > 0, 'anche una famiglia rara deve dare qualcosa');
  const due = cerca({ accordi: ['legnoso', 'speziato'] }, profiliVeri, config);
  assert.ok(due.pieni >= 10 && due.risultati.length > due.pieni, 'piene davanti, somiglianti dietro');
});

prova('catalogo vero: dal risultato esce un codice a tre cifre, niente altro che lo identifichi', () => {
  const esito = cerca({ note: ['vaniglia'] }, profiliVeri, config);
  for (const r of esito.risultati.slice(0, 30)) {
    assert.match(String(r.codice), /^\d{3}$/);
    // Quello che la scheda mostra: codice, famiglia, note della piramide, descrizione.
    // Nessun campo del profilo porta un nome commerciale (guardia vera: scripts/controlla_nomi.mjs).
    assert.equal(r.profilo.nome, undefined);
    assert.equal(r.profilo.brand, undefined);
    for (const riga of piramide(r.profilo, { note: ['vaniglia'] }, config)) {
      for (const n of riga.note) assert.equal(typeof n.nome, 'string');
    }
  }
});

// ------------------------------------------------------------------ esito

console.log(`\n${passate} prove passate, ${fallite.length} fallite.`);
if (fallite.length) process.exit(1);

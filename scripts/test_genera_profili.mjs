// Prove della mappatura note → accordi e della costruzione dei profili dalle
// piramidi del fornitore (app/config/note.json + scripts/genera_profili.mjs).
// Le schede di prova sono inventate, così restano stabili quando il personale
// corregge le card vere; la tabella invece è quella vera di app/config.
//
//   node scripts/test_genera_profili.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  normalizzaNota, scriviNota, tabelleDa, accordiDa, attributiDa, stagioniDa,
  occasioniDa, caratteriDa, famigliaDa, descrizioneDa, profiloDa,
} from './genera_profili.mjs';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const configNote = leggi('app/config/note.json');
const tassonomia = leggi('app/config/accordi.json');
const tabelle = tabelleDa(configNote);
const ACCORDI = new Set(tassonomia.accordi.map((a) => a.chiave));
const FAMIGLIE = new Set(tassonomia.famiglie.map((f) => f.chiave));

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

function card(codice, famiglia, testa, cuore, fondo, categoria = 'UOMO') {
  return { codice, categoria, famiglia, testa, cuore, fondo };
}

const AGRUMATA = card('101', ['AGRUMATO', 'AROMATICO'], ['LIMONE', 'BERGAMOTTO'], ['LAVANDA'], ['MUSCHIO BIANCO']);
const GOLOSA = card('102', ['ORIENTALE', 'GOURMAND'], ['PERA'], ['CARAMELLO', 'CIOCCOLATO'], ['VANIGLIA', 'ZUCCHERO']);
const MARINA = card('103', ['AGRUMATO', 'ACQUATICO'], ['NOTE MARINE', 'POMPELMO'], ['NOTE VERDI'], ['MUSCHIO BIANCO']);
const ORIENTALE = card('104', ['ORIENTALE', 'SPEZIATO'], ['PEPE NERO'], ['INCENSO', 'LEGNO DI AGAR'], ['AMBRA', 'CUOIO'], 'NICCHIA');

// ------------------------------------------------------------- normalizzazione

prova('il confronto ignora maiuscole, accenti e apostrofi', () => {
  assert.equal(normalizzaNota('CAFFE’'), 'caffe');
  assert.equal(normalizzaNota('Caffè'), 'caffe');
  assert.equal(normalizzaNota('  FIORE  D’ARANCIO '), 'fiore darancio');
});

prova('le storpiature della card si raddrizzano solo quando si scrive', () => {
  assert.equal(scriviNota('MUSCIHO BIANCO', tabelle), 'muschio bianco');
  assert.equal(scriviNota('CAFFE’', tabelle), 'caffè');
  assert.equal(scriviNota('PEP ROSA', tabelle), 'pepe rosa');
  assert.equal(scriviNota('BERGAMOTTO', tabelle), 'bergamotto');
});

prova('la tabella conosce ogni nota delle piramidi in archivio', () => {
  const piramidi = leggi('dati/piramidi.json');
  const mancanti = new Set();
  for (const scheda of piramidi) {
    for (const livello of ['testa', 'cuore', 'fondo']) {
      for (const nota of scheda[livello] || []) {
        if (!tabelle.note.has(normalizzaNota(nota))) mancanti.add(nota);
      }
    }
  }
  assert.equal(mancanti.size, 0, `da aggiungere ad app/config/note.json: ${[...mancanti].join(', ')}`);
});

prova('la tabella usa solo accordi della tassonomia', () => {
  for (const [nota, accordi] of Object.entries(configNote.note)) {
    if (nota.startsWith('_')) continue;
    for (const [chiave, valore] of Object.entries(accordi)) {
      assert.ok(ACCORDI.has(chiave), `"${nota}": accordo sconosciuto "${chiave}"`);
      assert.ok(valore > 0 && valore <= 1, `"${nota}": peso ${valore} fuori da 0-1`);
    }
  }
  for (const [parola, famiglia] of Object.entries(configNote.famiglie)) {
    if (parola.startsWith('_')) continue;
    assert.ok(FAMIGLIE.has(famiglia), `"${parola}": famiglia sconosciuta "${famiglia}"`);
  }
  for (const [parola, accordi] of Object.entries(configNote.accordiFamiglia)) {
    if (parola.startsWith('_')) continue;
    for (const chiave of Object.keys(accordi)) assert.ok(ACCORDI.has(chiave), `"${parola}": accordo sconosciuto "${chiave}"`);
  }
});

// ------------------------------------------------------------------ accordi

prova('una card agrumata dà agrumi in testa alla classifica e niente dolce', () => {
  const { accordi } = accordiDa(AGRUMATA, tabelle);
  assert.equal(Math.max(...Object.values(accordi)), 1, 'un accordo deve valere 1');
  assert.ok(accordi.agrumato >= 0.9, `agrumato = ${accordi.agrumato}`);
  assert.ok(!accordi.gourmand && !accordi.vaniglia, 'niente accordi dolci');
});

prova('la famiglia scritta sulla card entra negli accordi', () => {
  // La card dice GOURMAND ma in piramide il caramello c'è: l'accordo deve esserci comunque.
  const senzaFamiglia = accordiDa({ ...GOLOSA, famiglia: [] }, tabelle).accordi;
  const conFamiglia = accordiDa(GOLOSA, tabelle).accordi;
  assert.ok(conFamiglia.gourmand >= senzaFamiglia.gourmand);
  const soloFamiglia = accordiDa(card('105', ['ORIENTALE', 'VANIGLIATO'], ['PERA'], ['MELA'], ['MUSCHIO']), tabelle).accordi;
  assert.ok(soloFamiglia.vaniglia >= 0.2, 'una ORIENTALE VANIGLIATO deve risultare vanigliata');
});

prova('gli accordi sotto soglia non si scrivono', () => {
  const { accordi } = accordiDa(ORIENTALE, tabelle);
  for (const valore of Object.values(accordi)) assert.ok(valore >= 0.2, `valore ${valore} sotto soglia`);
});

// --------------------------------------------------------------- attributi

prova('il goloso è dolce e per niente fresco, l\'agrumato il contrario', () => {
  const golosa = accordiDa(GOLOSA, tabelle);
  const dolce = attributiDa(golosa.accordi, golosa.fondo);
  assert.ok(dolce.dolcezza >= 4, `dolcezza ${dolce.dolcezza}`);
  assert.ok(dolce.freschezza <= 2, `freschezza ${dolce.freschezza}`);

  const agrumata = accordiDa(AGRUMATA, tabelle);
  const fresca = attributiDa(agrumata.accordi, agrumata.fondo);
  assert.ok(fresca.freschezza >= 4, `freschezza ${fresca.freschezza}`);
  assert.ok(fresca.dolcezza <= 2, `dolcezza ${fresca.dolcezza}`);
});

prova('oud, incenso e cuoio fanno una fragranza importante', () => {
  const { accordi, fondo } = accordiDa(ORIENTALE, tabelle);
  const attributi = attributiDa(accordi, fondo);
  assert.ok(attributi.intensita >= 4, `intensità ${attributi.intensita}`);
  assert.ok(attributi.persistenza >= 4, `persistenza ${attributi.persistenza}`);
});

prova('un fondo leggero non diventa eterno', () => {
  const leggera = accordiDa(card('106', ['AGRUMATO'], ['LIMONE'], ['NOTE VERDI'], ['MUSCHIO BIANCO']), tabelle);
  const attributi = attributiDa(leggera.accordi, leggera.fondo);
  assert.ok(attributi.persistenza <= 3, `persistenza ${attributi.persistenza}`);
});

prova('gli attributi restano nella scala 1-5', () => {
  for (const scheda of [AGRUMATA, GOLOSA, MARINA, ORIENTALE]) {
    const { accordi, fondo } = accordiDa(scheda, tabelle);
    for (const valore of Object.values(attributiDa(accordi, fondo))) {
      assert.ok(Number.isInteger(valore) && valore >= 1 && valore <= 5, `valore ${valore}`);
    }
  }
});

// ------------------------------------------------ stagioni, occasioni, carattere

prova('la marina è da estate, l\'orientale da inverno', () => {
  const marina = stagioniDa(accordiDa(MARINA, tabelle).accordi);
  assert.ok(marina.estate > marina.inverno, JSON.stringify(marina));
  const orientale = stagioniDa(accordiDa(ORIENTALE, tabelle).accordi);
  assert.ok(orientale.inverno > orientale.estate, JSON.stringify(orientale));
});

prova('in ufficio non finisce né il goloso né l\'oud', () => {
  const golosa = accordiDa(GOLOSA, tabelle);
  const occasioniGolosa = occasioniDa(golosa.accordi, attributiDa(golosa.accordi, golosa.fondo), 'DONNA');
  assert.ok(!occasioniGolosa.includes('ufficio'), occasioniGolosa.join(','));

  const orientale = accordiDa(ORIENTALE, tabelle);
  const occasioniOrientale = occasioniDa(orientale.accordi, attributiDa(orientale.accordi, orientale.fondo), 'NICCHIA');
  assert.ok(!occasioniOrientale.includes('ufficio'), occasioniOrientale.join(','));
  assert.ok(occasioniOrientale.includes('serata'), occasioniOrientale.join(','));
});

prova('il carattere sono due o tre aggettivi dell\'elenco', () => {
  const ammessi = new Set(['energico', 'calmo', 'sensuale', 'elegante', 'audace', 'coccola',
    'misterioso', 'allegro', 'romantico', 'sicuro', 'fresco']);
  for (const scheda of [AGRUMATA, GOLOSA, MARINA, ORIENTALE]) {
    const { accordi, fondo } = accordiDa(scheda, tabelle);
    const carattere = caratteriDa(accordi, attributiDa(accordi, fondo));
    assert.ok(carattere.length >= 2 && carattere.length <= 3, carattere.join(','));
    assert.equal(new Set(carattere).size, carattere.length, 'aggettivi ripetuti');
    for (const aggettivo of carattere) assert.ok(ammessi.has(aggettivo), `"${aggettivo}" non è dell'elenco`);
  }
});

// ------------------------------------------------------- famiglia e descrizione

prova('la famiglia viene dalla card, con gli scavalcamenti giusti', () => {
  const golosa = accordiDa(GOLOSA, tabelle).accordi;
  assert.equal(famigliaDa(GOLOSA, golosa, tabelle), 'gourmand');
  const agrumata = accordiDa(AGRUMATA, tabelle).accordi;
  assert.equal(famigliaDa(AGRUMATA, agrumata, tabelle), 'agrumato');
  const marina = accordiDa(MARINA, tabelle).accordi;
  assert.equal(famigliaDa(MARINA, marina, tabelle), 'acquatico');
  const fiorita = card('107', ['FLOREALE', 'FRUTTATO'], ['PERA'], ['PEONIA'], ['MUSCHIO']);
  assert.equal(famigliaDa(fiorita, accordiDa(fiorita, tabelle).accordi, tabelle), 'fruttato-floreale');
  for (const scheda of [AGRUMATA, GOLOSA, MARINA, ORIENTALE]) {
    assert.ok(FAMIGLIE.has(famigliaDa(scheda, accordiDa(scheda, tabelle).accordi, tabelle)));
  }
});

prova('la descrizione dice la piramide a parole, entro 140 caratteri', () => {
  const testo = descrizioneDa(AGRUMATA, tabelle);
  assert.ok(testo.length <= 140, `${testo.length} caratteri`);
  assert.ok(/limone/.test(testo) && /lavanda/.test(testo), testo);
  assert.ok(!/\d/.test(testo), 'niente numeri nella descrizione');
  const lunga = card('108', ['ORIENTALE'],
    ['bergamotto di calabria', 'mandarino di sicilia', 'fiore d’arancio'],
    ['gelsomino sambac', 'rosa di damasco', 'legno di cachemire'],
    ['muschio di quercia', 'fava tonka', 'legno di guaiaco']);
  assert.ok(descrizioneDa(lunga, tabelle).length <= 140);
});

// -------------------------------------------------------------- profilo intero

prova('il profilo ha tutti i campi dello schema e il genere si eredita', () => {
  const { profilo } = profiloDa(ORIENTALE, tabelle, { codice: '104', genere: 'donna', noteStaff: 'da riprovare' });
  for (const campo of ['codice', 'genere', 'famiglia', 'sottofamiglia', 'testa', 'cuore', 'fondo',
    'accordi', 'intensita', 'persistenza', 'dolcezza', 'freschezza', 'stagioni', 'momento',
    'occasioni', 'carattere', 'descrizione', 'confidenza']) {
    assert.ok(profilo[campo] !== undefined, `manca ${campo}`);
  }
  assert.equal(profilo.genere, 'donna', 'il genere del profilo precedente vince: la card non lo dice');
  assert.equal(profilo.noteStaff, 'da riprovare', 'le note del personale non si perdono');
  assert.equal(profilo.confidenza, 'alta');
  assert.equal(profilo.sottofamiglia, 'orientale speziato');
  assert.deepEqual(profilo.testa, ['pepe nero']);
});

prova('senza profilo precedente il genere lo dà la categoria di listino', () => {
  assert.equal(profiloDa(AGRUMATA, tabelle, null).profilo.genere, 'uomo');
  assert.equal(profiloDa({ ...AGRUMATA, categoria: 'DONNA' }, tabelle, null).profilo.genere, 'donna');
  assert.equal(profiloDa({ ...AGRUMATA, categoria: 'NICCHIA PREMIUM' }, tabelle, null).profilo.genere, 'unisex');
});

prova('i profili in archivio rispettano quello che promette il generatore', () => {
  const profili = leggi('dati/profili.json');
  const daCard = profili.filter((p) => p.confidenza === 'alta');
  assert.ok(daCard.length > 300, `solo ${daCard.length} profili da card`);
  for (const p of profili) {
    const valori = Object.values(p.accordi);
    assert.ok(valori.length, `${p.codice}: nessun accordo`);
    assert.ok(Math.max(...valori) >= 0.8, `${p.codice}: nessun accordo dominante`);
    assert.ok(p.descrizione.length <= 140, `${p.codice}: descrizione lunga`);
    assert.ok(FAMIGLIE.has(p.famiglia), `${p.codice}: famiglia "${p.famiglia}"`);
  }
});

console.log(`\n${passate} passate, ${fallite.length} fallite\n`);
if (fallite.length) {
  for (const f of fallite) console.error(f.errore);
  process.exit(1);
}

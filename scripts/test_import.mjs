// Prove sull'import del catalogo: le forme di file che arrivano davvero dal
// gestionale e la garanzia che nome, brand, fornitori e costi non passino mai.
//
//   node scripts/test_import.mjs

import assert from 'node:assert/strict';
import { leggiCatalogo, ripulisciCatalogo, categoriaDaCodice } from '../app/js/dati.js';

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

// Com'è fatto davvero un backup del gestionale: lo stato intero, con le
// referenze in `fragranze` (un oggetto indicizzato per codice) e le categorie
// numerate per tenerle in ordine.
const backupGestionale = {
  versione: 1,
  creato: '2026-09-14T22:28:00.000Z',
  fragranze: {
    '018': {
      codice: '018', brand: 'MARCA', nome: 'MARCA - NOME COMMERCIALE', categoria: '01 UOMO',
      varianti: [], soglia: 100, fornitore: 'XY', codiciFornitore: { XY: 'A-1' },
      costo: 12.5, attivo: true, note: 'nota interna del magazzino',
    },
    '240': { codice: '240', brand: 'MARCA', nome: 'ALTRO NOME', categoria: '02 DONNA', attivo: false, costo: 9 },
    '560': { codice: '560', brand: 'MARCA', nome: 'TERZO NOME', categoria: '03 NICCHIA', attivo: true, costo: 30 },
    '815': { codice: '815', brand: 'MARCA', nome: 'QUARTO NOME', categoria: '04 PREMIUM', attivo: true, costo: 40 },
    OLIBANO: { codice: 'OLIBANO', nome: 'OLIBANO', categoria: '03 NICCHIA', attivo: true },
  },
  movimenti: [{ id: 'm1', codice: '018', ml: 100 }],
  ordini: [], fornitori: [{ sigla: 'XY', nome: 'Fornitore' }],
  soglie: {}, obiettivi: {}, lotti: [], trasferimenti: [], chiaviVendite: {}, piano: {},
};

console.log('\nImport del catalogo\n');

prova('legge un backup del gestionale (referenze in `fragranze`, non in un array)', () => {
  const { referenze, origine, scartate } = leggiCatalogo(backupGestionale);
  assert.equal(origine, 'backup del gestionale');
  assert.deepEqual(referenze.map((r) => r.codice), ['018', '240', '560', '815']);
  assert.equal(scartate, 1, 'OLIBANO non ha un codice a tre cifre e resta fuori');
});

prova('le categorie numerate del gestionale diventano quelle del consulente', () => {
  const { referenze } = leggiCatalogo(backupGestionale);
  assert.deepEqual(referenze.map((r) => r.categoria), ['UOMO', 'DONNA', 'NICCHIA', 'PREMIUM']);
});

prova('lo stato attivo arriva intatto: è il motivo per cui si importa', () => {
  const { referenze } = leggiCatalogo(backupGestionale);
  assert.deepEqual(referenze.map((r) => r.attivo), [true, false, true, true]);
});

prova('nome, brand, fornitori, costi e note non passano mai', () => {
  const { referenze } = leggiCatalogo(backupGestionale);
  for (const voce of referenze) {
    assert.deepEqual(Object.keys(voce).sort(), ['attivo', 'categoria', 'codice']);
  }
  const testo = JSON.stringify(referenze).toUpperCase();
  for (const parola of ['MARCA', 'NOME', 'FORNITORE', 'COSTO', 'NOTA', 'XY']) {
    assert.ok(!testo.includes(parola), `"${parola}" è finito nel catalogo ripulito`);
  }
});

prova('va bene anche un semplice array di referenze', () => {
  const { referenze, origine } = leggiCatalogo([
    { codice: '001', categoria: 'UOMO', attivo: true },
    { codice: '002', categoria: 'UOMO', attivo: false },
  ]);
  assert.equal(origine, 'elenco di referenze');
  assert.equal(referenze.length, 2);
});

prova('va bene un export del catalogo e un backup del consulente', () => {
  const dentro = [{ codice: '001', categoria: 'UOMO', attivo: true }];
  assert.equal(leggiCatalogo({ catalogo: dentro }).origine, 'export del catalogo');
  assert.equal(leggiCatalogo({ stato: { catalogo: dentro } }).referenze.length, 1);
});

prova('i codici si normalizzano a tre cifre e i doppioni si scartano', () => {
  const { referenze, scartate } = leggiCatalogo([
    { codice: 18, categoria: 'UOMO' },
    { codice: '18', categoria: 'UOMO' },
    { codice: '7', categoria: 'UOMO' },
  ]);
  assert.deepEqual(referenze.map((r) => r.codice), ['007', '018']);
  assert.equal(scartate, 1);
});

prova('senza categoria valida la ricava dal codice', () => {
  const { referenze } = leggiCatalogo([
    { codice: '150', categoria: 'boh' },
    { codice: '350' },
    { codice: '650', categoria: '' },
    { codice: '950', categoria: null },
  ]);
  assert.deepEqual(referenze.map((r) => r.categoria), ['UOMO', 'DONNA', 'NICCHIA', 'PREMIUM']);
  assert.equal(categoriaDaCodice('199'), 'UOMO');
  assert.equal(categoriaDaCodice('200'), 'DONNA');
});

prova('senza il campo attivo la referenza si considera attiva', () => {
  const { referenze } = leggiCatalogo([{ codice: '001', categoria: 'UOMO' }]);
  assert.equal(referenze[0].attivo, true);
});

prova('un file che non c\'entra niente dice perché non va', () => {
  for (const sbagliato of [{ ciao: 1 }, 'testo', 42, null, { fragranze: {} }]) {
    assert.throws(() => leggiCatalogo(sbagliato), /referenze|codice/);
  }
});

prova('ripulisciCatalogo resta la scorciatoia che restituisce solo l\'elenco', () => {
  const elenco = ripulisciCatalogo(backupGestionale);
  assert.ok(Array.isArray(elenco));
  assert.equal(elenco.length, 4);
});

console.log(`\n${passate} passate, ${fallite.length} fallite\n`);
if (fallite.length) {
  for (const f of fallite) console.error(f.errore);
  process.exit(1);
}

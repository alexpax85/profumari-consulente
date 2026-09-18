// Prove sull'import del catalogo: le forme di file che arrivano davvero dal
// gestionale e la garanzia che nome, brand, fornitori e costi non passino mai.
//
//   node scripts/test_import.mjs

import assert from 'node:assert/strict';
import {
  leggiCatalogo, ripulisciCatalogo, categoriaDaCodice,
  aggiornaProfili, aggiornaDomande, aggiornaConfig, ripristinaConfig, domandeProprie, VERSIONE_DATI,
} from '../app/js/dati.js';
import { store } from '../app/js/store-locale.js';

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


// ------------------------------- la base dei profili avanza sui dispositivi in uso

const scheda = (codice, extra = {}) => ({ codice, famiglia: 'legnoso', descrizione: `scheda ${codice}`, ...extra });

prova('i profili di fabbrica nuovi sostituiscono quelli vecchi sul dispositivo', () => {
  const esito = aggiornaProfili([scheda('001', { descrizione: 'vecchia' })], [scheda('001', { descrizione: 'nuova' })]);
  assert.equal(esito.profili.length, 1);
  assert.equal(esito.profili[0].descrizione, 'nuova');
  assert.equal(esito.sostituiti, 1);
});

prova('una scheda confermata dal personale non si tocca', () => {
  const confermata = scheda('002', { descrizione: 'confermata dal banco', rivisto: '2026-09-17' });
  const esito = aggiornaProfili([confermata], [scheda('002', { descrizione: 'di fabbrica' })]);
  assert.equal(esito.profili[0].descrizione, 'confermata dal banco');
  assert.equal(esito.confermati, 1);
  assert.equal(esito.sostituiti, 0);
});

prova('le note interne si riportano sulla scheda nuova', () => {
  const esito = aggiornaProfili([scheda('003', { noteStaff: 'troppo dolce, dicono i clienti' })], [scheda('003')]);
  assert.equal(esito.profili[0].noteStaff, 'troppo dolce, dicono i clienti');
  assert.equal(esito.profili[0].descrizione, 'scheda 003');
});

prova('i profili scritti solo sul dispositivo restano, e i codici nuovi entrano', () => {
  const esito = aggiornaProfili([scheda('900', { descrizione: 'aggiunta dal backoffice' })], [scheda('001'), scheda('002')]);
  assert.deepEqual(esito.profili.map((p) => p.codice), ['001', '002', '900']);
  assert.equal(esito.nuovi, 2);
  assert.equal(esito.propri, 1);
});

prova('la versione dei dati di fabbrica è un numero che sale', () => {
  assert.ok(Number.isInteger(VERSIONE_DATI) && VERSIONE_DATI >= 2, `VERSIONE_DATI = ${VERSIONE_DATI}`);
});


// ------------------------------ la configurazione nuova raggiunge i dispositivi

const domanda = (id, extra = {}) => ({ id, tipo: 'singola', peso: 1, titolo: `Domanda ${id}`, opzioni: [], ...extra });

prova('una domanda nuova di fabbrica arriva sul dispositivo, al posto giusto', () => {
  const esito = aggiornaDomande([domanda('a'), domanda('c')], [domanda('a'), domanda('b'), domanda('c')]);
  assert.deepEqual(esito.domande.map((d) => d.id), ['a', 'b', 'c']);
  assert.equal(esito.nuove, 1);
});

prova('peso e interruttore del negozio sopravvivono al riallineamento', () => {
  const sulDispositivo = [domanda('a', { peso: 0.2, attiva: false, titolo: 'vecchio titolo' })];
  const diFabbrica = [domanda('a', { peso: 1, titolo: 'titolo nuovo' })];
  const esito = aggiornaDomande(sulDispositivo, diFabbrica);
  assert.equal(esito.domande[0].titolo, 'titolo nuovo', 'il testo si riallinea al file');
  assert.equal(esito.domande[0].peso, 0.2, 'il peso è taratura del negozio');
  assert.equal(esito.domande[0].attiva, false, 'anche l\'interruttore');
});

prova('una domanda modificata dal backoffice non viene riscritta', () => {
  const sulDispositivo = [domanda('a', { titolo: 'come l\'ha scritta il negozio', toccata: true })];
  const esito = aggiornaDomande(sulDispositivo, [domanda('a', { titolo: 'titolo nuovo' })]);
  assert.equal(esito.domande[0].titolo, 'come l\'ha scritta il negozio');
});

prova('le domande scritte dal negozio restano, quelle cancellate non tornano', () => {
  const esito = aggiornaDomande([domanda('sua')], [domanda('a'), domanda('b')], ['b']);
  assert.deepEqual(esito.domande.map((d) => d.id).sort(), ['a', 'sua']);
});

prova('aggiornaConfig aggiunge frasi, testi, pesi e accordi mancanti senza toccare i tuoi', () => {
  const salvata = {
    domande: { domande: [domanda('a', { peso: 0.5 })] },
    frasi: { accordiDue: ['la tua frase'] },
    testi: { attesa: { titolo: 'Il tuo titolo' } },
    pesi: { coseno: 0.9 },
    accordi: { accordi: [{ chiave: 'agrumato' }], famiglie: [{ chiave: 'agrumato' }] },
  };
  const difetto = {
    domande: { domande: [domanda('a'), domanda('b')] },
    frasi: { accordiDue: ['frase di fabbrica'], accordoUno: ['frase nuova'] },
    testi: { attesa: { titolo: 'Titolo di fabbrica', sottotitolo: 'Sottotitolo nuovo' } },
    pesi: { coseno: 0.6, carattere: 0.05 },
    accordi: { accordi: [{ chiave: 'agrumato' }, { chiave: 'oud' }], famiglie: [{ chiave: 'agrumato' }, { chiave: 'chypre' }] },
  };
  const esito = aggiornaConfig(salvata, difetto);
  assert.deepEqual(esito.config.frasi.accordiDue, ['la tua frase'], 'le frasi del negozio restano');
  assert.deepEqual(esito.config.frasi.accordoUno, ['frase nuova'], 'quelle nuove arrivano');
  assert.equal(esito.config.testi.attesa.titolo, 'Il tuo titolo');
  assert.equal(esito.config.testi.attesa.sottotitolo, 'Sottotitolo nuovo');
  assert.equal(esito.config.pesi.coseno, 0.9, 'la taratura del punteggio non si tocca');
  assert.equal(esito.config.pesi.carattere, 0.05, 'i coefficienti nuovi arrivano');
  assert.deepEqual(esito.config.accordi.accordi.map((a) => a.chiave), ['agrumato', 'oud']);
  assert.deepEqual(esito.config.accordi.famiglie.map((f) => f.chiave), ['agrumato', 'chypre']);
  assert.deepEqual(esito.config.domande.domande.map((d) => d.id), ['a', 'b']);
  assert.equal(esito.config.domande.domande[0].peso, 0.5);
  assert.ok(esito.novita > 0);
});

prova('senza niente di nuovo, aggiornaConfig non segnala novità', () => {
  const config = { domande: { domande: [domanda('a')] }, frasi: {}, testi: {}, pesi: {}, accordi: { accordi: [], famiglie: [] } };
  const esito = aggiornaConfig(structuredClone(config), structuredClone(config));
  assert.equal(esito.novita, 0);
});


// ------------------------------- ripristino di fabbrica e travaso fra banchi

prova('il ripristino riconosce le domande scritte dal negozio', () => {
  const difetto = { domande: { domande: [domanda('a'), domanda('b')] } };
  const salvata = { domande: { domande: [domanda('a', { peso: 0.1 }), domanda('sua')] } };
  assert.deepEqual(domandeProprie(salvata, difetto).map((d) => d.id), ['sua']);
});

prova('"valori consigliati" rimette il file ma può tenere le domande tue', () => {
  const difetto = { domande: { domande: [domanda('a', { peso: 1, titolo: 'Di fabbrica' })] }, pesi: { coseno: 0.6 } };
  const salvata = {
    domande: { domande: [domanda('a', { peso: 0.1, titolo: 'Ritoccata', toccata: true }), domanda('sua')] },
    pesi: { coseno: 0.95 },
  };
  const conLeMie = ripristinaConfig(salvata, difetto, { tieniDomandeMie: true });
  assert.deepEqual(conLeMie.config.domande.domande.map((d) => d.id), ['a', 'sua']);
  assert.equal(conLeMie.config.domande.domande[0].peso, 1, 'la domanda di fabbrica torna com\'era');
  assert.equal(conLeMie.config.pesi.coseno, 0.6, 'anche i coefficienti tornano ai consigliati');
  assert.equal(conLeMie.tenute, 1);

  const pulito = ripristinaConfig(salvata, difetto, { tieniDomandeMie: false });
  assert.deepEqual(pulito.config.domande.domande.map((d) => d.id), ['a']);
  assert.equal(pulito.tenute, 0);
});

prova('il ripristino non lascia legami con la configurazione di prima', () => {
  const difetto = { domande: { domande: [domanda('a')] }, pesi: { coseno: 0.6 } };
  const esito = ripristinaConfig({ domande: { domande: [] } }, difetto, {});
  esito.config.pesi.coseno = 0.1;
  assert.equal(difetto.pesi.coseno, 0.6, 'i valori di fabbrica non si toccano mai');
});

prova('la sola configurazione si esporta e si rilegge, anche da un backup intero', () => {
  const config = { domande: { domande: [domanda('a')] }, pesi: { coseno: 0.6 }, frasi: {}, testi: {} };
  const riletta = store.importaConfig(store.esportaConfig(config));
  assert.deepEqual(riletta.domande.domande.map((d) => d.id), ['a']);

  const backupIntero = JSON.stringify({ tipo: 'profumari-consulente', stato: { catalogo: [], profili: [], config } });
  assert.deepEqual(store.importaConfig(backupIntero).pesi, { coseno: 0.6 });
});

prova('un file senza configurazione dice perché non va', () => {
  assert.throws(() => store.importaConfig('{"tipo":"altro"}'), /configurazione/);
});


prova('quello che arriva dai file non resta legato ai file', () => {
  const difetto = {
    domande: { domande: [domanda('a', { titolo: 'Di fabbrica' })] },
    frasi: { accordiDue: ['frase di fabbrica'] },
    pesi: { coseno: 0.6 },
    accordi: { accordi: [{ chiave: 'agrumato', etichetta: 'agrumi' }], famiglie: [] },
  };
  const impronta = JSON.stringify(difetto);
  const esito = aggiornaConfig({ domande: { domande: [] }, frasi: {}, pesi: {}, accordi: { accordi: [], famiglie: [] } }, difetto);

  // il negozio lavora sulla sua copia…
  esito.config.domande.domande[0].titolo = 'Ritoccata dal negozio';
  esito.config.frasi.accordiDue[0] = 'frase del negozio';
  esito.config.pesi.coseno = 0.95;
  esito.config.accordi.accordi[0].etichetta = 'agrumi del negozio';

  // …e i valori di fabbrica restano quelli, se no "ripristina i consigliati" non ripristina niente
  assert.equal(JSON.stringify(difetto), impronta);
});

prova('anche i profili di fabbrica arrivano come copia', () => {
  const diFabbrica = [scheda('001', { descrizione: 'di fabbrica' })];
  const esito = aggiornaProfili([], diFabbrica);
  esito.profili[0].descrizione = 'ritoccata';
  assert.equal(diFabbrica[0].descrizione, 'di fabbrica');
});

console.log(`\n${passate} passate, ${fallite.length} fallite\n`);
if (fallite.length) {
  for (const f of fallite) console.error(f.errore);
  process.exit(1);
}

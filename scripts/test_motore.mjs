// Prove del motore — i casi elencati in docs/04-motore.md, sezione 5.
// Profili sintetici (non il catalogo reale) così restano stabili quando il
// personale rivede le bozze. La configurazione invece è quella vera di app/config.
//
//   node scripts/test_motore.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  raccomanda, costruisciDesiderato, punteggio, spiega, profiliAttivi, coseno,
} from '../app/js/motore.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  domande: leggi('app/config/domande.json'),
  pesi: leggi('app/config/pesi.json'),
  frasi: leggi('app/config/frasi.json'),
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

// Un catalogo sintetico con una fragranza per famiglia, più qualche doppione.
const CATALOGO = [
  profilo('101', { famiglia: 'acquatico', sottofamiglia: 'acquatico agrumato', genere: 'uomo',
    accordi: { acquatico: 0.9, agrumato: 0.6, muschiato: 0.4 },
    freschezza: 5, intensita: 2, dolcezza: 1,
    stagioni: { primavera: 0.8, estate: 1, autunno: 0.4, inverno: 0.2 },
    occasioni: ['quotidiano', 'ufficio', 'sport'], carattere: ['fresco', 'energico'] }),
  profilo('102', { famiglia: 'agrumato', sottofamiglia: 'agrumato aromatico',
    accordi: { agrumato: 0.9, aromatico: 0.5, verde: 0.3 },
    freschezza: 5, intensita: 2, dolcezza: 1,
    occasioni: ['quotidiano', 'ufficio'], carattere: ['fresco', 'energico'] }),
  profilo('103', { famiglia: 'gourmand', sottofamiglia: 'gourmand vaniglia', genere: 'donna',
    accordi: { gourmand: 1, vaniglia: 0.8, miele: 0.3 },
    dolcezza: 5, intensita: 4, freschezza: 1,
    occasioni: ['serata'], carattere: ['coccola', 'sensuale'] }),
  profilo('104', { famiglia: 'legnoso', sottofamiglia: 'legnoso speziato', genere: 'uomo',
    accordi: { legnoso: 0.8, speziato: 0.6, ambrato: 0.4 },
    intensita: 4, persistenza: 4, freschezza: 2,
    occasioni: ['serata', 'ufficio'], carattere: ['sicuro', 'elegante'] }),
  profilo('105', { famiglia: 'floreale', sottofamiglia: 'floreale bianco', genere: 'donna',
    accordi: { 'floreale-bianco': 0.9, rosa: 0.4, muschiato: 0.3 },
    dolcezza: 3, freschezza: 3, occasioni: ['romantico'], carattere: ['romantico', 'sensuale'] }),
  profilo('106', { famiglia: 'gourmand', sottofamiglia: 'gourmand caffè',
    accordi: { gourmand: 0.9, vaniglia: 0.5, legnoso: 0.3 },
    dolcezza: 5, intensita: 3, occasioni: ['serata'], carattere: ['coccola'] }),
  profilo('107', { famiglia: 'ambrato', sottofamiglia: 'ambrato speziato',
    accordi: { ambrato: 0.9, speziato: 0.5, vaniglia: 0.4 },
    intensita: 5, persistenza: 5, dolcezza: 4, freschezza: 1,
    stagioni: { primavera: 0.3, estate: 0.2, autunno: 0.8, inverno: 1 },
    occasioni: ['serata', 'speciale'], carattere: ['sensuale', 'audace'] }),
  profilo('108', { famiglia: 'fougère', sottofamiglia: 'fougère classico', genere: 'uomo',
    accordi: { aromatico: 0.9, muschiato: 0.5, legnoso: 0.4 },
    freschezza: 4, intensita: 3, occasioni: ['quotidiano', 'ufficio'], carattere: ['fresco', 'sicuro'] }),
  profilo('109', { famiglia: 'cipriato', sottofamiglia: 'cipriato iris', genere: 'donna',
    accordi: { cipriato: 0.9, rosa: 0.3, muschiato: 0.4 },
    dolcezza: 2, freschezza: 2, occasioni: ['ufficio'], carattere: ['elegante', 'calmo'] }),
  profilo('110', { famiglia: 'cuoio', sottofamiglia: 'cuoio incenso',
    accordi: { cuoio: 0.9, incenso: 0.6, tabacco: 0.4 },
    intensita: 5, freschezza: 1, occasioni: ['serata'], carattere: ['misterioso', 'audace'] }),
];

const perCodice = (codice) => CATALOGO.find((p) => p.codice === codice);
const codici = (esito) => esito.proposte.map((p) => p.codice);

console.log('\nMotore — casi di docs/04-motore.md\n');

// 1 · Mare, fresco, ufficio, per lui
prova('1 · mare + ufficio + per lui: in testa il fresco, niente dolci in rosa', () => {
  const esito = raccomanda({
    per_chi: 'me', genere: 'lui', luogo: ['mare'], occasione: ['ufficio'], intensita: 2,
  }, CATALOGO, config);

  assert.equal(esito.proposte.length, 3, 'servono tre proposte');
  const primo = perCodice(esito.proposte[0].codice);
  const dominante = Object.entries(primo.accordi).sort((a, b) => b[1] - a[1])[0][0];
  assert.ok(['acquatico', 'agrumato'].includes(dominante),
    `il primo proposto ha come accordo dominante ${dominante}`);
  for (const proposta of esito.proposte) {
    const gourmand = perCodice(proposta.codice).accordi.gourmand || 0;
    assert.ok(gourmand <= 0.3, `${proposta.codice} ha gourmand ${gourmand}`);
  }
  assert.equal(esito.desiderato.filtri.genere, 'uomo');
});

// 2 · Esclusione "troppo dolce"
prova('2 · "troppo dolce" toglie dalla rosa il profilo gourmand, anche se è il più simile', () => {
  const senzaVeto = raccomanda({ luogo: ['pasticceria'] }, CATALOGO, config);
  assert.equal(senzaVeto.proposte[0].codice, '103', 'senza veto vince il gourmand puro');

  const conVeto = raccomanda({ luogo: ['pasticceria'], esclusioni: ['dolce'] }, CATALOGO, config);
  assert.ok(!codici(conVeto).includes('103'), 'il gourmand non deve stare nei tre');
  assert.ok(!codici(conVeto).includes('106'), 'nemmeno l\'altro gourmand');
  assert.notEqual(conVeto.riserva && conVeto.riserva.codice, '103', 'e nemmeno in riserva');
  assert.equal(conVeto.proposte.length, 3, 'il motore propone comunque tre alternative');
});

// 3 · Filtro genere "per lei"
prova('3 · "per lei": nessun profilo da uomo, gli unisex restano', () => {
  const esito = raccomanda({ per_chi: 'me', genere: 'lei', luogo: ['giardino'] }, CATALOGO, config);
  for (const proposta of esito.proposte) {
    assert.notEqual(perCodice(proposta.codice).genere, 'uomo', `${proposta.codice} è da uomo`);
  }
  const tuttiDonna = raccomanda({ genere: 'lei' }, CATALOGO, config, { n: 8 });
  assert.ok(codici(tuttiDonna).some((c) => perCodice(c).genere === 'unisex'),
    'gli unisex devono poter uscire');
});

// 4 · Diversità
prova('4 · quattro quasi gemelli e un quinto diverso: il quinto entra nei tre', () => {
  const gemelli = ['201', '202', '203', '204'].map((codice, i) => profilo(codice, {
    famiglia: 'acquatico', sottofamiglia: 'acquatico agrumato',
    accordi: { acquatico: 0.9 - i * 0.02, agrumato: 0.6, muschiato: 0.4 },
    freschezza: 5, intensita: 2,
  }));
  const diverso = profilo('205', {
    famiglia: 'legnoso', sottofamiglia: 'legnoso secco',
    accordi: { legnoso: 0.8, patchouli: 0.4 }, freschezza: 2, intensita: 4,
  });
  const esito = raccomanda({ luogo: ['mare'] }, [...gemelli, diverso], config);
  assert.equal(esito.proposte.length, 3);
  assert.ok(codici(esito).includes('205'), `i tre sono ${codici(esito).join(', ')}`);
  assert.ok(codici(esito).includes('201'), 'il migliore resta il primo');
  assert.ok(esito.allargato, 'la schermata deve poter dire che abbiamo cercato più in largo');
});

// 5 · Scelta multipla
prova('5 · tre luoghi pesano quanto un luogo solo', () => {
  const uno = costruisciDesiderato({ luogo: ['mare'] }, config);
  const tre = costruisciDesiderato({ luogo: ['mare', 'agrumeto', 'bosco'] }, config);
  const massa = (d) => Object.values(d.accordi).reduce((s, v) => s + v, 0);

  const domanda = config.domande.domande.find((d) => d.id === 'luogo');
  const sommaOpzione = (id) => Object.values(domanda.opzioni.find((o) => o.id === id).accordi)
    .reduce((s, v) => s + v, 0);
  const attesa = domanda.peso * (sommaOpzione('mare') + sommaOpzione('agrumeto') + sommaOpzione('bosco')) / 3;

  assert.ok(Math.abs(massa(tre) - attesa) < 1e-9, 'la scelta multipla fa la media, non la somma');
  assert.ok(massa(tre) <= massa(uno) * 1.2, `tre luoghi: massa ${massa(tre).toFixed(2)} contro ${massa(uno).toFixed(2)}`);
  assert.ok(massa(tre) >= massa(uno) * 0.5, 'ma non deve neanche svanire');
});

// 5b · le esclusioni invece non si dividono: ognuna è un veto a sé
prova('5b · tre esclusioni restano tre veti pieni', () => {
  const una = costruisciDesiderato({ esclusioni: ['dolce'] }, config);
  const tre = costruisciDesiderato({ esclusioni: ['dolce', 'fiori', 'fumo'] }, config);
  assert.equal(tre.esclusioni.gourmand, una.esclusioni.gourmand);
  assert.equal(tre.esclusioni.gourmand, 1);
  assert.equal(tre.esclusioni.incenso, 1);
});

// 6 · Nessuna risposta utile
prova('6 · senza risposte utili: tre famiglie diverse, niente errori', () => {
  const esito = raccomanda({ per_chi: 'me', genere: 'libero' }, CATALOGO, config);
  assert.equal(esito.proposte.length, 3);
  assert.ok(esito.desiderato.generico, 'il desiderato deve dichiararsi generico');
  const famiglie = new Set(esito.proposte.map((p) => p.famiglia));
  assert.equal(famiglie.size, 3, `famiglie proposte: ${[...famiglie].join(', ')}`);
  for (const proposta of esito.proposte) {
    assert.ok(proposta.motivi.length >= 1, `${proposta.codice} senza motivazione`);
  }
});

// 7 · Confidenza bassa
prova('7 · a parità di tutto, la scheda confermata precede la bozza incerta', () => {
  const base = { famiglia: 'agrumato', sottofamiglia: 'agrumato fresco', accordi: { agrumato: 0.9, verde: 0.3 } };
  const coppia = [
    profilo('701', { ...base, confidenza: 'bassa' }),
    profilo('702', { ...base, confidenza: 'alta' }),
  ];
  const esito = raccomanda({ luogo: ['agrumeto'] }, coppia, config, { n: 2 });
  assert.deepEqual(codici(esito), ['702', '701']);
  const desiderato = esito.desiderato;
  assert.ok(punteggio(desiderato, coppia[1], config) > punteggio(desiderato, coppia[0], config));
});

// --------------------------------------------------- controlli di impianto

prova('solo le referenze attive entrano nel motore', () => {
  const catalogo = [
    { codice: '101', categoria: 'UOMO', attivo: true },
    { codice: '103', categoria: 'DONNA', attivo: false },
    { codice: '999', categoria: 'PREMIUM', attivo: true },
  ];
  const attivi = profiliAttivi(catalogo, CATALOGO);
  assert.deepEqual(attivi.map((p) => p.codice), ['101'], 'inattivi e codici senza profilo fuori');
  assert.equal(attivi[0].categoria, 'UOMO', 'la categoria di listino viene dal catalogo');
});

prova('il coseno si comporta come deve', () => {
  const chiavi = ['a', 'b', 'c'];
  assert.equal(coseno({ a: 1 }, { a: 2 }, chiavi), 1);
  assert.equal(coseno({ a: 1 }, { b: 1 }, chiavi), 0);
  assert.equal(coseno({}, { a: 1 }, chiavi), 0, 'vettore nullo: nessun errore, punteggio zero');
});

prova('le motivazioni non contengono numeri né segnaposto', () => {
  const esito = raccomanda({
    per_chi: 'me', genere: 'lei', luogo: ['giardino'], carattere: ['romantico'], stagione: 'primavera',
  }, CATALOGO, config);
  for (const proposta of esito.proposte) {
    assert.ok(proposta.motivi.length >= 1);
    for (const motivo of proposta.motivi) {
      assert.ok(!/\{|\}/.test(motivo), `segnaposto rimasto: ${motivo}`);
      assert.ok(!/\d/.test(motivo), `numero nella motivazione: ${motivo}`);
    }
  }
});

prova('le risposte sconosciute non fanno esplodere il motore', () => {
  const esito = raccomanda({
    luogo: ['posto-che-non-esiste'], domanda_mai_vista: 'x', intensita: 99, esclusioni: null,
  }, CATALOGO, config);
  assert.equal(esito.proposte.length, 3);
  assert.equal(spiega(esito.desiderato, CATALOGO[0], config).length >= 1, true);
});

prova('la riserva è una quarta fragranza, diversa dalle tre', () => {
  const esito = raccomanda({ luogo: ['citta'], occasione: ['serata'] }, CATALOGO, config);
  assert.ok(esito.riserva, 'la riserva deve esserci con dieci candidati');
  assert.ok(!codici(esito).includes(esito.riserva.codice));
});

prova('le tre schede non ripetono la stessa frase di apertura', () => {
  const esito = raccomanda({
    per_chi: 'me', genere: 'libero', luogo: ['citta'], occasione: ['serata'], intensita: 4,
  }, CATALOGO, config);
  const aperture = esito.proposte.map((p) => p.motivi[0]).filter(Boolean);
  assert.equal(new Set(aperture).size, aperture.length, `frasi ripetute: ${aperture.join(' / ')}`);
});

console.log(`\n${passate} passate, ${fallite.length} fallite\n`);
if (fallite.length) {
  for (const f of fallite) console.error(f.errore);
  process.exit(1);
}

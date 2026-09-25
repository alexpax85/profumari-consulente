// Prove delle statistiche anonime — docs/06-backoffice.md.
// In particolare le parole che il lessico non conosce: contate una per una,
// mai la frase, con un tetto all'elenco.
//
//   node scripts/test_statistiche.mjs

import assert from 'node:assert/strict';
import {
  nuoveStatistiche, segnaConsulto, paroleIgnote, dimenticaParole, MASSIMO_PAROLE,
} from '../app/js/statistiche.js';

let passate = 0;
function prova(nome, fn) { fn(); passate++; console.log(`ok  ${nome}`); }

const conProposte = { proposte: [{ codice: '101' }] };

prova('le parole sconosciute si contano una per una, con le frasi senza proposte', () => {
  const st = nuoveStatistiche();
  segnaConsulto(st, { capito: [], ignorate: ['Zibibbo', 'pantelleria'] }, null);
  segnaConsulto(st, { capito: [], ignorate: ['zibibbo'] }, conProposte);
  assert.deepEqual(paroleIgnote(st), [
    { parola: 'zibibbo', volte: 2, vuote: 1 },
    { parola: 'pantelleria', volte: 1, vuote: 1 },
  ]);
  assert.equal(st.consulti.conParoleIgnote, 2);
});

prova('niente numeri, sigle o parole lunghissime', () => {
  const st = nuoveStatistiche();
  segnaConsulto(st, { capito: [], ignorate: ['3331234567', 'ab', 'a1b2c3', 'x'.repeat(30), "dell'orto"] }, conProposte);
  assert.deepEqual(paroleIgnote(st).map((p) => p.parola), ["dell'orto"]);
});

prova("l'elenco ha un tetto: le parole nuove non entrano, quelle già dentro si contano", () => {
  const st = nuoveStatistiche();
  const tante = Array.from({ length: MASSIMO_PAROLE }, (_, i) => `parola${'abcdefghij'[i % 10]}${'abcdefghijklmnopqrstuvwxyz'[Math.floor(i / 10) % 26]}${'abcdefghij'[Math.floor(i / 260)]}`);
  segnaConsulto(st, { capito: [], ignorate: tante }, conProposte);
  assert.equal(paroleIgnote(st).length, MASSIMO_PAROLE);
  segnaConsulto(st, { capito: [], ignorate: ['nuovissima', tante[0]] }, conProposte);
  assert.equal(paroleIgnote(st).length, MASSIMO_PAROLE);
  assert.equal(paroleIgnote(st)[0].volte, 2);
});

prova('dimenticare una parola o tutte', () => {
  const st = nuoveStatistiche();
  segnaConsulto(st, { capito: [], ignorate: ['zibibbo', 'pantelleria'] }, conProposte);
  dimenticaParole(st, 'zibibbo');
  assert.deepEqual(paroleIgnote(st).map((p) => p.parola), ['pantelleria']);
  dimenticaParole(st);
  assert.deepEqual(paroleIgnote(st), []);
});

prova('statistiche vecchie, senza elenco, non si rompono', () => {
  assert.deepEqual(paroleIgnote({ consulti: { fatti: 3 } }), []);
  assert.deepEqual(paroleIgnote(undefined), []);
  dimenticaParole({ consulti: {} }, 'x');
});

console.log(`\n${passate} prove passate.`);

// Strumento di taratura (docs/04-motore.md, caso 8): fa girare il motore sul catalogo
// vero per una decina di scenari tipici e stampa i tre codici con la motivazione.
// Non è un test automatico: si legge a occhio insieme al personale.
//
//   node scripts/prova_catalogo.mjs            tutti gli scenari
//   node scripts/prova_catalogo.mjs mare       solo quelli col nome indicato

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { raccomanda, profiliAttivi } from '../app/js/motore.js';
import { SCENARI } from '../app/js/scenari.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => JSON.parse(readFileSync(join(RADICE, p), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  domande: leggi('app/config/domande.json'),
  pesi: leggi('app/config/pesi.json'),
  frasi: leggi('app/config/frasi.json'),
};
const profili = profiliAttivi(leggi('dati/catalogo.json'), leggi('dati/profili.json'));


const filtro = process.argv[2];
const scelti = filtro ? SCENARI.filter((s) => s.nome.includes(filtro)) : SCENARI;

console.log(`\nCatalogo attivo: ${profili.length} referenze\n`);
for (const scenario of scelti) {
  const esito = raccomanda(scenario.risposte, profili, config);
  console.log('─'.repeat(72));
  console.log(`${scenario.titolo}${esito.allargato ? '   [cercato più in largo]' : ''}`);
  console.log(`candidati dopo i filtri: ${esito.candidati}`);
  for (const p of esito.proposte) {
    console.log(`\n  ${p.codice}   ${p.famigliaEtichetta.toUpperCase()} · ${p.sottofamiglia}   (${p.punteggio.toFixed(3)}, confidenza ${p.confidenza})`);
    for (const motivo of p.motivi) console.log(`        ${motivo}`);
    console.log(`        « ${p.descrizione} »`);
  }
  if (esito.riserva) console.log(`\n  riserva: ${esito.riserva.codice} (${esito.riserva.punteggio.toFixed(3)}) ${esito.riserva.sottofamiglia}`);
  console.log('');
}

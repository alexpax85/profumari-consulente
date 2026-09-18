// Strumento di taratura della ricerca per note (docs/12-ricerca-note.md): fa girare
// la ricerca sul catalogo vero per le combinazioni tipiche e stampa quello che il
// cliente vedrebbe. Non è un test automatico: si legge a occhio insieme al personale.
//
//   node scripts/prova_ricerca.mjs             tutte le ricerche
//   node scripts/prova_ricerca.mjs cuoio       solo quelle col nome indicato
//   node scripts/prova_ricerca.mjs --indice    la tavolozza: famiglie e note mostrate

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { profiliAttivi } from '../app/js/motore.js';
import { cerca, indiceNote, piramide } from '../app/js/ricerca.js';
import { RICERCHE } from '../app/js/scenari.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => JSON.parse(readFileSync(join(RADICE, p), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  note: leggi('app/config/note.json'),
  ricerca: leggi('app/config/ricerca.json'),
  pesi: leggi('app/config/pesi.json'),
};
const profili = profiliAttivi(leggi('dati/catalogo.json'), leggi('dati/profili.json'));

const argomento = process.argv[2];

if (argomento === '--indice') {
  const indice = indiceNote(profili, config);
  console.log(`\nTavolozza: ${indice.gruppi.length} gruppi su ${profili.length} referenze attive\n`);
  for (const gruppo of indice.gruppi) {
    console.log(`${gruppo.etichetta.toUpperCase().padEnd(24)} ${String(gruppo.quante).padStart(3)} fragranze   (${gruppo.assaggio.join(', ')})`);
    console.log(`   famiglie: ${gruppo.famiglie.map((f) => `${f.etichetta} ${f.quante}`).join(' · ')}`);
    console.log(`   note:     ${gruppo.note.map((n) => `${n.nome} (${n.quante})`).join(', ')}`);
    if (gruppo.altre) console.log(`   … e altre ${gruppo.altre} note più rare, cercabili ma non mostrate`);
    console.log('');
  }
  if (indice.senzaFamiglia) console.log(`Attenzione: ${indice.senzaFamiglia} note della piramide non hanno una riga in note.json.\n`);
  process.exit(0);
}

const scelte = argomento ? RICERCHE.filter((r) => r.nome.includes(argomento)) : RICERCHE;

console.log(`\nCatalogo attivo: ${profili.length} referenze\n`);
for (const ricerca of scelte) {
  const esito = cerca(ricerca.criteri, profili, config);
  console.log('─'.repeat(72));
  console.log(`${ricerca.titolo}`);
  console.log(`   ${esito.risultati.length} con qualcosa in comune, ${esito.pieni} con tutto quello che hai chiesto`
    + `${esito.fuoriPerVeto ? `, ${esito.fuoriPerVeto} tolte dai veti` : ''}`
    + `${esito.fuoriPerFiltri ? `, ${esito.fuoriPerFiltri} fuori dai filtri` : ''}`);
  console.log(`   ogni criterio da solo: ${esito.daSoli.map((d) => `${d.tipo === 'nota' ? '' : 'famiglia '}${d.chiave} ${d.quante}`).join(' · ')}`);
  for (const risultato of esito.risultati.slice(0, 5)) {
    const p = risultato.profilo;
    console.log(`\n  ${p.codice}   ${String(p.famiglia).toUpperCase()} · ${p.sottofamiglia}`
      + `   (${risultato.punteggio.toFixed(3)}${risultato.pieno ? ', tutto' : `, ${risultato.presi} su ${esito.criteri}`})`);
    console.log(`        ${piramide(p, ricerca.criteri, config)
      .map((riga) => `${riga.fila}: ${riga.note.map((n) => (n.voluta ? `[${n.nome}]` : (n.accordo ? `(${n.nome})` : n.nome))).join(', ')}`)
      .join('  ·  ')}`);
  }
  console.log('');
}

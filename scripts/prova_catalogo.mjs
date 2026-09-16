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

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => JSON.parse(readFileSync(join(RADICE, p), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  domande: leggi('app/config/domande.json'),
  pesi: leggi('app/config/pesi.json'),
  frasi: leggi('app/config/frasi.json'),
};
const profili = profiliAttivi(leggi('dati/catalogo.json'), leggi('dati/profili.json'));

export const SCENARI = [
  { nome: 'mare-ufficio-lui', titolo: 'Mare, ufficio, per lui, niente dolce',
    risposte: { per_chi: 'me', genere: 'lui', luogo: ['mare'], esclusioni: ['dolce'], occasione: ['ufficio'], intensita: 2, stagione: 'estate' } },
  { nome: 'regalo-partner-sera', titolo: 'Regalo al partner, città di notte, sera',
    risposte: { per_chi: 'regalo', destinatario: 'partner', genere: 'lei', luogo: ['citta'], occasione: ['serata', 'romantico'], intensita: 4, stagione: 'inverno', carattere: ['sensuale'] } },
  { nome: 'pasticceria-coccola', titolo: 'Pasticceria, coccola, inverno',
    risposte: { per_chi: 'me', genere: 'lei', luogo: ['pasticceria'], carattere: ['coccola'], intensita: 3, stagione: 'inverno' } },
  { nome: 'niente-fiori', titolo: 'Giardino ma niente fiori (risposte in contrasto)',
    risposte: { per_chi: 'me', genere: 'lei', luogo: ['giardino'], esclusioni: ['fiori'], intensita: 3 } },
  { nome: 'bosco-calmo', titolo: 'Bosco, calmo, tutti i giorni',
    risposte: { per_chi: 'me', genere: 'libero', luogo: ['bosco'], carattere: ['calmo'], occasione: ['quotidiano'], intensita: 3, stagione: 'autunno' } },
  { nome: 'spezie-audace', titolo: 'Mercato delle spezie, audace, occasione speciale',
    risposte: { per_chi: 'me', genere: 'lui', luogo: ['spezie'], carattere: ['audace'], occasione: ['speciale'], intensita: 5 } },
  { nome: 'sport-fresco', titolo: 'Sport, agrumeto, niente di forte',
    risposte: { per_chi: 'me', genere: 'lui', luogo: ['agrumeto'], esclusioni: ['forte'], occasione: ['sport'], intensita: 2, stagione: 'estate' } },
  { nome: 'regalo-genitore', titolo: 'Regalo a un genitore, elegante, biblioteca',
    risposte: { per_chi: 'regalo', destinatario: 'genitore', genere: 'lei', luogo: ['biblioteca'], carattere: ['elegante'], intensita: 3 } },
  { nome: 'tropici-allegro', titolo: 'Spiaggia tropicale, allegro, estate',
    risposte: { per_chi: 'me', genere: 'lei', luogo: ['tropici'], carattere: ['allegro'], stagione: 'estate', intensita: 3 } },
  { nome: 'senza-idee', titolo: 'Nessuna idea: solo "per me" e nessun vincolo',
    risposte: { per_chi: 'me', genere: 'libero' } },
  { nome: 'tutti-i-veti', titolo: 'Chi esclude quasi tutto (dolce, fiori, fumo)',
    risposte: { per_chi: 'me', genere: 'libero', esclusioni: ['dolce', 'fiori', 'fumo'], luogo: ['bosco'], intensita: 3 } },
];

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

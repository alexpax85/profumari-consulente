// Il consulente a parole sul catalogo vero, da leggere a occhio (docs/13-consulente.md).
//
//   node scripts/prova_consulente.mjs                   le frasi tipiche di app/js/scenari.js
//   node scripts/prova_consulente.mjs "una frase"       una frase qualsiasi, con il dettaglio
//   node scripts/prova_consulente.mjs --copertura       quante parole di un elenco di frasi libere capisce

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { preparaLessico, interpreta, haSostanza } from '../app/js/interpreta.js';
import { consiglia } from '../app/js/consulente.js';
import { profiliAttivi } from '../app/js/motore.js';
import { FRASI, controllaAttese } from '../app/js/scenari.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => JSON.parse(readFileSync(join(RADICE, p), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  note: leggi('app/config/note.json'),
  ricerca: leggi('app/config/ricerca.json'),
  pesi: leggi('app/config/pesi.json'),
  frasi: leggi('app/config/frasi.json'),
  consulente: leggi('app/config/consulente.json'),
};
const profili = profiliAttivi(leggi('dati/catalogo.json'), leggi('dati/profili.json'));
const pronto = preparaLessico(leggi('app/config/lessico.json'), config, profili);

const capite = (d) => d.capito.map((c) => `${c.chiave}${c.modo === 'si' ? '' : `(${c.modo})`}`).join(', ');
const piramide = (p) => ['testa', 'cuore', 'fondo'].map((f) => (p[f] || []).join(', ')).join(' / ');

function dettaglio(frase) {
  const d = interpreta(frase, pronto);
  console.log(`\n«${frase}»`);
  console.log(`  capito:   ${capite(d) || 'niente'}`);
  if (d.ignorate.length) console.log(`  ignote:   ${d.ignorate.join(', ')}`);
  const accordi = Object.entries(d.accordi).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v.toFixed(2)}`);
  console.log(`  accordi:  ${accordi.join(', ') || '—'}`);
  console.log(`  note:     ${Object.keys(d.note).slice(0, 10).join(', ') || '—'}`);
  if (Object.keys(d.attributi).length) console.log(`  misure:   ${Object.entries(d.attributi).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const veti = [...Object.keys(d.esclusioni), ...d.noteEscluse, ...Object.keys(d.esclusioniAttributi).map((a) => `${a} alta`)];
  if (veti.length) console.log(`  veti:     ${veti.join(', ')}`);
  if (d.filtri.genere) console.log(`  genere:   ${d.filtri.genere}`);
  if (!haSostanza(d)) { console.log('  → non abbastanza per proporre'); return; }
  const esito = consiglia(d, profili, config, pronto);
  for (const p of esito.proposte) {
    console.log(`  ${p.codice}  ${p.famiglia} · ${p.sottofamiglia}  (${p.punteggio.toFixed(3)})`);
    console.log(`        ${piramide(p.profilo)}`);
    for (const m of p.motivi) console.log(`        · ${m}`);
  }
  if (esito.riserva) console.log(`  riserva ${esito.riserva.codice}  ${esito.riserva.famiglia}`);
}

const argomento = process.argv[2];

if (argomento === '--copertura') {
  // Frasi libere, scritte come le dicono i clienti e NON usate per scrivere il lessico:
  // misurano quanto il lessico regge fuori dai casi previsti.
  const LIBERE = [
    'qualcosa che mi faccia sentire in vacanza', 'odore di pulito ma non da detersivo',
    'mi piace quando esco dalla doccia', 'un profumo da uomo che non sia il solito',
    'che sappia di estate in Sicilia', 'come il mare in Sardegna', 'qualcosa di caldo per l\'inverno',
    'mi ricorda la mia infanzia in campagna', 'profumo di torta appena sfornata',
    'un odore di legno bagnato dopo un temporale', 'elegante ma non da vecchia',
    'sensuale per la sera ma non troppo pesante', 'fresco e agrumato per l\'ufficio',
    'dolce ma non stucchevole', 'mi piacciono i profumi orientali', 'qualcosa di speziato e legnoso',
    'un profumo che resti tanto addosso', 'leggero che non dia fastidio', 'il profumo della neve',
    'come un giardino di rose dopo la pioggia', 'odore di mandarino e cannella a Natale',
    'caffè al mattino', 'un tè alla menta in Marocco', 'che sa di cocco e crema solare',
    'la pelle abbronzata', 'l\'odore della carta dei libri', 'fumo di sigaro e cuoio',
    'qualcosa di misterioso e notturno', 'fiori bianchi ma non troppo', 'per una festa di matrimonio in estate',
  ];
  let capiteTutte = 0;
  let proposte = 0;
  const ignote = new Map();
  for (const frase of LIBERE) {
    const d = interpreta(frase, pronto);
    if (haSostanza(d)) proposte++;
    if (!d.ignorate.length) capiteTutte++;
    for (const p of d.ignorate) ignote.set(p, (ignote.get(p) || 0) + 1);
    console.log(`${haSostanza(d) ? 'ok' : '--'}  «${frase}» → ${capite(d) || 'niente'}${d.ignorate.length ? `   [ignote: ${d.ignorate.join(', ')}]` : ''}`);
  }
  console.log(`\n${proposte} frasi su ${LIBERE.length} danno una proposta; ${capiteTutte} capite senza parole ignote.`);
  console.log(`Parole ignote: ${[...ignote].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}${n > 1 ? ` ×${n}` : ''}`).join(', ')}`);
  process.exit(0);
}

if (argomento) {
  dettaglio(process.argv.slice(2).join(' '));
  process.exit(0);
}

let buone = 0;
for (const { frase, attese } of FRASI) {
  const d = interpreta(frase, pronto);
  const esito = consiglia(d, profili, config, pronto);
  const problemi = controllaAttese(esito, attese);
  if (!problemi.length) buone++;
  console.log(`${problemi.length ? 'NO' : 'ok'}  «${frase}»`);
  console.log(`      capito: ${capite(d)}`);
  for (const p of esito.proposte) console.log(`      ${p.codice} ${p.famiglia.padEnd(18)} ${p.motivi[0] || ''}`);
  if (problemi.length) console.log(`      !! ${problemi.join('; ')}`);
}
console.log(`\n${buone} frasi su ${FRASI.length} danno quello che ci si aspetta.`);

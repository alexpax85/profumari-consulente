// Controlla che i profili rispettino lo schema di docs/09-schema-profilo.md e che
// ogni referenza attiva del catalogo abbia il suo profilo.
//
//   node scripts/valida_profili.mjs [percorso/catalogo.json] [percorso/profili.json]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => JSON.parse(readFileSync(p.startsWith('/') ? p : join(RADICE, p), 'utf8'));

const [, , percorsoCatalogo = 'dati/catalogo.json', percorsoProfili = 'dati/profili.json'] = process.argv;
const catalogo = leggi(percorsoCatalogo);
const profili = leggi(percorsoProfili);
const tassonomia = leggi('app/config/accordi.json');

const ACCORDI = new Set(tassonomia.accordi.map((a) => a.chiave));
const FAMIGLIE = new Set(tassonomia.famiglie.map((f) => f.chiave));
const GENERI = new Set(['uomo', 'donna', 'unisex']);
const OCCASIONI = new Set(['quotidiano', 'ufficio', 'serata', 'sport', 'speciale', 'romantico']);
const CARATTERE = new Set(['energico', 'calmo', 'sensuale', 'elegante', 'audace', 'coccola', 'misterioso', 'allegro', 'romantico', 'sicuro', 'fresco']);
const CONFIDENZE = new Set(['alta', 'media', 'bassa']);
const STAGIONI = new Set(['primavera', 'estate', 'autunno', 'inverno']);
const MOMENTI = new Set(['giorno', 'sera']);
const CAMPI = new Set(['codice', 'genere', 'famiglia', 'sottofamiglia', 'testa', 'cuore', 'fondo',
  'accordi', 'intensita', 'persistenza', 'dolcezza', 'freschezza', 'stagioni', 'momento',
  'occasioni', 'carattere', 'descrizione', 'confidenza', 'rivisto', 'noteStaff']);

const errori = [];
const avvisi = [];
const visti = new Set();

function intervallo(p, campo, min, max) {
  const v = p[campo];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    errori.push(`${p.codice}: ${campo} = ${JSON.stringify(v)} (atteso ${min}-${max})`);
  }
}

for (const p of profili) {
  if (!p || typeof p.codice !== 'string' || !/^\d{3}$/.test(p.codice)) {
    errori.push(`codice non valido: ${JSON.stringify(p && p.codice)}`);
    continue;
  }
  if (visti.has(p.codice)) errori.push(`${p.codice}: codice ripetuto`);
  visti.add(p.codice);

  for (const campo of Object.keys(p)) if (!CAMPI.has(campo)) errori.push(`${p.codice}: campo sconosciuto "${campo}"`);
  if (!GENERI.has(p.genere)) errori.push(`${p.codice}: genere "${p.genere}"`);
  if (!FAMIGLIE.has(p.famiglia)) errori.push(`${p.codice}: famiglia "${p.famiglia}"`);
  if (typeof p.sottofamiglia !== 'string' || !p.sottofamiglia.trim()) errori.push(`${p.codice}: sottofamiglia mancante`);
  if (!CONFIDENZE.has(p.confidenza)) errori.push(`${p.codice}: confidenza "${p.confidenza}"`);

  for (const campo of ['testa', 'cuore', 'fondo']) {
    if (!Array.isArray(p[campo]) || !p[campo].length) errori.push(`${p.codice}: ${campo} vuoto`);
  }
  const accordi = Object.entries(p.accordi || {});
  if (!accordi.length) errori.push(`${p.codice}: nessun accordo`);
  for (const [k, v] of accordi) {
    if (!ACCORDI.has(k)) errori.push(`${p.codice}: accordo sconosciuto "${k}"`);
    if (typeof v !== 'number' || v < 0 || v > 1) errori.push(`${p.codice}: accordo ${k} = ${v} (atteso 0-1)`);
  }
  if (accordi.length && !accordi.some(([, v]) => v >= 0.8)) {
    avvisi.push(`${p.codice}: nessun accordo dominante (il massimo è ${Math.max(...accordi.map(([, v]) => v))})`);
  }

  for (const campo of ['intensita', 'persistenza', 'dolcezza', 'freschezza']) intervallo(p, campo, 1, 5);

  for (const [k, v] of Object.entries(p.stagioni || {})) {
    if (!STAGIONI.has(k)) errori.push(`${p.codice}: stagione "${k}"`);
    if (typeof v !== 'number' || v < 0 || v > 1) errori.push(`${p.codice}: stagione ${k} = ${v}`);
  }
  for (const [k, v] of Object.entries(p.momento || {})) {
    if (!MOMENTI.has(k)) errori.push(`${p.codice}: momento "${k}"`);
    if (typeof v !== 'number' || v < 0 || v > 1) errori.push(`${p.codice}: momento ${k} = ${v}`);
  }
  for (const o of p.occasioni || []) if (!OCCASIONI.has(o)) errori.push(`${p.codice}: occasione "${o}"`);
  for (const c of p.carattere || []) if (!CARATTERE.has(c)) errori.push(`${p.codice}: carattere "${c}"`);
  if (!(p.carattere || []).length) errori.push(`${p.codice}: carattere vuoto`);

  if (typeof p.descrizione !== 'string' || !p.descrizione.trim()) errori.push(`${p.codice}: descrizione mancante`);
  else if (p.descrizione.length > 140) avvisi.push(`${p.codice}: descrizione di ${p.descrizione.length} caratteri (max 140)`);
}

// Catalogo ↔ profili
const conProfilo = new Set(profili.map((p) => p.codice));
const attiviSenzaProfilo = catalogo.filter((c) => c.attivo && !conProfilo.has(c.codice)).map((c) => c.codice);
if (attiviSenzaProfilo.length) {
  errori.push(`referenze attive senza profilo (${attiviSenzaProfilo.length}): ${attiviSenzaProfilo.join(', ')}`);
}
const nelCatalogo = new Set(catalogo.map((c) => c.codice));
const orfani = profili.filter((p) => !nelCatalogo.has(p.codice)).map((p) => p.codice);
if (orfani.length) avvisi.push(`profili senza referenza in catalogo (${orfani.length}): ${orfani.join(', ')}`);

const perConfidenza = { alta: 0, media: 0, bassa: 0 };
for (const p of profili) if (p.confidenza in perConfidenza) perConfidenza[p.confidenza]++;

console.log(`\nCatalogo: ${catalogo.length} referenze (${catalogo.filter((c) => c.attivo).length} attive)`);
console.log(`Profili:  ${profili.length} — alta ${perConfidenza.alta}, media ${perConfidenza.media}, bassa ${perConfidenza.bassa}`);
if (avvisi.length) {
  console.log(`\nAvvisi (${avvisi.length}):`);
  for (const a of avvisi.slice(0, 20)) console.log(`  · ${a}`);
  if (avvisi.length > 20) console.log(`  · … e altri ${avvisi.length - 20}`);
}
if (errori.length) {
  console.error(`\nErrori (${errori.length}):`);
  for (const e of errori.slice(0, 40)) console.error(`  ! ${e}`);
  if (errori.length > 40) console.error(`  ! … e altri ${errori.length - 40}`);
  console.error('');
  process.exit(1);
}
console.log('\nTutto in regola.\n');

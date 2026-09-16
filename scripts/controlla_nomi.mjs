// Regola numero uno: nell'app e nei dati versionati non deve comparire nessun nome
// commerciale. Il rischio vero non è la parola comune ("dolce", "patchouli"), ma la
// descrizione che si porta dietro una parola del nome dell'originale.
//
//   node scripts/controlla_nomi.mjs
//
// Confronta ogni profilo con il SUO nome originale (da dati/privato/nomi.json, che
// resta fuori dalla repo) e cerca i nomi interi nei file dell'app. Senza il file
// privato non c'è niente da confrontare e il controllo si salta.
//
// docs/ è escluso di proposito: lì i nomi commerciali compaiono negli esempi, ed è
// documentazione interna, non roba che finisce sotto gli occhi del cliente.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATO = join(RADICE, 'dati/privato/nomi.json');
const DA_CONTROLLARE = ['app', 'dati'];

// Parole del nome che descrivono davvero l'odore o sono comuni: non sono indizi.
const INNOCUE = new Set([
  'uomo', 'donna', 'homme', 'femme', 'pour', 'eau', 'parfum', 'toilette', 'cologne', 'acqua',
  'intense', 'extreme', 'extrait', 'elixir', 'absolu', 'absolute', 'original', 'classic',
  'classica', 'sport', 'club', 'edition', 'limited', 'collection', 'private', 'prive', 'privé',
  'nero', 'noir', 'black', 'bianco', 'blanc', 'white', 'blu', 'bleu', 'blue', 'rosso', 'rouge',
  'red', 'verde', 'vert', 'green', 'oro', 'gold', 'silver', 'grigio', 'perla', 'rosa', 'rose',
  'ambra', 'amber', 'oud', 'musc', 'musk', 'vaniglia', 'vanille', 'iris', 'neroli', 'mirto',
  'patchouli', 'tonka', 'fico', 'fresia', 'gardenia', 'mandarino', 'colonia', 'latte', 'miele',
  'sale', 'erba', 'legno', 'legni', 'wood', 'bois', 'fleur', 'fiore', 'mare', 'sole', 'luna',
  'notte', 'nuit', 'night', 'giorno', 'light', 'dark', 'sicilia', 'toscana', 'roma', 'italia',
  'costa', 'azzurra', 'pura', 'pure', 'dolce', 'bouquet', 'narciso', 'colore', 'color',
]);

const parole = (testo) => String(testo || '').split(/[^\p{L}\p{N}]+/u)
  .map((p) => p.toLowerCase())
  .filter((p) => p.length >= 4 && !INNOCUE.has(p));

// Parole già viste e approvate: descrivono l'odore, non il marchio (vedi dati/README.md).
const AMMESSE = {
  592: ['confetto'],   // la mandorla zuccherata sa davvero di confetto
  594: ['gelato'],     // idem per il gelato al pistacchio
  614: ['shabby'],     // descrive lo stile, non il marchio
  617: ['cola'],       // la cola è una nota, come la vaniglia
};

function fileApp(cartella, raccolti = []) {
  for (const voce of readdirSync(cartella)) {
    if (voce.startsWith('.') || voce === 'privato') continue;
    const percorso = join(cartella, voce);
    if (statSync(percorso).isDirectory()) { fileApp(percorso, raccolti); continue; }
    if (/\.(js|mjs|json|html|css)$/.test(voce)) raccolti.push(percorso);
  }
  return raccolti;
}

if (!existsSync(PRIVATO)) {
  console.log('\nNessun dati/privato/nomi.json su questa macchina: controllo saltato.\n');
  process.exit(0);
}

const nomi = JSON.parse(readFileSync(PRIVATO, 'utf8'));
const profili = JSON.parse(readFileSync(join(RADICE, 'dati/profili.json'), 'utf8'));
const perCodice = new Map(nomi.map((n) => [String(n.codice), String(n.nome || '')]));
const errori = [];

// 1 · ogni profilo contro il proprio originale
for (const profilo of profili) {
  const nome = perCodice.get(profilo.codice);
  if (!nome) continue;
  const ammesse = AMMESSE[Number(profilo.codice)] || [];
  const testo = [profilo.descrizione, profilo.sottofamiglia, ...(profilo.testa || []),
    ...(profilo.cuore || []), ...(profilo.fondo || []), ...(profilo.carattere || [])].join(' ').toLowerCase();
  for (const parola of new Set(parole(nome))) {
    if (ammesse.includes(parola)) continue;
    if (new RegExp(`(^|[^\\p{L}])${parola}([^\\p{L}]|$)`, 'u').test(testo)) {
      errori.push(`profilo ${profilo.codice}: il testo riprende una parola del nome dell'originale ("${parola}")`);
    }
  }
}

// 2 · i nomi interi (o la parte dopo il trattino) nei file dell'app e dei dati
const interi = [];
for (const [codice, nome] of perCodice) {
  const pezzi = nome.split(/\s*[-–]\s*/).filter((p) => p.trim().length >= 5);
  for (const pezzo of pezzi) {
    const ripulito = pezzo.trim().toLowerCase();
    // Solo i nomi di almeno due parole, e solo se almeno una è distintiva:
    // "colonia classica" o "patchouli" da soli non dicono niente sul marchio.
    const parti = ripulito.split(/\s+/);
    if (parti.length >= 2 && parti.some((x) => !INNOCUE.has(x))) interi.push({ codice, testo: ripulito });
  }
}
const file = DA_CONTROLLARE.flatMap((c) => fileApp(join(RADICE, c)));
for (const percorso of file) {
  const contenuto = readFileSync(percorso, 'utf8').toLowerCase();
  for (const { codice, testo } of interi) {
    if (contenuto.includes(testo)) {
      errori.push(`${relative(RADICE, percorso)}: contiene il nome commerciale del codice ${codice}`);
    }
  }
}

console.log(`\nReferenze confrontate: ${perCodice.size} · file controllati: ${file.length} (app/ e dati/, escluso privato/)`);
if (errori.length) {
  console.error(`\nDa correggere (${errori.length}):`);
  for (const e of errori) console.error(`  ! ${e}`);
  console.error('');
  process.exit(1);
}
console.log('Nessun nome commerciale nell\'app né nei dati versionati.\n');

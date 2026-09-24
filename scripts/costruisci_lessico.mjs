// Il lessico del consulente si scrive "in grande" qui, fuori dal chiosco, e sul
// chiosco arriva compilato (docs/13-consulente.md). Le scene stanno in
// dati/lessico/*.json, divise per argomento; questo script le controlla contro il
// catalogo vero e scrive app/config/lessico.json, l'unico file che l'app legge.
//
//   node scripts/costruisci_lessico.mjs                      controlla tutto e scrive
//   node scripts/costruisci_lessico.mjs --controlla FILE     controlla un file solo, non scrive
//
// Cosa controlla: chiavi uniche, tipi e valori ammessi, che ogni nota esista davvero
// in qualche piramide (scritta com'è sulla card), che ogni accordo esista nella
// tassonomia, e che la stessa forma non stia in due scene. Un errore ferma la
// scrittura: sul chiosco non deve arrivare una scena che promette una nota che non c'è.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { normalizzaNota } from '../app/js/ricerca.js';
import { ATTRIBUTI, STAGIONI, MOMENTI } from '../app/js/motore.js';
import { formaNormale, parole } from '../app/js/interpreta.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARTELLA = join(RADICE, 'dati/lessico');
const USCITA = join(RADICE, 'app/config/lessico.json');
const leggi = (percorso) => JSON.parse(readFileSync(percorso, 'utf8'));
const GRAMMATICA = leggi(join(CARTELLA, '_grammatica.json'));
// Le parole che la grammatica usa (non, senza, ma, vorrei…) non entrano mai in una
// scena: una forma che le contiene non si potrebbe riconoscere, quindi si scarta.
const DELLA_GRAMMATICA = new Set([...GRAMMATICA.negazioni, ...GRAMMATICA.separatori, ...GRAMMATICA.riaperture]
  .map((p) => parole(p).join(' ')));

export const TIPI = [
  'luogo', 'ambiente', 'cibo', 'bevanda', 'situazione', 'persona', 'momento', 'stagione',
  'meteo', 'colore', 'umore', 'sensazione', 'materiale', 'ricordo', 'viaggio', 'ingrediente',
];
const OCCASIONI = ['quotidiano', 'ufficio', 'serata', 'romantico', 'speciale', 'sport'];
const CARATTERI = ['sensuale', 'sicuro', 'fresco', 'energico', 'coccola', 'elegante', 'audace',
  'romantico', 'allegro', 'calmo', 'misterioso'];
const CAMPI = new Set(['chiave', 'tipo', 'forme', 'evoca', 'accordi', 'note', 'misure', 'stagioni',
  'momento', 'occasioni', 'carattere', 'filtro', 'manca', 'modo', '_nota']);

const accordi = new Set(leggi(join(RADICE, 'app/config/accordi.json')).accordi.map((a) => a.chiave));

// Le note ammesse sono quelle delle piramidi, scritte come sulla card: la scena
// "caffe" diventa "caffè", così la piramide del risultato la accende.
const noteVere = new Map();
for (const profilo of leggi(join(RADICE, 'dati/profili.json'))) {
  for (const fila of ['testa', 'cuore', 'fondo']) {
    for (const nome of profilo[fila] || []) {
      const chiave = normalizzaNota(nome);
      const gia = noteVere.get(chiave);
      if (gia) gia.quante++;
      else noteVere.set(chiave, { nome, quante: 1 });
    }
  }
}

const numeroFra = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/** Controlla una scena e la riporta in forma pulita; gli errori finiscono in `errori`. */
function pulisciScena(scena, dove, errori, avvisi) {
  const dove2 = `${dove} · ${scena && scena.chiave ? scena.chiave : '(senza chiave)'}`;
  const sbaglia = (testo) => errori.push(`${dove2}: ${testo}`);
  if (!scena || typeof scena !== 'object') { sbaglia('non è un oggetto'); return null; }
  for (const campo of Object.keys(scena)) if (!CAMPI.has(campo)) sbaglia(`campo sconosciuto "${campo}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(scena.chiave || '')) sbaglia('chiave mancante o non in minuscolo-col-trattino');
  if (!TIPI.includes(scena.tipo)) sbaglia(`tipo "${scena.tipo}" non ammesso`);
  if (typeof scena.evoca !== 'string' || !scena.evoca.trim()) sbaglia('manca "evoca"');

  // Si tiene la forma come l'ha scritta chi l'ha pensata (si legge nel backoffice),
  // ma due forme che si leggono uguali ("bosco d'inverno", "boschi in inverno") ne fanno una.
  const forme = [];
  const normali = [];
  for (const forma of scena.forme || []) {
    const conGrammatica = parole(forma).find((p) => DELLA_GRAMMATICA.has(p));
    if (conGrammatica) { avvisi.push(`${dove2}: la forma "${forma}" contiene "${conGrammatica}", che è della grammatica: la salto`); continue; }
    const normale = formaNormale(forma, GRAMMATICA);
    if (!normale) { avvisi.push(`${dove2}: la forma "${forma}" è fatta solo di parole vuote, la salto`); continue; }
    if (normali.includes(normale)) continue;
    normali.push(normale);
    forme.push(String(forma).trim().toLowerCase());
  }
  if (!forme.length) sbaglia('nessuna forma utilizzabile');

  const suoiAccordi = {};
  for (const [chiave, valore] of Object.entries(scena.accordi || {})) {
    if (!accordi.has(chiave)) { sbaglia(`accordo "${chiave}" inesistente`); continue; }
    if (!numeroFra(valore, 0.05, 1)) { sbaglia(`accordo ${chiave}: ${valore} fuori da 0,05-1`); continue; }
    suoiAccordi[chiave] = Math.round(valore * 100) / 100;
  }

  const suoNote = {};
  for (const [nome, valore] of Object.entries(scena.note || {})) {
    const vera = noteVere.get(normalizzaNota(nome));
    if (!vera) { sbaglia(`nota "${nome}" non c'è in nessuna piramide`); continue; }
    if (!numeroFra(valore, 0.05, 1)) { sbaglia(`nota ${nome}: ${valore} fuori da 0,05-1`); continue; }
    suoNote[vera.nome] = Math.round(valore * 100) / 100;
  }

  const misure = {};
  for (const [chiave, valore] of Object.entries(scena.misure || {})) {
    if (!ATTRIBUTI.includes(chiave)) { sbaglia(`misura "${chiave}" inesistente`); continue; }
    if (!numeroFra(valore, 1, 5)) { sbaglia(`misura ${chiave}: ${valore} fuori da 1-5`); continue; }
    misure[chiave] = valore;
  }
  const mappa = (campo, ammessi) => {
    const fuori = {};
    for (const [chiave, valore] of Object.entries(scena[campo] || {})) {
      if (!ammessi.includes(chiave)) { sbaglia(`${campo}: "${chiave}" non ammesso`); continue; }
      if (!numeroFra(valore, 0, 1)) { sbaglia(`${campo} ${chiave}: ${valore} fuori da 0-1`); continue; }
      fuori[chiave] = valore;
    }
    return fuori;
  };
  const stagioni = mappa('stagioni', STAGIONI);
  const momento = mappa('momento', MOMENTI);
  const elenco = (campo, ammessi) => {
    const fuori = [];
    for (const valore of scena[campo] || []) {
      if (!ammessi.includes(valore)) { sbaglia(`${campo}: "${valore}" non ammesso`); continue; }
      if (!fuori.includes(valore)) fuori.push(valore);
    }
    return fuori;
  };
  const occasioni = elenco('occasioni', OCCASIONI);
  const carattere = elenco('carattere', CARATTERI);

  let filtro = null;
  if (scena.filtro) {
    if (!['uomo', 'donna'].includes(scena.filtro.genere)) sbaglia('filtro.genere deve essere "uomo" o "donna"');
    else filtro = { genere: scena.filtro.genere };
  }
  if (scena.modo && scena.modo !== 'regalo') sbaglia('modo ammesso: "regalo"');

  const sostanza = Object.keys(suoiAccordi).length + Object.keys(suoNote).length + Object.keys(misure).length
    + Object.keys(stagioni).length + Object.keys(momento).length + occasioni.length + carattere.length
    + (filtro ? 1 : 0) + (scena.modo ? 1 : 0);
  if (!sostanza) sbaglia('la scena non dice niente al motore');

  const pulita = { chiave: scena.chiave, tipo: scena.tipo, forme, normali, evoca: String(scena.evoca || '').trim() };
  if (Object.keys(suoiAccordi).length) pulita.accordi = suoiAccordi;
  if (Object.keys(suoNote).length) pulita.note = suoNote;
  if (Object.keys(misure).length) pulita.misure = misure;
  if (Object.keys(stagioni).length) pulita.stagioni = stagioni;
  if (Object.keys(momento).length) pulita.momento = momento;
  if (occasioni.length) pulita.occasioni = occasioni;
  if (carattere.length) pulita.carattere = carattere;
  if (filtro) pulita.filtro = filtro;
  if (scena.modo) pulita.modo = scena.modo;
  if (Array.isArray(scena.manca) && scena.manca.length) pulita.manca = scena.manca.map(String);
  return pulita;
}

function fileScene() {
  return readdirSync(CARTELLA).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
}

function controlla(soloFile = null) {
  const errori = [];
  const avvisi = [];
  const scene = [];
  const chiavi = new Map();
  const forme = new Map();   // forma -> "file · chiave"
  for (const file of fileScene()) {
    const nome = basename(file);
    let contenuto;
    try { contenuto = leggi(join(CARTELLA, file)); } catch (e) { errori.push(`${nome}: JSON non valido (${e.message})`); continue; }
    const elenco = Array.isArray(contenuto) ? contenuto : contenuto.scene;
    if (!Array.isArray(elenco)) { errori.push(`${nome}: serve un array di scene`); continue; }
    const mio = !soloFile || basename(soloFile) === nome;
    for (const grezza of elenco) {
      const errQui = [];
      const pulita = pulisciScena(grezza, nome, errQui, mio ? avvisi : []);
      if (mio) errori.push(...errQui);
      if (!pulita) continue;
      if (chiavi.has(pulita.chiave)) {
        const testo = `${nome}: chiave "${pulita.chiave}" già usata in ${chiavi.get(pulita.chiave)}`;
        if (mio) errori.push(testo);
        continue;
      }
      chiavi.set(pulita.chiave, nome);
      for (const forma of pulita.normali) {
        const altra = forme.get(forma);
        if (altra) {
          const testo = `${nome} · ${pulita.chiave}: la forma "${forma}" sta già in ${altra}`;
          if (mio) errori.push(testo);
        } else {
          forme.set(forma, `${nome} · ${pulita.chiave}`);
        }
      }
      if (!errQui.length) scene.push(pulita);
    }
  }
  return { errori, avvisi, scene };
}

/** Una scena per riga: il file resta leggibile nei diff e non pesa il doppio per l'indentazione. */
function scrivi(scene) {
  const { _nota, ...grammatica } = GRAMMATICA;
  scene.sort((a, b) => a.chiave.localeCompare(b.chiave));
  const righe = scene.map(({ normali, ...s }) => `  ${JSON.stringify(s)}`);
  const testo = `{\n "versione": 1,\n "nota": ${JSON.stringify(
    'Il lessico del consulente: le scene che il cliente racconta (un luogo, un cibo, una bevanda, una situazione) tradotte in accordi e note del catalogo. NON si modifica a mano: si scrive in dati/lessico/*.json e si compila con node scripts/costruisci_lessico.mjs (docs/13-consulente.md).',
  )},\n "grammatica": ${JSON.stringify(grammatica)},\n "scene": [\n${righe.join(',\n')}\n ]\n}\n`;
  writeFileSync(USCITA, testo);
  return testo.length;
}

const argomenti = process.argv.slice(2);
const soloFile = argomenti[0] === '--controlla' ? argomenti[1] : null;
const { errori, avvisi, scene } = controlla(soloFile);

for (const avviso of avvisi) console.log(`  avviso  ${avviso}`);
for (const errore of errori) console.log(`  ERRORE  ${errore}`);

if (soloFile) {
  console.log(`\n${errori.length ? 'Da correggere' : 'Tutto a posto'}: ${errori.length} errori, ${avvisi.length} avvisi (${scene.length} scene valide in tutto il lessico).`);
  process.exit(errori.length ? 1 : 0);
}

if (errori.length) {
  console.log(`\n${errori.length} errori: app/config/lessico.json NON è stato scritto.`);
  process.exit(1);
}
const byte = scrivi(scene);
const perTipo = {};
for (const s of scene) perTipo[s.tipo] = (perTipo[s.tipo] || 0) + 1;
const quanteForme = scene.reduce((n, s) => n + s.forme.length, 0);
console.log(`\nScritto app/config/lessico.json: ${scene.length} scene, ${quanteForme} forme, ${Math.round(byte / 1024)} KB.`);
console.log(Object.entries(perTipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · '));

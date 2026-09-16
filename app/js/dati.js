// Caricamento dei dati di partenza: configurazione da app/config, catalogo e
// profili da dati/. In locale il server sta nella radice della repo (dati/ è una
// cartella sopra); su GitHub Pages il workflow copia i JSON dentro app/dati/.
// Si prova prima il percorso pubblicato, poi quello di sviluppo.

const FILE_CONFIG = ['accordi', 'domande', 'pesi', 'frasi', 'testi'];

/**
 * In sviluppo il server sta nella radice della repo e la pagina è /app/index.html:
 * lì i dati sono in ../dati/. Sul sito pubblicato la radice è app/ e i dati sono
 * in dati/. Si prova per primo il percorso più probabile, l'altro resta come rete.
 */
function percorsiDati() {
  const dentroApp = /\/app\/?$|\/app\/index\.html$/.test(location.pathname);
  return dentroApp ? ['../dati/', 'dati/'] : ['dati/', '../dati/'];
}

async function json(url) {
  const risposta = await fetch(url, { cache: 'no-cache' });
  if (!risposta.ok) throw new Error(`${url}: ${risposta.status}`);
  return risposta.json();
}

async function primoDisponibile(nomeFile) {
  let ultimo = null;
  for (const base of percorsiDati()) {
    try {
      return await json(base + nomeFile);
    } catch (errore) {
      ultimo = errore;
    }
  }
  throw new Error(`Non trovo ${nomeFile} (${ultimo && ultimo.message})`);
}

/** { config: {accordi, domande, pesi, frasi, testi}, catalogo, profili } */
export async function caricaPredefiniti() {
  const parti = await Promise.all(FILE_CONFIG.map((nome) => json(`config/${nome}.json`)));
  const config = {};
  FILE_CONFIG.forEach((nome, i) => { config[nome] = parti[i]; });
  const [catalogo, profili] = await Promise.all([
    primoDisponibile('catalogo.json'),
    primoDisponibile('profili.json'),
  ]);
  return { config, catalogo, profili };
}

/**
 * Trova l'elenco delle referenze dentro il file, qualunque forma abbia:
 *  · l'export dedicato del consulente: un array, oppure { catalogo: [...] };
 *  · un backup del gestionale: lo stato intero, con le referenze in `fragranze`,
 *    che è un oggetto indicizzato per codice, non un array;
 *  · un backup del consulente: { stato: { catalogo: [...] } }.
 */
function trovaReferenze(grezzo) {
  if (Array.isArray(grezzo)) return { elenco: grezzo, origine: 'elenco di referenze' };
  if (!grezzo || typeof grezzo !== 'object') return null;
  if (grezzo.stato && typeof grezzo.stato === 'object') return trovaReferenze(grezzo.stato);
  const dove = [
    ['catalogo', 'export del catalogo'],
    ['fragranze', 'backup del gestionale'],
    ['referenze', 'elenco di referenze'],
  ];
  for (const [chiave, origine] of dove) {
    const voce = grezzo[chiave];
    if (Array.isArray(voce)) return { elenco: voce, origine };
    if (voce && typeof voce === 'object') return { elenco: Object.values(voce), origine };
  }
  return null;
}

/**
 * Legge un file di catalogo e ne tiene SOLO codice, categoria e attivo.
 * Qualsiasi altro campo — nome, brand, fornitore, costi, note, giacenze —
 * viene buttato via qui, prima di qualunque salvataggio: nel consulente
 * quei dati non devono esistere (regola numero uno, docs/01-brief.md).
 */
export function leggiCatalogo(grezzo) {
  const trovato = trovaReferenze(grezzo);
  if (!trovato) {
    throw new Error('non trovo le referenze. Va bene l\'export del catalogo, oppure un backup del gestionale.');
  }
  const referenze = [];
  const visti = new Set();
  let scartate = 0;
  for (const voce of trovato.elenco) {
    if (!voce || typeof voce !== 'object') { scartate++; continue; }
    const codice = String(voce.codice ?? voce.cod ?? '').trim();
    if (!/^\d{1,3}$/.test(codice)) { scartate++; continue; }
    const normalizzato = codice.padStart(3, '0');
    if (visti.has(normalizzato)) { scartate++; continue; }
    visti.add(normalizzato);
    referenze.push({
      codice: normalizzato,
      categoria: categoriaValida(voce.categoria) || categoriaDaCodice(normalizzato),
      attivo: voce.attivo === undefined ? true : Boolean(voce.attivo),
    });
  }
  if (!referenze.length) {
    throw new Error(`nessuna referenza con un codice a tre cifre (${trovato.elenco.length} voci lette).`);
  }
  referenze.sort((a, b) => a.codice.localeCompare(b.codice));
  return { referenze, origine: trovato.origine, scartate };
}

/** Solo l'elenco ripulito, per chi non ha bisogno del resoconto. */
export function ripulisciCatalogo(grezzo) {
  return leggiCatalogo(grezzo).referenze;
}

const CATEGORIE = ['UOMO', 'DONNA', 'NICCHIA', 'PREMIUM'];

function categoriaValida(valore) {
  // Il gestionale numera le categorie per tenerle in ordine ("02 DONNA"): il numero si butta.
  const c = String(valore || '').trim().toUpperCase().replace(/^\d+\s*[-.)]?\s*/, '');
  return CATEGORIE.includes(c) ? c : null;
}

export function categoriaDaCodice(codice) {
  const n = Number(codice);
  if (!Number.isFinite(n)) return 'UOMO';
  if (n < 200) return 'UOMO';
  if (n < 500) return 'DONNA';
  if (n < 800) return 'NICCHIA';
  return 'PREMIUM';
}

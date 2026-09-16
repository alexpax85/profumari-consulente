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
 * Dal catalogo del gestionale teniamo solo codice, categoria e attivo.
 * Qualunque altro campo (nome, brand, fornitore, costo) viene buttato via qui,
 * prima di qualsiasi salvataggio: nel consulente quei dati non devono esistere.
 */
export function ripulisciCatalogo(grezzo) {
  const elenco = Array.isArray(grezzo) ? grezzo : (grezzo && Array.isArray(grezzo.catalogo) ? grezzo.catalogo : null);
  if (!elenco) throw new Error('Il file non contiene un elenco di referenze.');
  const pulito = [];
  const visti = new Set();
  for (const voce of elenco) {
    if (!voce || typeof voce !== 'object') continue;
    const codice = String(voce.codice ?? voce.cod ?? '').trim();
    if (!/^\d{1,3}$/.test(codice)) continue;
    const normalizzato = codice.padStart(3, '0');
    if (visti.has(normalizzato)) continue;
    visti.add(normalizzato);
    pulito.push({
      codice: normalizzato,
      categoria: categoriaValida(voce.categoria) || categoriaDaCodice(normalizzato),
      attivo: voce.attivo === undefined ? true : Boolean(voce.attivo),
    });
  }
  if (!pulito.length) throw new Error('Nessuna referenza valida nel file.');
  pulito.sort((a, b) => a.codice.localeCompare(b.codice));
  return pulito;
}

const CATEGORIE = ['UOMO', 'DONNA', 'NICCHIA', 'PREMIUM'];

function categoriaValida(valore) {
  const c = String(valore || '').trim().toUpperCase();
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

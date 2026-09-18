// Caricamento dei dati di partenza: configurazione da app/config, catalogo e
// profili da dati/. In locale il server sta nella radice della repo (dati/ è una
// cartella sopra); su GitHub Pages il workflow copia i JSON dentro app/dati/.
// Si prova prima il percorso pubblicato, poi quello di sviluppo.

const FILE_CONFIG = ['accordi', 'domande', 'pesi', 'frasi', 'testi'];

/**
 * Versione dei profili di fabbrica. **Si alza di uno** ogni volta che
 * dati/profili.json cambia e la nuova versione deve diventare la base anche sui
 * dispositivi già in uso: all'avvio l'app se ne accorge e li sostituisce
 * (vedi aggiornaProfili e app.js). Chi apre l'app per la prima volta parte
 * sempre dai file, quindi non la guarda nemmeno.
 *   1 · 16/09/2026 · bozze ricostruite dagli originali
 *   2 · 17/09/2026 · profili costruiti sulle piramidi del fornitore
 */
export const VERSIONE_DATI = 2;

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

/**
 * Porta i profili del dispositivo alla nuova base di fabbrica, senza buttare via
 * il lavoro del personale: una scheda confermata (`rivisto`) resta com'è, e le
 * note interne si riportano sulla scheda nuova. I profili che esistono solo sul
 * dispositivo (aggiunti dal backoffice) restano dove sono.
 */
export function aggiornaProfili(salvati, predefiniti) {
  const vecchi = new Map((salvati || []).filter((p) => p && p.codice).map((p) => [String(p.codice), p]));
  const profili = [];
  let sostituiti = 0;
  let confermati = 0;
  let nuovi = 0;
  for (const nuovo of predefiniti || []) {
    if (!nuovo || !nuovo.codice) continue;
    const codice = String(nuovo.codice);
    const vecchio = vecchi.get(codice);
    vecchi.delete(codice);
    if (!vecchio) { profili.push(nuovo); nuovi++; continue; }
    if (vecchio.rivisto) { profili.push(vecchio); confermati++; continue; }
    profili.push(vecchio.noteStaff ? { ...nuovo, noteStaff: vecchio.noteStaff } : nuovo);
    sostituiti++;
  }
  const propri = [...vecchi.values()];
  profili.push(...propri);
  profili.sort((a, b) => String(a.codice).localeCompare(String(b.codice)));
  return { profili, sostituiti, confermati, nuovi, propri: propri.length };
}

// ------------------------------------------------- configurazione: si aggiorna sempre

/** Le domande stanno dentro { versione, nota, domande: [...] }, ma accettiamo anche l'array nudo. */
function elencoDi(voce, chiave) {
  if (Array.isArray(voce)) return voce;
  return voce && Array.isArray(voce[chiave]) ? voce[chiave] : [];
}

function conElenco(voce, chiave, elenco) {
  return Array.isArray(voce) ? elenco : { ...(voce || {}), [chiave]: elenco };
}

/** Aggiunge le chiavi che mancano e non tocca quelle che ci sono (frasi, testi, pesi). */
function fondiMancanti(salvato, difetto, conto) {
  if (!difetto || typeof difetto !== 'object' || Array.isArray(difetto)) {
    return salvato === undefined ? difetto : salvato;
  }
  if (!salvato || typeof salvato !== 'object' || Array.isArray(salvato)) {
    return salvato === undefined ? difetto : salvato;
  }
  const fuori = { ...salvato };
  for (const [chiave, valore] of Object.entries(difetto)) {
    if (!(chiave in fuori)) { fuori[chiave] = valore; conto.aggiunte++; }
    else fuori[chiave] = fondiMancanti(fuori[chiave], valore, conto);
  }
  return fuori;
}

/** Unisce due elenchi di voci con una chiave (accordi, famiglie): le nuove entrano in coda. */
function fondiElenco(salvato, difetto, chiave, conto) {
  const visti = new Set(salvato.map((v) => v && v[chiave]));
  const fuori = [...salvato];
  for (const voce of difetto) {
    if (voce && !visti.has(voce[chiave])) { fuori.push(voce); conto.aggiunte++; }
  }
  return fuori;
}

/**
 * Domande del dispositivo portate a quelle di fabbrica:
 *  · quelle che il personale ha modificato dal backoffice (`toccata`) restano com'erano;
 *  · le altre si riallineano al file, ma tengono peso e interruttore, che sono la sua taratura;
 *  · le domande nuove di fabbrica entrano, tranne quelle che ha cancellato (`rimosse`);
 *  · le domande scritte da lui restano dove sono.
 */
export function aggiornaDomande(salvate, predefinite, rimosse = []) {
  const cancellate = new Set(rimosse);
  const difettoPerId = new Map((predefinite || []).filter((d) => d && d.id).map((d) => [d.id, d]));
  const viste = new Set();
  const elenco = [];
  let riallineate = 0;
  let nuove = 0;

  for (const domanda of salvate || []) {
    if (!domanda || !domanda.id) continue;
    viste.add(domanda.id);
    const difetto = difettoPerId.get(domanda.id);
    if (!difetto || domanda.toccata) { elenco.push(domanda); continue; }
    const riallineata = { ...difetto };
    if (domanda.peso !== undefined) riallineata.peso = domanda.peso;
    if (domanda.attiva !== undefined) riallineata.attiva = domanda.attiva;
    elenco.push(riallineata);
    if (JSON.stringify(riallineata) !== JSON.stringify(domanda)) riallineate++;
  }

  (predefinite || []).forEach((domanda, i) => {
    if (!domanda || !domanda.id || viste.has(domanda.id) || cancellate.has(domanda.id)) return;
    elenco.splice(Math.min(i, elenco.length), 0, domanda);
    nuove++;
  });

  return { domande: elenco, nuove, riallineate };
}

/**
 * Configurazione del dispositivo + quello che è arrivato con l'app.
 * Gira a ogni avvio: è così che una domanda nuova, una frase nuova o un accordo
 * nuovo raggiungono un chiosco già in uso, senza cancellare la taratura del negozio.
 */
export function aggiornaConfig(salvata, difetto) {
  const conto = { aggiunte: 0 };
  const config = { ...difetto, ...salvata };

  const esitoDomande = aggiornaDomande(
    elencoDi(config.domande, 'domande'),
    elencoDi(difetto.domande, 'domande'),
    (salvata && salvata.domandeRimosse) || [],
  );
  config.domande = conElenco(config.domande || difetto.domande, 'domande', esitoDomande.domande);

  for (const chiave of ['frasi', 'testi', 'pesi']) {
    config[chiave] = fondiMancanti(config[chiave], difetto[chiave], conto);
  }

  if (difetto.accordi) {
    const accordi = fondiElenco(elencoDi(config.accordi, 'accordi'), elencoDi(difetto.accordi, 'accordi'), 'chiave', conto);
    const famiglie = fondiElenco(elencoDi(config.accordi, 'famiglie'), elencoDi(difetto.accordi, 'famiglie'), 'chiave', conto);
    config.accordi = { ...(difetto.accordi || {}), ...(config.accordi || {}), accordi, famiglie };
  }

  return {
    config,
    domandeNuove: esitoDomande.nuove,
    domandeRiallineate: esitoDomande.riallineate,
    vociAggiunte: conto.aggiunte,
    novita: esitoDomande.nuove + esitoDomande.riallineate + conto.aggiunte,
  };
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

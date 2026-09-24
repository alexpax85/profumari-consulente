// Motore di raccomandazione del consulente olfattivo — docs/04-motore.md.
// Puro e deterministico: niente DOM, niente rete, niente Math.random.
// Si prova con:  node scripts/test_motore.mjs
//
// config = { accordi, domande, pesi, frasi } (il contenuto dei file di app/config).

export const ATTRIBUTI = ['intensita', 'persistenza', 'dolcezza', 'freschezza'];
export const STAGIONI = ['primavera', 'estate', 'autunno', 'inverno'];
export const MOMENTI = ['giorno', 'sera'];

const PESI_PREDEFINITI = {
  coseno: 0.6, attributi: 0.15, contesto: 0.1, carattere: 0.05,
  esclusione: 1, confidenzaBassa: 0.03, neutro: 0.5,
  sogliaMinima: 0.25, esclusioneFuori: 0.5,
  maxPerSottofamiglia: 1, maxPerFamiglia: 2, proposte: 3,
  accordiDefault: { agrumato: 0.5, muschiato: 0.5, legnoso: 0.4, ambrato: 0.3, 'floreale-fresco': 0.35 },
};

const ORDINE_CONFIDENZA = { alta: 0, media: 1, bassa: 2 };

// ---------------------------------------------------------------- utilità

function numero(v, predefinito = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : predefinito;
}

/** Accetta sia il contenuto di accordi.json sia un semplice array. */
export function elencoAccordi(config) {
  const a = config && config.accordi;
  if (Array.isArray(a)) return a;
  if (a && Array.isArray(a.accordi)) return a.accordi;
  return [];
}

export function chiaviAccordi(config) {
  return elencoAccordi(config).map((a) => (typeof a === 'string' ? a : a.chiave));
}

export function elencoDomande(config) {
  const d = config && config.domande;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.domande)) return d.domande;
  return [];
}

export function elencoFamiglie(config) {
  const a = config && config.accordi;
  return (a && Array.isArray(a.famiglie)) ? a.famiglie : [];
}

export function pesiDi(config) {
  return { ...PESI_PREDEFINITI, ...((config && config.pesi) || {}) };
}

/** Etichetta leggibile di un accordo ("legni", "spezie"): mai gergo tecnico. */
export function etichettaAccordo(chiave, config) {
  const trovato = elencoAccordi(config).find((a) => a.chiave === chiave);
  return (trovato && trovato.etichetta) || chiave;
}

export function etichettaFamiglia(chiave, config) {
  const trovata = elencoFamiglie(config).find((f) => f.chiave === chiave);
  return trovata || { chiave, etichetta: chiave, semplice: '' };
}

/**
 * Solo le referenze attive entrano nel motore (regola non negoziabile).
 * Attacca al profilo la categoria di listino del catalogo.
 */
export function profiliAttivi(catalogo, profili) {
  const attivi = new Map();
  for (const voce of catalogo || []) {
    if (voce && voce.attivo && voce.codice) attivi.set(String(voce.codice), voce.categoria || null);
  }
  return (profili || []).filter((p) => p && attivi.has(String(p.codice)))
    .map((p) => (p.categoria ? p : { ...p, categoria: attivi.get(String(p.codice)) }));
}

// ------------------------------------------- 1. dalle risposte al desiderato

function condizioneSoddisfatta(domanda, risposte) {
  const c = domanda.soloSe;
  if (!c) return true;
  const data = risposte[c.domanda];
  if (Array.isArray(data)) return data.includes(c.valore);
  return data === c.valore;
}

function aggiungiUnico(elenco, valori) {
  for (const v of valori || []) if (v && !elenco.includes(v)) elenco.push(v);
}

function massimo(mappa, chiave, valore) {
  if (!(chiave in mappa) || mappa[chiave] < valore) mappa[chiave] = valore;
}

/**
 * Profilo desiderato: stessa forma di un profilo di fragranza, più esclusioni e filtri.
 * Le scelte multiple dividono il peso per il numero di scelte (chi sceglie tre luoghi
 * non pesa più di chi ne sceglie uno); le esclusioni no, perché ognuna è un veto a sé.
 */
export function costruisciDesiderato(risposte, config) {
  const pesi = pesiDi(config);
  const desiderato = {
    accordi: {}, attributi: {}, stagioni: {}, momento: {},
    occasioni: [], carattere: [],
    esclusioni: {}, esclusioniAttributi: {},
    filtri: { genere: null, categorie: null },
    modo: 'me',
    domandeRisposte: [],
    generico: false,
  };
  const attributiParziali = {}; // { attributo: { somma, peso } } per la media pesata

  for (const domanda of elencoDomande(config)) {
    if (domanda.attiva === false) continue;
    if (!condizioneSoddisfatta(domanda, risposte)) continue;
    const risposta = risposte ? risposte[domanda.id] : undefined;
    if (risposta === undefined || risposta === null || risposta === '') continue;
    if (Array.isArray(risposta) && risposta.length === 0) continue;
    const pesoDomanda = numero(domanda.peso, 1);

    // Scala 1-5: il valore va sugli attributi indicati dalla domanda.
    if (domanda.tipo === 'scala') {
      const valore = Math.max(numero(domanda.min, 1), Math.min(numero(domanda.max, 5), numero(risposta, 3)));
      for (const attributo of domanda.attributiScala || []) {
        const p = attributiParziali[attributo] || (attributiParziali[attributo] = { somma: 0, peso: 0 });
        p.somma += valore * pesoDomanda;
        p.peso += pesoDomanda;
      }
      desiderato.domandeRisposte.push(domanda.id);
      continue;
    }

    const scelte = (Array.isArray(risposta) ? risposta : [risposta])
      .map((id) => (domanda.opzioni || []).find((o) => o.id === id))
      .filter(Boolean);
    if (!scelte.length) continue;
    desiderato.domandeRisposte.push(domanda.id);
    const pesoScelta = pesoDomanda / scelte.length;

    for (const opzione of scelte) {
      if (opzione.modo) desiderato.modo = opzione.modo;
      for (const [k, v] of Object.entries(opzione.accordi || {})) {
        desiderato.accordi[k] = numero(desiderato.accordi[k]) + numero(v) * pesoScelta;
      }
      for (const [k, v] of Object.entries(opzione.attributi || {})) {
        const p = attributiParziali[k] || (attributiParziali[k] = { somma: 0, peso: 0 });
        p.somma += numero(v) * pesoScelta;
        p.peso += pesoScelta;
      }
      for (const [k, v] of Object.entries(opzione.stagioni || {})) massimo(desiderato.stagioni, k, numero(v) * pesoDomanda);
      for (const [k, v] of Object.entries(opzione.momento || {})) massimo(desiderato.momento, k, numero(v) * pesoDomanda);
      aggiungiUnico(desiderato.occasioni, opzione.occasioni);
      aggiungiUnico(desiderato.carattere, opzione.carattere);
      // Veti: non si dividono fra le scelte e non si sottraggono al desiderato.
      for (const [k, v] of Object.entries(opzione.escludi || {})) {
        massimo(desiderato.esclusioni, k, numero(v) * pesoDomanda);
      }
      for (const [k, regola] of Object.entries(opzione.escludiAttributi || {})) {
        const peso = numero(regola.peso, 1) * pesoDomanda;
        const attuale = desiderato.esclusioniAttributi[k];
        if (!attuale || attuale.peso < peso) {
          desiderato.esclusioniAttributi[k] = { da: numero(regola.da, 4), peso };
        }
      }
      if (opzione.filtro && 'genere' in opzione.filtro) desiderato.filtri.genere = opzione.filtro.genere || null;
      if (opzione.filtro && Array.isArray(opzione.filtro.categorie)) desiderato.filtri.categorie = opzione.filtro.categorie;
    }
  }

  for (const [attributo, p] of Object.entries(attributiParziali)) {
    if (p.peso > 0) desiderato.attributi[attributo] = p.somma / p.peso;
  }

  // Nessuna risposta utile: si parte dai gusti più universali invece di non proporre nulla.
  if (norma(desiderato.accordi) < 1e-9) {
    desiderato.accordi = { ...(pesi.accordiDefault || {}) };
    desiderato.generico = true;
  }
  return desiderato;
}

// ------------------------------------------------------------ 2. punteggio

function norma(vettore) {
  let somma = 0;
  for (const v of Object.values(vettore || {})) somma += numero(v) * numero(v);
  return Math.sqrt(somma);
}

export function coseno(a, b, chiavi) {
  const elenco = chiavi && chiavi.length
    ? chiavi
    : [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
  let prodotto = 0, na = 0, nb = 0;
  for (const k of elenco) {
    const va = numero(a && a[k]), vb = numero(b && b[k]);
    prodotto += va * vb; na += va * va; nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return prodotto / (Math.sqrt(na) * Math.sqrt(nb));
}

function vicinanzaAttributi(desiderato, profilo) {
  const scarti = [];
  for (const a of ATTRIBUTI) {
    const d = desiderato.attributi[a];
    const p = profilo[a];
    if (typeof d !== 'number' || typeof p !== 'number') continue;
    scarti.push(Math.min(1, Math.abs(d - p) / 4));
  }
  if (!scarti.length) return null;
  return 1 - scarti.reduce((s, v) => s + v, 0) / scarti.length;
}

function mediaPesata(desiderata, profilate) {
  let somma = 0, peso = 0;
  for (const [k, v] of Object.entries(desiderata || {})) {
    const p = numero(v);
    if (p <= 0) continue;
    somma += p * numero(profilate && profilate[k]);
    peso += p;
  }
  return peso > 0 ? somma / peso : null;
}

function contesto(desiderato, profilo) {
  const parti = [];
  const stagione = mediaPesata(desiderato.stagioni, profilo.stagioni);
  if (stagione !== null) parti.push(stagione);
  const momento = mediaPesata(desiderato.momento, profilo.momento);
  if (momento !== null) parti.push(momento);
  if (desiderato.occasioni.length) {
    const presenti = desiderato.occasioni.filter((o) => (profilo.occasioni || []).includes(o)).length;
    parti.push(presenti / desiderato.occasioni.length);
  }
  if (!parti.length) return null;
  return parti.reduce((s, v) => s + v, 0) / parti.length;
}

function quotaCarattere(desiderato, profilo) {
  if (!desiderato.carattere.length) return null;
  const presenti = desiderato.carattere.filter((c) => (profilo.carattere || []).includes(c)).length;
  return presenti / desiderato.carattere.length;
}

/** Quanto il profilo urta contro un veto: 0 (nessuno) … 1 (in pieno). */
function esclusione(desiderato, profilo) {
  let massima = 0;
  for (const [k, v] of Object.entries(desiderato.esclusioni || {})) {
    const urto = numero(v) * numero(profilo.accordi && profilo.accordi[k]);
    if (urto > massima) massima = urto;
  }
  for (const [attributo, regola] of Object.entries(desiderato.esclusioniAttributi || {})) {
    const valore = profilo[attributo];
    if (typeof valore !== 'number') continue;
    const soglia = numero(regola.da, 4);
    if (valore < soglia) continue;
    const quota = (valore - (soglia - 1)) / (5 - (soglia - 1));
    const urto = numero(regola.peso, 1) * Math.min(1, quota);
    if (urto > massima) massima = urto;
  }
  return Math.min(1, massima);
}

/** Gli accordi su cui desiderato e profilo si sovrappongono di più. */
export function accordiComuni(desiderato, profilo, config, quanti = 2) {
  const chiavi = chiaviAccordi(config);
  const massimoDesiderato = Math.max(...Object.values(desiderato.accordi || {}).map((v) => numero(v)), 0);
  if (massimoDesiderato <= 0) return [];
  return chiavi
    .map((k) => {
      const d = numero(desiderato.accordi[k]) / massimoDesiderato;
      const p = numero(profilo.accordi && profilo.accordi[k]);
      return { chiave: k, peso: d * p, profilo: p, desiderato: d };
    })
    .filter((v) => v.desiderato >= 0.2 && v.profilo >= 0.2)
    .sort((a, b) => b.peso - a.peso || a.chiave.localeCompare(b.chiave))
    .slice(0, quanti)
    .map((v) => ({ chiave: v.chiave, etichetta: etichettaAccordo(v.chiave, config), peso: v.peso }));
}

/** Punteggio con le sue componenti: serve al backoffice e alle motivazioni. */
export function dettaglioPunteggio(desiderato, profilo, config) {
  const pesi = pesiDi(config);
  const neutro = numero(pesi.neutro, 0.5);
  const cos = coseno(desiderato.accordi, profilo.accordi, chiaviAccordi(config));
  const att = vicinanzaAttributi(desiderato, profilo);
  const ctx = contesto(desiderato, profilo);
  const car = quotaCarattere(desiderato, profilo);
  const esc = esclusione(desiderato, profilo);
  const penalitaConfidenza = profilo.confidenza === 'bassa' ? numero(pesi.confidenzaBassa) : 0;
  const totale = pesi.coseno * cos
    + pesi.attributi * (att === null ? neutro : att)
    + pesi.contesto * (ctx === null ? neutro : ctx)
    + pesi.carattere * (car === null ? neutro : car)
    - pesi.esclusione * esc
    - penalitaConfidenza;
  return { totale, coseno: cos, attributi: att, contesto: ctx, carattere: car, esclusione: esc, penalitaConfidenza };
}

export function punteggio(desiderato, profilo, config) {
  return dettaglioPunteggio(desiderato, profilo, config).totale;
}

// --------------------------------------------------------------- 3. filtri

export function passaFiltri(profilo, desiderato) {
  const filtri = (desiderato && desiderato.filtri) || {};
  if (filtri.genere) {
    const genere = profilo.genere || 'unisex';
    if (genere !== 'unisex' && genere !== filtri.genere) return false;
  }
  if (Array.isArray(filtri.categorie) && filtri.categorie.length && profilo.categoria) {
    if (!filtri.categorie.includes(profilo.categoria)) return false;
  }
  return true;
}

// ---------------------------------------------------------- 4. motivazioni

function indiceStabile(codice, quanti) {
  if (quanti <= 1) return 0;
  let somma = 0;
  for (const carattere of String(codice || '')) somma += carattere.charCodeAt(0);
  return somma % quanti;
}

/**
 * Sceglie un modello in modo stabile dal codice, saltando quelli già usati dalle
 * altre schede: tre proposte non devono dire la stessa identica frase.
 */
function modello(elenco, codice, usate) {
  if (!Array.isArray(elenco) || !elenco.length) return null;
  const partenza = indiceStabile(codice, elenco.length);
  for (let passo = 0; passo < elenco.length; passo++) {
    const testo = elenco[(partenza + passo) % elenco.length];
    if (!usate || !usate.has(testo)) return testo;
  }
  return elenco[partenza];
}

/**
 * Due o tre frasi brevi: mai numeri, mai nomi commerciali, mai gergo.
 * `usate` (facoltativo) raccoglie i modelli già impiegati nella stessa rosa.
 */
export function spiega(desiderato, profilo, config, usate = null) {
  const frasi = (config && config.frasi) || {};
  const motivi = [];
  const comuni = accordiComuni(desiderato, profilo, config, 2);

  if (comuni.length >= 2) {
    const testo = modello(frasi.accordiDue, profilo.codice, usate);
    if (testo) {
      if (usate) usate.add(testo);
      motivi.push(testo.replace('{a}', comuni[0].etichetta).replace('{b}', comuni[1].etichetta));
    }
  } else if (comuni.length === 1) {
    const testo = modello(frasi.accordoUno, profilo.codice, usate);
    if (testo) {
      if (usate) usate.add(testo);
      motivi.push(testo.replace('{a}', comuni[0].etichetta));
    }
  }

  // Un attributo azzeccato: il più vicino fra quelli chiesti, purché netto.
  const candidati = ATTRIBUTI
    .filter((a) => typeof desiderato.attributi[a] === 'number' && typeof profilo[a] === 'number')
    .filter((a) => Math.abs(desiderato.attributi[a] - profilo[a]) <= 1)
    .filter((a) => profilo[a] <= 2 || profilo[a] >= 4)
    .sort((a, b) => Math.abs(desiderato.attributi[a] - profilo[a]) - Math.abs(desiderato.attributi[b] - profilo[b]));
  if (candidati.length) {
    const attributo = candidati[0];
    const gruppo = (frasi.attributi || {})[attributo];
    const testo = gruppo && (profilo[attributo] >= 4 ? gruppo.alto : gruppo.basso);
    if (testo) motivi.push(testo);
  }

  // Un aggettivo di carattere in comune.
  const carattere = desiderato.carattere.find((c) => (profilo.carattere || []).includes(c));
  if (carattere && (frasi.carattere || {})[carattere]) motivi.push(frasi.carattere[carattere]);

  // Se non c'è ancora niente di specifico: occasione, stagione, oppure una frase generica.
  if (motivi.length < 2) {
    const occasione = desiderato.occasioni.find((o) => (profilo.occasioni || []).includes(o));
    if (occasione && (frasi.occasioni || {})[occasione]) motivi.push(frasi.occasioni[occasione]);
  }
  if (motivi.length < 2) {
    const stagione = Object.keys(desiderato.stagioni)
      .filter((s) => numero(profilo.stagioni && profilo.stagioni[s]) >= 0.7)
      .sort((a, b) => numero(desiderato.stagioni[b]) - numero(desiderato.stagioni[a]))[0];
    if (stagione && (frasi.stagioni || {})[stagione]) motivi.push(frasi.stagioni[stagione]);
  }
  if (!motivi.length) {
    const generica = modello(frasi.generiche, profilo.codice, usate);
    if (generica) motivi.push(generica);
  }
  return motivi.slice(0, 3);
}

// ------------------------------------------------- 5. scelta dei tre + riserva

function confronta(a, b) {
  if (b.totale !== a.totale) return b.totale - a.totale;
  const ca = ORDINE_CONFIDENZA[a.profilo.confidenza] ?? 1;
  const cb = ORDINE_CONFIDENZA[b.profilo.confidenza] ?? 1;
  if (ca !== cb) return ca - cb;
  return String(a.profilo.codice).localeCompare(String(b.profilo.codice));
}

/**
 * Sceglie i tre (o quanti) fra i candidati già ordinati, al massimo uno per
 * sottofamiglia e due per famiglia, allargando per gradi quando non bastano.
 * La usa anche consulente.js: la diversità della rosa è la stessa per tutte le porte.
 */
export function scegliConDiversita(candidati, quanti, pesi, maxFamiglia) {
  const perSf = numero(pesi.maxPerSottofamiglia, 1);
  const perFam = numero(maxFamiglia, numero(pesi.maxPerFamiglia, 2));
  const fasi = [
    { soglia: numero(pesi.sogliaMinima, 0.25), sottofamiglia: perSf, famiglia: perFam },
    { soglia: -Infinity, sottofamiglia: perSf, famiglia: perFam },
    { soglia: -Infinity, sottofamiglia: Infinity, famiglia: perFam },
    { soglia: -Infinity, sottofamiglia: Infinity, famiglia: Infinity },
  ];
  const scelti = [];
  const perSottofamiglia = new Map();
  const perFamiglia = new Map();
  let allargato = false;

  for (let f = 0; f < fasi.length && scelti.length < quanti; f++) {
    const fase = fasi[f];
    for (const candidato of candidati) {
      if (scelti.length >= quanti) break;
      if (scelti.includes(candidato)) continue;
      if (candidato.totale < fase.soglia) continue;
      const sf = candidato.profilo.sottofamiglia || candidato.profilo.famiglia || '';
      const fa = candidato.profilo.famiglia || '';
      if ((perSottofamiglia.get(sf) || 0) >= fase.sottofamiglia) continue;
      if ((perFamiglia.get(fa) || 0) >= fase.famiglia) continue;
      scelti.push(candidato);
      perSottofamiglia.set(sf, (perSottofamiglia.get(sf) || 0) + 1);
      perFamiglia.set(fa, (perFamiglia.get(fa) || 0) + 1);
      if (f > 0) allargato = true;
    }
  }
  return { scelti, allargato };
}

function proposta(candidato, desiderato, config, usate) {
  const p = candidato.profilo;
  const famiglia = etichettaFamiglia(p.famiglia, config);
  return {
    codice: p.codice,
    punteggio: candidato.totale,
    famiglia: p.famiglia,
    famigliaEtichetta: famiglia.etichetta,
    famigliaSemplice: famiglia.semplice,
    sottofamiglia: p.sottofamiglia || '',
    descrizione: p.descrizione || '',
    confidenza: p.confidenza || 'media',
    motivi: spiega(desiderato, p, config, usate),
    accordiComuni: accordiComuni(desiderato, p, config, 3),
    dettaglio: candidato,
  };
}

/**
 * Tre codici da provare, più una riserva.
 * profili: già filtrati per attivo = true (vedi profiliAttivi).
 */
export function raccomanda(risposte, profili, config, opzioni = {}) {
  const pesi = pesiDi(config);
  const quanti = numero(opzioni.n, numero(pesi.proposte, 3));
  const desiderato = opzioni.desiderato || costruisciDesiderato(risposte, config);

  const candidati = (profili || [])
    .filter((p) => p && p.codice && passaFiltri(p, desiderato))
    .map((p) => ({ profilo: p, ...dettaglioPunteggio(desiderato, p, config) }))
    // Un veto colpito in pieno toglie la fragranza dalla rosa: non torna nemmeno allargando.
    .filter((c) => c.esclusione < numero(pesi.esclusioneFuori, 0.5))
    .sort(confronta);

  // Senza risposte utili la rosa si allarga di proposito: una famiglia sola per proposta,
  // così chi non ha detto niente si vede tre strade diverse invece di tre varianti.
  const maxFamiglia = desiderato.generico ? 1 : numero(pesi.maxPerFamiglia, 2);
  const { scelti, allargato } = scegliConDiversita(candidati, quanti, pesi, maxFamiglia);

  // Riserva: il migliore fra i rimasti, preferendo una sottofamiglia diversa dalle tre.
  const usate = new Set(scelti.map((c) => c.profilo.sottofamiglia || c.profilo.famiglia || ''));
  const restanti = candidati.filter((c) => !scelti.includes(c));
  const riserva = restanti.find((c) => !usate.has(c.profilo.sottofamiglia || c.profilo.famiglia || '')) || restanti[0] || null;

  const modelliUsati = new Set();
  return {
    proposte: scelti.map((c) => proposta(c, desiderato, config, modelliUsati)),
    riserva: riserva ? proposta(riserva, desiderato, config, modelliUsati) : null,
    desiderato,
    allargato,
    candidati: candidati.length,
  };
}

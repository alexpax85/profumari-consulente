// Il consulente a parole: dal desiderio (interpreta.js) ai tre codici da provare,
// con il perché scritto sulla piramide (docs/13-consulente.md).
// Puro e deterministico come motore.js e ricerca.js: stessa frase, stessi codici.
// Si prova con:  node scripts/test_consulente.mjs
//
// Il punteggio è quello del percorso guidato (somiglianza degli accordi, misure,
// stagione, carattere, veti) più una parte che il percorso guidato non ha: le
// note. Chi racconta "un caffè con la cannella" deve trovare caffè e cannella in
// piramide, non solo "qualcosa di gourmand".

import {
  chiaviAccordi, coseno, passaFiltri, etichettaAccordo, etichettaFamiglia, scegliConDiversita,
  ATTRIBUTI,
} from './motore.js';
import { noteDelProfilo, tabellaNote, tabellaSinonimi, normalizzaNota, piramide } from './ricerca.js';

const PREDEFINITI = {
  accordi: 0.42,          // somiglianza fra gli accordi chiesti e quelli della fragranza
  note: 0.33,             // le note chieste, trovate in piramide
  attributi: 0.12,        // intensità, persistenza, dolcezza, freschezza
  contesto: 0.08,         // stagione, momento, occasione
  carattere: 0.05,
  esclusione: 1,          // quanto toglie un veto colpito
  esclusioneFuori: 0.5,   // da qui in su il veto la toglie dalla rosa
  confidenzaBassa: 0.03,
  affinitaNota: 0.4,      // una nota chiesta che non c'è, ma con la sua famiglia forte
  sogliaMinima: 0.2,
  proposte: 3,
  maxPerSottofamiglia: 1,
  maxPerFamiglia: 2,
  pesiFila: { testa: 0.85, cuore: 1, fondo: 1 },
};

const ORDINE_CONFIDENZA = { alta: 0, media: 1, bassa: 2 };
const DOVE = { testa: 'in testa', cuore: 'nel cuore', fondo: 'sul fondo' };

function numero(v, predefinito = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : predefinito;
}

export function pesiConsulente(config) {
  const suoi = ((config && config.consulente) || {}).pesi || {};
  return { ...PREDEFINITI, ...suoi, pesiFila: { ...PREDEFINITI.pesiFila, ...(suoi.pesiFila || {}) } };
}

/** Le forme sotto cui cercare una nota (lei più i suoi sinonimi). */
function formeDi(nota, sinonimi) {
  const chiave = normalizzaNota(nota);
  const capo = sinonimi.verso.get(chiave) || chiave;
  return sinonimi.dentro.get(capo) || [chiave];
}

/** Dove sta una nota nella piramide di questo profilo, se c'è. */
function trovaNota(nota, sue, sinonimi) {
  let migliore = null;
  for (const forma of formeDi(nota, sinonimi)) {
    const voce = sue.get(forma);
    if (voce && (!migliore || voce.peso > migliore.peso)) migliore = voce;
  }
  return migliore;
}

/** Quanto la famiglia di una nota è forte in questa fragranza (0-1). */
function forzaFamiglia(nota, profilo, tabella) {
  const accordi = tabella.get(normalizzaNota(nota));
  if (!accordi) return 0;
  let massima = 0;
  for (const [k, v] of Object.entries(accordi)) {
    massima = Math.max(massima, numero((profilo.accordi || {})[k]) * numero(v));
  }
  return Math.min(1, massima);
}

// ------------------------------------------------------------- 1. il punteggio

function quotaNote(desiderio, profilo, sue, contesto, pesi) {
  const voci = Object.entries(desiderio.note || {});
  if (!voci.length) return null;
  let somma = 0;
  let peso = 0;
  for (const [nota, w] of voci) {
    const trovata = trovaNota(nota, sue, contesto.sinonimi);
    const valore = trovata ? trovata.peso : pesi.affinitaNota * forzaFamiglia(nota, profilo, contesto.tabella);
    somma += w * valore;
    peso += w;
  }
  return peso > 0 ? somma / peso : null;
}

function vicinanzaAttributi(desiderio, profilo) {
  const scarti = [];
  for (const a of ATTRIBUTI) {
    const d = desiderio.attributi[a];
    const p = profilo[a];
    if (typeof d !== 'number' || typeof p !== 'number') continue;
    scarti.push(Math.min(1, Math.abs(d - p) / 4));
  }
  return scarti.length ? 1 - scarti.reduce((s, v) => s + v, 0) / scarti.length : null;
}

function mediaPesata(desiderate, profilate) {
  let somma = 0;
  let peso = 0;
  for (const [k, v] of Object.entries(desiderate || {})) {
    if (numero(v) <= 0) continue;
    somma += numero(v) * numero(profilate && profilate[k]);
    peso += numero(v);
  }
  return peso > 0 ? somma / peso : null;
}

function quotaContesto(desiderio, profilo) {
  const parti = [];
  const stagione = mediaPesata(desiderio.stagioni, profilo.stagioni);
  if (stagione !== null) parti.push(stagione);
  const momento = mediaPesata(desiderio.momento, profilo.momento);
  if (momento !== null) parti.push(momento);
  if (desiderio.occasioni.length) {
    parti.push(desiderio.occasioni.filter((o) => (profilo.occasioni || []).includes(o)).length / desiderio.occasioni.length);
  }
  return parti.length ? parti.reduce((s, v) => s + v, 0) / parti.length : null;
}

function quotaCarattere(desiderio, profilo) {
  if (!desiderio.carattere.length) return null;
  return desiderio.carattere.filter((c) => (profilo.carattere || []).includes(c)).length / desiderio.carattere.length;
}

function urtoVeti(desiderio, profilo) {
  let massimo = 0;
  for (const [k, v] of Object.entries(desiderio.esclusioni || {})) {
    massimo = Math.max(massimo, numero(v) * numero((profilo.accordi || {})[k]));
  }
  for (const [attributo, regola] of Object.entries(desiderio.esclusioniAttributi || {})) {
    const valore = profilo[attributo];
    if (typeof valore !== 'number') continue;
    const soglia = numero(regola.da, 4);
    if (valore < soglia) continue;
    const quota = (valore - (soglia - 1)) / (5 - (soglia - 1));
    massimo = Math.max(massimo, numero(regola.peso, 1) * Math.min(1, quota));
  }
  return Math.min(1, massimo);
}

/**
 * Il punteggio con le sue parti. Si fa la media solo sulle parti che la frase ha
 * toccato: chi parla solo di note non viene giudicato sulla stagione, che non ha detto.
 */
export function dettaglioConsulto(desiderio, profilo, config, contesto = preparaContesto(config)) {
  const pesi = pesiConsulente(config);
  const sue = noteDelProfilo(profilo, pesi.pesiFila);
  const parti = {
    accordi: Object.keys(desiderio.accordi || {}).length
      ? coseno(desiderio.accordi, profilo.accordi, chiaviAccordi(config)) : null,
    note: quotaNote(desiderio, profilo, sue, contesto, pesi),
    attributi: vicinanzaAttributi(desiderio, profilo),
    contesto: quotaContesto(desiderio, profilo),
    carattere: quotaCarattere(desiderio, profilo),
  };
  let somma = 0;
  let peso = 0;
  for (const [nome, valore] of Object.entries(parti)) {
    if (valore === null) continue;
    somma += numero(pesi[nome]) * valore;
    peso += numero(pesi[nome]);
  }
  const esclusione = urtoVeti(desiderio, profilo);
  const penalitaConfidenza = profilo.confidenza === 'bassa' ? numero(pesi.confidenzaBassa) : 0;
  const totale = (peso > 0 ? somma / peso : 0) - pesi.esclusione * esclusione - penalitaConfidenza;
  const vetoNota = (desiderio.noteEscluse || []).some((n) => trovaNota(n, sue, contesto.sinonimi));
  return { totale, ...parti, esclusione, penalitaConfidenza, vetoNota };
}

function preparaContesto(config) {
  return { tabella: tabellaNote(config), sinonimi: tabellaSinonimi(config) };
}

// --------------------------------------------------------- 2. il perché

function elenco(parole) {
  if (parole.length <= 1) return parole.join('');
  const ultima = parole[parole.length - 1];
  // "agrumi ed erbe": la d eufonica davanti a una e, come si scrive.
  return `${parole.slice(0, -1).join(', ')} ${/^e/i.test(ultima) ? 'ed' : 'e'} ${ultima}`;
}

/** "abete e cipresso in testa, vetiver sul fondo": le note ritrovate, dove stanno. */
function noteAlloro(posto, trovate) {
  const perFila = { testa: [], cuore: [], fondo: [] };
  for (const t of trovate) if (perFila[t.fila] && !perFila[t.fila].includes(t.nome)) perFila[t.fila].push(t.nome);
  return ['testa', 'cuore', 'fondo']
    .filter((f) => perFila[f].length)
    .map((f) => `${elenco(perFila[f])} ${posto[f]}`)
    .join(', ');
}

function maiuscola(testo) {
  return testo ? testo[0].toUpperCase() + testo.slice(1) : testo;
}

/**
 * Due o tre frasi brevi, legate a quello che il cliente ha detto: "Per il bosco
 * d'inverno: abete in testa, vetiver sul fondo." Mai numeri, mai gergo, mai nomi
 * commerciali (i nomi delle note vengono dalla piramide, le immagini dal lessico).
 */
export function spiegaConsulto(desiderio, profilo, config, contesto = preparaContesto(config)) {
  const frasi = ((config && config.consulente) || {}).frasi || {};
  const posto = { ...DOVE, ...(frasi.dove || {}) };
  const pesi = pesiConsulente(config);
  const sue = noteDelProfilo(profilo, pesi.pesiFila);
  const motivi = [];
  const giaDette = new Set();
  const accordiDetti = new Set();
  // Le note da profumiere o troppo generiche ("agrumi", "note legnose") nella
  // piramide ci stanno, ma in una motivazione suonano vuote: "Per il mare: agrumi."
  const generiche = new Set(((((config && config.ricerca) || {}).nascoste || {}).elenco || []).map(normalizzaNota));

  const volute = (desiderio.capito || []).filter((c) => ['si', 'forte', 'poco'].includes(c.modo));
  const candidati = [];
  for (const c of volute) {
    const voce = contesto.voci ? contesto.voci.get(c.chiave) : null;
    const note = Object.entries((voce && voce.note) || {}).sort((a, b) => b[1] - a[1]);
    const trovate = [];
    for (const [nota] of note) {
      const t = trovaNota(nota, sue, contesto.sinonimi);
      if (t && !generiche.has(normalizzaNota(t.nome))) trovate.push(t);
    }
    const accordi = Object.entries((voce && voce.accordi) || {})
      .filter(([k, v]) => v >= 0.4 && numero((profilo.accordi || {})[k]) >= 0.4)
      .sort((a, b) => b[1] * numero(profilo.accordi[b[0]]) - a[1] * numero(profilo.accordi[a[0]]))
      .map(([k]) => k);
    candidati.push({ c, voce, trovate, accordi, forza: trovate.length * 2 + accordi.length });
  }
  candidati.sort((a, b) => b.forza - a.forza);

  for (const { c, trovate, accordi } of candidati) {
    if (motivi.length >= 2) break;
    const nuove = trovate.filter((t) => !giaDette.has(t.nome)).slice(0, 3);
    if (c.tipo === 'nota') {
      if (!nuove.length) continue;
      nuove.forEach((t) => giaDette.add(t.nome));
      motivi.push((frasi.nota || '{note}, come chiedevi.').replace('{note}', maiuscola(noteAlloro(posto, nuove))));
      continue;
    }
    if (c.tipo === 'famiglia') {
      if (!accordi.length) continue;
      motivi.push((frasi.famiglia || '{famiglia} in primo piano, come chiedevi.')
        .replace('{famiglia}', maiuscola(etichettaAccordo(accordi[0], config))));
      continue;
    }
    if (nuove.length) {
      nuove.forEach((t) => giaDette.add(t.nome));
      motivi.push((frasi.scenaNote || 'Per {evoca}: {note}.')
        .replace('{evoca}', c.evoca).replace('{note}', noteAlloro(posto, nuove)));
    } else if (!trovate.length) {
      // Una scena le cui note sono già state dette non si ripete con altre parole.
      const etichette = accordi.filter((k) => !accordiDetti.has(k)).slice(0, 2);
      if (!etichette.length) continue;
      etichette.forEach((k) => accordiDetti.add(k));
      motivi.push((frasi.scenaAccordi || 'Per {evoca}: {accordi}.')
        .replace('{evoca}', c.evoca).replace('{accordi}', elenco(etichette.map((k) => etichettaAccordo(k, config)))));
    }
  }

  // Una misura azzeccata, se netta: "Fresco, come cercavi."
  const attributi = (config && config.frasi && config.frasi.attributi) || {};
  const misura = ATTRIBUTI
    .filter((a) => typeof desiderio.attributi[a] === 'number' && typeof profilo[a] === 'number')
    .filter((a) => Math.abs(desiderio.attributi[a] - profilo[a]) <= 1 && (profilo[a] <= 2 || profilo[a] >= 4))
    .sort((a, b) => Math.abs(desiderio.attributi[a] - profilo[a]) - Math.abs(desiderio.attributi[b] - profilo[b]))[0];
  if (misura && motivi.length < 3) {
    const testo = attributi[misura] && (profilo[misura] >= 4 ? attributi[misura].alto : attributi[misura].basso);
    if (testo) motivi.push(testo);
  }

  if (!motivi.length) {
    const famiglia = etichettaFamiglia(profilo.famiglia, config);
    motivi.push((frasi.vicino || 'Non ha tutto, ma è il più vicino a quello che racconti: {famiglia}.')
      .replace('{famiglia}', famiglia.etichetta));
  }
  return motivi.slice(0, 3);
}

// ------------------------------------------------------ 3. i tre codici

function confronta(a, b) {
  if (b.totale !== a.totale) return b.totale - a.totale;
  const ca = ORDINE_CONFIDENZA[a.profilo.confidenza] ?? 1;
  const cb = ORDINE_CONFIDENZA[b.profilo.confidenza] ?? 1;
  if (ca !== cb) return ca - cb;
  return String(a.profilo.codice).localeCompare(String(b.profilo.codice));
}

/** Le note e le famiglie da accendere sulla piramide di un risultato. */
export function criteriDaAccendere(desiderio) {
  const note = Object.entries(desiderio.note || {}).filter(([, v]) => v >= 0.3).map(([n]) => n);
  const accordi = Object.entries(desiderio.accordi || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  return { note, accordi };
}

function proposta(candidato, desiderio, config, contesto) {
  const p = candidato.profilo;
  const famiglia = etichettaFamiglia(p.famiglia, config);
  return {
    codice: p.codice,
    profilo: p,
    punteggio: candidato.totale,
    famiglia: p.famiglia,
    famigliaEtichetta: famiglia.etichetta,
    famigliaSemplice: famiglia.semplice,
    sottofamiglia: p.sottofamiglia || '',
    descrizione: p.descrizione || '',
    confidenza: p.confidenza || 'media',
    motivi: spiegaConsulto(desiderio, p, config, contesto),
    piramide: piramide(p, criteriDaAccendere(desiderio), config),
    dettaglio: candidato,
  };
}

/**
 * Tre codici da provare, più una riserva e — per il banco — i primi dieci con il
 * loro punteggio.
 *
 * desiderio: da interpreta().
 * profili:   già filtrati per attivo = true.
 * pronto:    il lessico preparato (preparaLessico), per ritrovare le scene capite.
 */
export function consiglia(desiderio, profili, config, pronto = null) {
  const pesi = pesiConsulente(config);
  const contesto = preparaContesto(config);
  contesto.voci = (pronto && pronto.voci) || new Map();

  const candidati = (profili || [])
    .filter((p) => p && p.codice && passaFiltri(p, desiderio))
    .map((p) => ({ profilo: p, ...dettaglioConsulto(desiderio, p, config, contesto) }))
    .filter((c) => !c.vetoNota && c.esclusione < pesi.esclusioneFuori)
    .sort(confronta);

  const { scelti, allargato } = scegliConDiversita(candidati, pesi.proposte, pesi, pesi.maxPerFamiglia);
  const usate = new Set(scelti.map((c) => c.profilo.sottofamiglia || c.profilo.famiglia || ''));
  const restanti = candidati.filter((c) => !scelti.includes(c));
  const riserva = restanti.find((c) => !usate.has(c.profilo.sottofamiglia || c.profilo.famiglia || '')) || restanti[0] || null;

  return {
    proposte: scelti.map((c) => proposta(c, desiderio, config, contesto)),
    riserva: riserva ? proposta(riserva, desiderio, config, contesto) : null,
    classifica: candidati.slice(0, 10).map((c) => ({ codice: c.profilo.codice, totale: c.totale, accordi: c.accordi, note: c.note })),
    desiderio,
    allargato,
    candidati: candidati.length,
  };
}

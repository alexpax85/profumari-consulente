// Il consulente a parole — il terzo percorso del chiosco (docs/13-consulente.md).
// Da una frase del cliente ("fresco, come un bosco d'inverno") al desiderio che il
// motore capisce: accordi, note, misure, stagioni, veti. Puro e deterministico
// come motore.js: niente DOM, niente rete, niente modelli linguistici.
// Si prova con:  node scripts/test_interpreta.mjs
//
// L'intelligenza sta nel lessico (app/config/lessico.json), scritto in grande
// fuori dal chiosco e rivisto dalle persone: qui si legge soltanto. Questo modulo
// non sceglie mai un profumo, traduce. Chi sceglie è consulente.js.

import { elencoAccordi, ATTRIBUTI } from './motore.js';
import { normalizzaNota, tabellaNote, tabellaSinonimi } from './ricerca.js';

// Chi è più specifico vince a parità di parole: una scena scritta apposta
// ("caffè" come bevanda, con dentro cacao e fava tonka) batte la nota nuda, e la
// nota batte il nome della famiglia.
const PRIORITA = { scena: 3, nota: 2, famiglia: 1 };

// Quanto pesa una scena secondo le parole che ha davanti.
const PESO_MODO = { si: 1, forte: 1.4, poco: 0.45 };

// Una nota riconosciuta per nome porta con sé la sua famiglia, ma meno di una scena.
const QUOTA_ACCORDI_NOTA = 0.6;

// "Non troppo dolce" non è un veto: la famiglia pesa un po' contro, senza sparire.
const PESO_ATTENUATO = 0.35;

// ---------------------------------------------------------------- le parole

/**
 * Minuscole, senza accenti e senza apostrofi, con la punteggiatura tenuta a parte
 * perché chiude le negazioni ("niente vaniglia, cocco sì"). Il tè si salva prima
 * di togliere gli accenti: senza, diventerebbe "te", che è un pronome.
 */
export function parole(testo) {
  const pulito = String(testo || '')
    .toLowerCase()
    .replace(/(^|[\s,.;:!?'’])(t[èé]|th[èé])(?=$|[\s,.;:!?])/g, '$1the')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, ' ')
    .replace(/[.;:!?()"«»\n]/g, ' , ')
    .replace(/,/g, ' , ')
    .replace(/[^a-z0-9, ]/g, ' ');
  return pulito.split(/\s+/).filter(Boolean);
}

/**
 * La radice di una parola: basta a far cadere insieme singolare e plurale,
 * maschile e femminile (bosco/boschi, fresca/freschi, arancia/arance). Non è
 * uno stemmer vero e non vuole esserlo: le forme più lontane le scrive il lessico.
 */
export function radice(parola) {
  let r = String(parola || '');
  if (r.length < 4) return r;
  if (/[aeiou]$/.test(r)) r = r.slice(0, -1);
  if (/[cg]h$/.test(r)) r = r.slice(0, -1);
  if (/[cg]i$/.test(r) && r.length > 3) r = r.slice(0, -1);
  return r;
}

function insieme(elenco) {
  return new Set((elenco || []).map((p) => parole(p).join(' ')).filter(Boolean));
}

/** Le parole che non si accorciano (ragazzo/ragazza): parola -> forma a cui riportarla. */
function tabellaIntere(voce) {
  const fuori = new Map();
  for (const [chiave, valore] of Object.entries(voce || {})) {
    if (chiave.startsWith('_')) continue;
    fuori.set(parole(chiave).join(' '), parole(valore).join(' '));
  }
  return fuori;
}

/**
 * La radice, tranne per le parole in cui la vocale finale dice qualcosa che conta:
 * "ragazza" e "ragazzo" accendono filtri diversi, e ridotte a "ragazz" sarebbero una.
 */
function radiceDi(parola, intere) {
  return (intere && intere.get(parola)) || radice(parola);
}

/** Le parole della grammatica, pronte da confrontare. */
function preparaGrammatica(grammatica = {}) {
  return {
    negazioni: insieme(grammatica.negazioni),
    attenuanti: insieme(grammatica.attenuanti),
    poco: insieme(grammatica.poco),
    rafforzativi: insieme(grammatica.rafforzativi),
    separatori: insieme(grammatica.separatori),
    riaperture: insieme(grammatica.riaperture),
    vuote: insieme(grammatica.vuote),
    intere: tabellaIntere(grammatica.intere),
    pesiTipo: Object.fromEntries(Object.entries(grammatica.pesiTipo || {}).filter(([k]) => !k.startsWith('_'))),
  };
}

/**
 * La forma di una scena come si confronta: solo le parole piene, ridotte a radice.
 * "bosco d'inverno" e "un bosco in inverno" diventano tutte e due "bosc invern".
 * La usa anche scripts/costruisci_lessico.mjs, così lo stesso conto si fa una
 * volta sola, nello stesso modo, quando si scrive il lessico e quando lo si legge.
 */
export function formaNormale(forma, grammatica = {}) {
  const pronta = grammatica.vuote instanceof Set ? grammatica : preparaGrammatica(grammatica);
  return parole(forma)
    .filter((p) => p !== ',' && !pronta.vuote.has(p) && !/^\d+$/.test(p))
    .map((p) => radiceDi(p, pronta.intere))
    .join(' ');
}

// ------------------------------------------------------------ distanza di scrittura

/** Una lettera di troppo, di meno o sbagliata: quanto basta per la tastiera e la voce. */
function unaLetteraDiDifferenza(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
  if (la > lb) return a.slice(i + 1) === b.slice(i);
  return a.slice(i) === b.slice(i + 1);
}

// ----------------------------------------------------------- 1. il lessico pronto

/**
 * Prepara il lessico una volta sola (all'avvio, o quando cambia il catalogo):
 * l'indice delle forme, con dentro anche le note del catalogo e i nomi delle
 * famiglie, così "vorrei il cuoio" funziona anche se nessuna scena lo dice.
 *
 * lessico: il contenuto di app/config/lessico.json.
 * config:  { accordi, note, ricerca } come per ricerca.js.
 * profili: le referenze attive; servono a sapere quali note esistono davvero oggi.
 */
export function preparaLessico(lessico, config = {}, profili = []) {
  const grammatica = preparaGrammatica((lessico && lessico.grammatica) || {});
  const voci = [];

  for (const scena of (lessico && lessico.scene) || []) {
    for (const forma of scena.forme || []) voci.push({ forma, voce: { ...scena, origine: 'scena' } });
  }

  // Le note del catalogo di oggi, con i loro sinonimi: una nota che il negozio
  // ha disattivato del tutto non si riconosce, perché non porterebbe a niente.
  const tabella = tabellaNote(config);
  const sinonimi = tabellaSinonimi(config);
  const presenti = new Map();
  for (const profilo of profili || []) {
    for (const fila of ['testa', 'cuore', 'fondo']) {
      for (const nome of profilo[fila] || []) {
        const chiave = normalizzaNota(nome);
        const capo = sinonimi.verso.get(chiave) || chiave;
        if (!presenti.has(capo)) presenti.set(capo, nome);
      }
    }
  }
  for (const [capo, nome] of presenti) {
    const suoi = tabella.get(capo) || {};
    const accordi = {};
    for (const [k, v] of Object.entries(suoi)) accordi[k] = Math.round(v * QUOTA_ACCORDI_NOTA * 100) / 100;
    const voce = {
      chiave: `nota:${capo}`, tipo: 'nota', origine: 'nota', evoca: nome,
      note: { [capo]: 1 }, accordi,
    };
    const forme = new Set([capo, nome, ...(sinonimi.dentro.get(capo) || [])]);
    for (const forma of forme) voci.push({ forma, voce });
  }

  for (const accordo of elencoAccordi(config)) {
    const voce = {
      chiave: `famiglia:${accordo.chiave}`, tipo: 'famiglia', origine: 'famiglia',
      evoca: accordo.etichetta || accordo.chiave, accordi: { [accordo.chiave]: 1 },
    };
    for (const forma of new Set([accordo.chiave, accordo.etichetta].filter(Boolean))) voci.push({ forma, voce });
  }

  // L'indice: per ogni prima radice, le forme che cominciano così, le più lunghe prima.
  const indice = new Map();
  const occupate = new Map();   // forma normale -> priorità di chi la tiene
  const vocabolario = new Set();
  for (const { forma, voce } of voci) {
    const normale = formaNormale(forma, grammatica);
    if (!normale) continue;
    const priorita = PRIORITA[voce.origine] || 0;
    const gia = occupate.get(normale);
    if (gia !== undefined && gia >= priorita) continue;
    occupate.set(normale, priorita);
    const radici = normale.split(' ');
    for (const r of radici) vocabolario.add(r);
    const prima = radici[0];
    if (!indice.has(prima)) indice.set(prima, []);
    const elenco = indice.get(prima).filter((e) => e.radici.join(' ') !== normale);
    elenco.push({ radici, voce, priorita });
    indice.set(prima, elenco);
  }
  for (const elenco of indice.values()) {
    elenco.sort((a, b) => b.radici.length - a.radici.length || b.priorita - a.priorita);
  }

  const perLunghezza = new Map();   // per la correzione: le radici divise per lunghezza
  for (const r of vocabolario) {
    if (!perLunghezza.has(r.length)) perLunghezza.set(r.length, []);
    perLunghezza.get(r.length).push(r);
  }

  // Dalla chiave di una scena alla scena intera: serve al perché (consulente.js).
  const perChiave = new Map();
  for (const { voce } of voci) if (!perChiave.has(voce.chiave)) perChiave.set(voce.chiave, voce);

  return {
    grammatica, indice, vocabolario, perLunghezza, voci: perChiave,
    scene: ((lessico && lessico.scene) || []).length,
    note: presenti.size,
  };
}

/**
 * La radice come la conosce il lessico. Se non la conosce e la parola è lunga
 * abbastanza, si prova con una lettera di differenza: "vaniglai", "limome".
 * Solo se il candidato è uno: fra due possibili non si tira a indovinare.
 */
function radiceConosciuta(parola, pronto, correzioni) {
  const r = radiceDi(parola, pronto.grammatica.intere);
  if (pronto.vocabolario.has(r) || r.length < 5) return r;
  if (correzioni.has(r)) return correzioni.get(r);
  const candidati = [];
  for (const lunghezza of [r.length - 1, r.length, r.length + 1]) {
    for (const altra of pronto.perLunghezza.get(lunghezza) || []) {
      if (altra[0] === r[0] && unaLetteraDiDifferenza(r, altra)) candidati.push(altra);
    }
  }
  const scelta = candidati.length === 1 ? candidati[0] : r;
  correzioni.set(r, scelta);
  return scelta;
}

// -------------------------------------------------------- 2. la frase, letta

function inizia(pronto, gettoni, i, ...insiemi) {
  // Una o due parole: "un filo", "un po'".
  const una = gettoni[i] && gettoni[i].testo;
  const due = gettoni[i + 1] ? `${una} ${gettoni[i + 1].testo}` : null;
  for (const nome of insiemi) {
    const set = pronto.grammatica[nome];
    if (due && set.has(due)) return { nome, lunghezza: 2 };
    if (set.has(una)) return { nome, lunghezza: 1 };
  }
  return null;
}

/**
 * Trova le scene nella frase e decide per ognuna se è voluta, voluta poco, voluta
 * tanto, attenuata ("non troppo dolce") o rifiutata ("niente vaniglia", "il dolce
 * no"). Restituisce anche le parole piene che non ha capito: servono a dire
 * onestamente "questa non la conosco", mai a essere salvate.
 */
export function leggiFrase(testo, pronto) {
  const g = pronto.grammatica;
  const correzioni = new Map();
  const gettoni = parole(testo).map((p) => ({
    testo: p,
    punto: p === ',',
    vuota: p !== ',' && (g.vuote.has(p) || /^\d+$/.test(p)),
  }));
  for (const t of gettoni) t.radice = t.punto || t.vuota ? null : radiceConosciuta(t.testo, pronto, correzioni);

  // Le parole piene, in ordine: le forme si confrontano su queste. La punteggiatura
  // spezza: "bosco, inverno" non è la scena "bosco d'inverno".
  const piene = [];
  gettoni.forEach((t, i) => { if (t.punto) piene.push({ punto: true, i }); else if (!t.vuota) piene.push({ radice: t.radice, i }); });

  const trovate = [];
  const usate = new Set();
  for (let p = 0; p < piene.length; p++) {
    if (piene[p].punto) continue;
    const candidati = pronto.indice.get(piene[p].radice) || [];
    let presa = null;
    for (const candidato of candidati) {
      const n = candidato.radici.length;
      let ok = true;
      for (let k = 0; k < n; k++) {
        const pezzo = piene[p + k];
        if (!pezzo || pezzo.punto || pezzo.radice !== candidato.radici[k]) { ok = false; break; }
      }
      if (ok) { presa = candidato; break; }
    }
    if (!presa) continue;
    const n = presa.radici.length;
    const indici = piene.slice(p, p + n).map((x) => x.i);
    for (const i of indici) usate.add(i);
    trovate.push({ voce: presa.voce, da: indici[0], a: indici[indici.length - 1], parole: indici.map((i) => gettoni[i].testo) });
    p += n - 1;
  }

  // Le negazioni: dal "non" fino alla prossima virgola, al prossimo "ma", o alla
  // prossima parola che riapre il desiderio ("niente fiori, vorrei legni").
  // Le parole di desiderio subito dopo la negazione ne fanno parte ("non mi piace il dolce").
  const negato = new Array(gettoni.length).fill(null);
  for (let i = 0; i < gettoni.length; i++) {
    const neg = inizia(pronto, gettoni, i, 'negazioni');
    if (!neg || usate.has(i)) continue;
    let j = i + neg.lunghezza;
    let attenuata = false;
    while (j < gettoni.length && (gettoni[j].vuota || g.riaperture.has(gettoni[j].testo)
      || g.attenuanti.has(gettoni[j].testo) || g.negazioni.has(gettoni[j].testo))) {
      if (g.attenuanti.has(gettoni[j].testo)) attenuata = true;
      j++;
    }
    for (; j < gettoni.length; j++) {
      const t = gettoni[j];
      if (t.punto || g.separatori.has(t.testo) || (g.riaperture.has(t.testo) && !usate.has(j))) break;
      if (!negato[j]) negato[j] = attenuata ? 'attenuato' : 'no';
    }
  }

  // "Il dolce no", "fiori no grazie": la negazione dopo, in fondo al pezzo di frase.
  for (const trovata of trovate) {
    let j = trovata.a + 1;
    while (j < gettoni.length && gettoni[j].vuota && !g.negazioni.has(gettoni[j].testo)) j++;
    const dopo = gettoni[j];
    if (!dopo || !(dopo.testo === 'no' || dopo.testo === 'mai')) continue;
    let k = j + 1;
    while (k < gettoni.length && gettoni[k].vuota) k++;
    if (k >= gettoni.length || gettoni[k].punto || g.separatori.has(gettoni[k].testo)) trovata.dopoNo = true;
  }

  for (const trovata of trovate) {
    let modo = negato[trovata.da] || (trovata.dopoNo ? 'no' : 'si');
    if (modo === 'si') {
      // Guarda le due parole prima: "poco dolce", "molto fresco", "un filo di vaniglia".
      for (let passo = 1; passo <= 3; passo++) {
        const i = trovata.da - passo;
        if (i < 0 || gettoni[i].punto || usate.has(i)) break;
        const mod = inizia(pronto, gettoni, i, 'poco', 'rafforzativi');
        if (mod && i + mod.lunghezza <= trovata.da) { modo = mod.nome === 'poco' ? 'poco' : 'forte'; break; }
      }
    }
    trovata.modo = modo;
  }

  const ignorate = gettoni
    .filter((t, i) => !t.punto && !t.vuota && !usate.has(i)
      && !g.negazioni.has(t.testo) && !g.attenuanti.has(t.testo) && !g.poco.has(t.testo)
      && !g.rafforzativi.has(t.testo) && !g.separatori.has(t.testo) && !g.riaperture.has(t.testo)
      && t.testo.length > 2)
    .map((t) => t.testo);

  return { trovate, ignorate: [...new Set(ignorate)] };
}

// ---------------------------------------------------- 3. dalle scene al desiderio

function massimo(mappa, chiave, valore) {
  if (!(chiave in mappa) || mappa[chiave] < valore) mappa[chiave] = valore;
}

function aggiungiUnico(elenco, valori) {
  for (const v of valori || []) if (v && !elenco.includes(v)) elenco.push(v);
}

/**
 * Il desiderio: la stessa forma del "desiderato" di motore.js — così punteggio,
 * veti e filtri sono quelli che il negozio ha già tarato — più le note, che il
 * percorso guidato non ha e che qui sono il punto.
 *
 * opzioni.salta: le chiavi delle scene da non contare (le chip tolte dal cliente).
 */
export function interpreta(testo, pronto, { salta = null } = {}) {
  const lette = leggiFrase(testo, pronto);
  const ignorate = lette.ignorate;
  // Le scene che il cliente ha tolto toccandone la chip: la frase resta quella,
  // ma quel pezzo non conta più.
  const trovate = salta && salta.size ? lette.trovate.filter((t) => !salta.has(t.voce.chiave)) : lette.trovate;
  const desiderio = {
    accordi: {}, attributi: {}, stagioni: {}, momento: {},
    occasioni: [], carattere: [],
    esclusioni: {}, esclusioniAttributi: {},
    filtri: { genere: null, categorie: null },
    note: {}, noteEscluse: [],
    modo: 'me',
    capito: [], ignorate,
    generico: false,
  };
  const attributi = {};   // { attributo: { somma, peso } }
  const voluti = {};      // accordo -> quanto lo porta la scena voluta che lo porta di più
  const rifiutati = {};   // accordo -> quanto lo porta la scena rifiutata che lo porta di più

  const pesa = (attributo, valore, peso) => {
    const p = attributi[attributo] || (attributi[attributo] = { somma: 0, peso: 0 });
    p.somma += valore * peso;
    p.peso += peso;
  };

  // Il peso del tipo conta solo se la frase mescola tipi diversi: "fresco" da solo
  // resta tutto fresco, "bosco d'inverno, fresco" è un bosco rinfrescato.
  const pesiTipo = pronto.grammatica.pesiTipo || {};
  const pesoTipo = (voce) => (typeof pesiTipo[voce.tipo] === 'number' ? pesiTipo[voce.tipo] : 1);
  const massimoTipo = Math.max(0, ...trovate.filter((t) => t.modo !== 'no' && t.modo !== 'attenuato').map((t) => pesoTipo(t.voce)));

  for (const { voce, modo, parole: dette } of trovate) {
    desiderio.capito.push({
      chiave: voce.chiave, tipo: voce.tipo, evoca: voce.evoca, modo,
      // Sulle chip va la parola del cliente, non la frase della motivazione:
      // la prima forma della scena è il suo nome più comune.
      nome: (voce.forme && voce.forme[0]) || voce.evoca,
      parole: dette.join(' '), manca: voce.manca || [],
    });

    if (modo === 'si' || modo === 'forte' || modo === 'poco') {
      const peso = PESO_MODO[modo] * (massimoTipo > 0 ? pesoTipo(voce) / massimoTipo : 1);
      for (const [k, v] of Object.entries(voce.accordi || {})) {
        desiderio.accordi[k] = (desiderio.accordi[k] || 0) + v * peso;
        massimo(voluti, k, v);
      }
      for (const [nota, v] of Object.entries(voce.note || {})) massimo(desiderio.note, normalizzaNota(nota), v * peso);
      for (const [a, v] of Object.entries(voce.misure || {})) pesa(a, v, peso);
      for (const [k, v] of Object.entries(voce.stagioni || {})) massimo(desiderio.stagioni, k, v * peso);
      for (const [k, v] of Object.entries(voce.momento || {})) massimo(desiderio.momento, k, v * peso);
      aggiungiUnico(desiderio.occasioni, voce.occasioni);
      aggiungiUnico(desiderio.carattere, voce.carattere);
      if (voce.filtro && voce.filtro.genere) desiderio.filtri.genere = voce.filtro.genere;
      if (voce.modo === 'regalo') desiderio.modo = 'regalo';
      continue;
    }

    if (modo === 'attenuato') {
      // "Non troppo dolce": la misura scende a metà, la famiglia pesa un po' contro.
      for (const [a, v] of Object.entries(voce.misure || {})) {
        if (v >= 4) pesa(a, 2.5, 1);
        else if (v <= 2) pesa(a, 3.5, 1);
      }
      for (const [k, v] of Object.entries(voce.accordi || {})) {
        if (v >= 0.5) massimo(desiderio.esclusioni, k, PESO_ATTENUATO);
      }
      continue;
    }

    // Rifiutata. Si toglie quello che la scena porta di più, non ogni sua sfumatura:
    // chi dice "niente mare" non ha detto "niente agrumi".
    for (const [k, v] of Object.entries(voce.accordi || {})) {
      if (v >= 0.5) { massimo(desiderio.esclusioni, k, 1); massimo(rifiutati, k, v); }
    }
    for (const [nota, v] of Object.entries(voce.note || {})) {
      if (v >= 0.6 || voce.origine === 'nota') aggiungiUnico(desiderio.noteEscluse, [normalizzaNota(nota)]);
    }
    for (const [a, v] of Object.entries(voce.misure || {})) {
      // "Niente di dolce": toglie chi è dolce. "Niente di leggero": vuole chi si sente.
      if (v >= 4) desiderio.esclusioniAttributi[a] = { da: 4, peso: 1 };
      else if (v <= 2) pesa(a, 6 - v, 1);
    }
  }

  // Quello che il cliente ha chiesto vince su un veto più largo, se lo chiede più
  // di quanto il veto lo rifiuti: "vaniglia, ma niente di dolce" tiene la vaniglia
  // (la vaniglia è tutta vaniglia, il dolce lo è solo in parte) e toglie lo zucchero.
  // "Fresco ma niente agrumi" invece toglie gli agrumi: il fresco ne porta un po',
  // gli agrumi sono solo quello.
  for (const k of Object.keys(desiderio.esclusioni)) {
    if ((voluti[k] || 0) > (rifiutati[k] || 0)) delete desiderio.esclusioni[k];
  }
  desiderio.noteEscluse = desiderio.noteEscluse.filter((n) => !(n in desiderio.note));

  for (const [a, p] of Object.entries(attributi)) {
    if (p.peso > 0 && ATTRIBUTI.includes(a)) desiderio.attributi[a] = Math.round((p.somma / p.peso) * 100) / 100;
  }
  return desiderio;
}

/** C'è abbastanza per proporre qualcosa? Un veto da solo, o un "per lui", non basta. */
export function haSostanza(desiderio) {
  return Object.keys(desiderio.accordi).length > 0
    || Object.keys(desiderio.note).length > 0
    || Object.keys(desiderio.attributi).length > 0;
}

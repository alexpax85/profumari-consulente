// Costruisce dati/profili.json dalle piramidi del fornitore (dati/piramidi.json,
// prodotto da scripts/estrai_piramidi.py) usando la tabella note → accordi di
// app/config/note.json.
//
//   node scripts/genera_profili.mjs [--scrivi]
//
// Senza --scrivi stampa solo il riepilogo e non tocca niente.
//
// Dalla card arrivano famiglia, sottofamiglia e le tre file di note: sono dati del
// fornitore. Tutto il resto (accordi, intensità, stagioni, occasioni, carattere,
// descrizione) è calcolato da qui, quindi è una STIMA: si corregge dal backoffice,
// profilo per profilo, e le regole si tarano cambiando i pesi qui sotto.
//
// I codici senza card (e i due "feromoni", che la piramide non ce l'hanno) tengono
// il profilo che avevano. Di ogni profilo precedente si conservano sempre il genere
// (che la card non dice) e le noteStaff.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => JSON.parse(readFileSync(join(RADICE, p), 'utf8'));

// ------------------------------------------------------------------ taratura

export const PESI_LIVELLO = { testa: 0.8, cuore: 1, fondo: 1.05 };
export const PESO_FAMIGLIA = 0.6;    // la famiglia sulla card conta meno di una nota vera
export const PESO_FAMIGLIA_SECONDA = 0.45;   // la seconda parola e' una sfumatura, non l'ossatura
export const RINFORZO = 0.3;         // quanto contano le note oltre la più forte sullo stesso accordo
export const SOGLIA_ACCORDO = 0.2;   // sotto questo valore l'accordo non si scrive (docs/09)
export const SOGLIA_CARATTERE = 0.35;

const LIVELLI = ['testa', 'cuore', 'fondo'];

// ------------------------------------------------------------------- utilità

const fra = (min, v, max) => Math.max(min, Math.min(max, v));
const a01 = (v) => fra(0, v, 1);
const scala1a5 = (v) => fra(1, Math.round(1 + 4 * a01(v)), 5);
const decimo = (v) => Math.round(a01(v) * 10) / 10;
const g = (accordi, chiave) => (accordi && accordi[chiave]) || 0;

/** Confronto tollerante: niente maiuscole, accenti o apostrofi ("CAFFE’" = "caffè"). */
export function normalizzaNota(testo) {
  return String(testo || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/['’]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function tabella(oggetto) {
  const mappa = new Map();
  for (const [chiave, valore] of Object.entries(oggetto || {})) {
    if (chiave.startsWith('_')) continue;
    mappa.set(normalizzaNota(chiave), valore);
  }
  return mappa;
}

export function tabelleDa(configNote) {
  return {
    note: tabella(configNote.note),
    accordiFamiglia: tabella(configNote.accordiFamiglia),
    famiglie: tabella(configNote.famiglie),
    scrittura: tabella(configNote.scrittura),
  };
}

/** Come va scritta la nota: minuscola, e raddrizzata se sulla card era storpiata. */
export function scriviNota(nota, tabelle) {
  const minuscola = String(nota || '').toLowerCase().replace(/\u2019/g, '\'');
  const corretta = tabelle.scrittura && tabelle.scrittura.get(normalizzaNota(nota));
  return corretta || minuscola;
}

// --------------------------------------------------------------- 1. accordi

function accumula(contributi, accordi, fattore) {
  for (const [chiave, valore] of Object.entries(accordi || {})) {
    if (!contributi.has(chiave)) contributi.set(chiave, []);
    contributi.get(chiave).push(valore * fattore);
  }
}

/** Più note sullo stesso accordo lo rinforzano, ma con rendimenti decrescenti. */
function combina(contributi) {
  const grezzi = {};
  for (const [chiave, pesi] of contributi) {
    const massimo = Math.max(...pesi);
    const somma = pesi.reduce((s, v) => s + v, 0);
    grezzi[chiave] = massimo + RINFORZO * (somma - massimo);
  }
  return grezzi;
}

/** Riporta l'accordo più forte a 1 e butta via quelli sotto soglia. */
function normalizza(grezzi, soglia = SOGLIA_ACCORDO) {
  const massimo = Math.max(0, ...Object.values(grezzi));
  if (!massimo) return {};
  const fuori = {};
  for (const [chiave, valore] of Object.entries(grezzi)) {
    const v = Math.round((valore / massimo) * 100) / 100;
    if (v >= soglia) fuori[chiave] = Math.min(1, v);
  }
  return Object.fromEntries(Object.entries(fuori).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/**
 * Accordi del profilo, più quelli del solo fondo (servono alla persistenza)
 * e l'elenco delle note che la tabella non conosce.
 */
export function accordiDa(scheda, tabelle) {
  const contributi = new Map();
  const contributiFondo = new Map();
  const sconosciute = [];
  for (const livello of LIVELLI) {
    for (const nota of scheda[livello] || []) {
      const voce = tabelle.note.get(normalizzaNota(nota));
      if (!voce) { sconosciute.push(nota); continue; }
      accumula(contributi, voce, PESI_LIVELLO[livello]);
      if (livello === 'fondo') accumula(contributiFondo, voce, 1);
    }
  }
  (scheda.famiglia || []).forEach((parola, indice) => {
    const voce = tabelle.accordiFamiglia.get(normalizzaNota(parola));
    if (voce) accumula(contributi, voce, indice === 0 ? PESO_FAMIGLIA : PESO_FAMIGLIA_SECONDA);
  });
  return {
    accordi: normalizza(combina(contributi)),
    // il fondo NON si normalizza: qui serve sapere quanto e' pesante davvero, non in proporzione
    fondo: combina(contributiFondo),
    sconosciute,
  };
}

// ------------------------------------------------------- 2. come si comporta

export function pesantezza(a) {
  return Math.max(g(a, 'oud'), g(a, 'incenso'), g(a, 'cuoio'), g(a, 'tabacco'), g(a, 'gourmand'),
    g(a, 'ambrato'), 0.8 * g(a, 'patchouli'), 0.8 * g(a, 'speziato'), 0.75 * g(a, 'floreale-bianco'),
    0.7 * g(a, 'vaniglia'), 0.7 * g(a, 'miele'), 0.6 * g(a, 'legnoso'));
}

export function leggerezza(a) {
  return Math.max(g(a, 'agrumato'), g(a, 'acquatico'), g(a, 'tè'), g(a, 'verde'),
    0.85 * g(a, 'aromatico'), 0.7 * g(a, 'floreale-fresco'), 0.6 * g(a, 'muschiato'));
}

export function attributiDa(accordi, fondo) {
  const pesa = pesantezza(accordi);
  const legge = leggerezza(accordi);
  const dolce = Math.max(0.95 * g(accordi, 'gourmand'), 0.78 * g(accordi, 'vaniglia'), 0.75 * g(accordi, 'miele'))
    + 0.25 * g(accordi, 'fruttato') + 0.15 * g(accordi, 'ambrato') + 0.1 * g(accordi, 'solare');
  const fresco = 0.1 + 0.85 * Math.max(g(accordi, 'agrumato'), g(accordi, 'acquatico'))
    + 0.5 * g(accordi, 'verde') + 0.45 * g(accordi, 'aromatico') + 0.35 * g(accordi, 'tè')
    + 0.25 * g(accordi, 'floreale-fresco')
    - 0.45 * Math.max(g(accordi, 'ambrato'), g(accordi, 'gourmand'), g(accordi, 'oud'),
      g(accordi, 'cuoio'), g(accordi, 'tabacco'), g(accordi, 'vaniglia'), g(accordi, 'incenso'));
  const fondoPesante = Math.max(g(fondo, 'oud'), g(fondo, 'ambrato'), g(fondo, 'vaniglia'),
    g(fondo, 'patchouli'), g(fondo, 'cuoio'), g(fondo, 'tabacco'), g(fondo, 'incenso'),
    g(fondo, 'gourmand'), g(fondo, 'miele'), 0.85 * g(fondo, 'legnoso'), 0.7 * g(fondo, 'muschiato'));
  return {
    intensita: scala1a5(0.42 + 0.55 * pesa - 0.45 * legge),
    persistenza: scala1a5(0.3 + 0.6 * fondoPesante - 0.3 * legge),
    dolcezza: scala1a5(dolce),
    freschezza: scala1a5(fresco),
  };
}

/** Porta il valore più alto a 0.9 e tiene un minimo, così nessuna stagione è esclusa del tutto. */
function ammorbidisci(valori, minimo) {
  const massimo = Math.max(...Object.values(valori));
  const fuori = {};
  for (const [chiave, valore] of Object.entries(valori)) {
    const v = massimo > 0 ? (valore / massimo) * 0.9 : 0.5;
    fuori[chiave] = decimo(Math.max(minimo, v));
  }
  return fuori;
}

export function stagioniDa(accordi) {
  const pesa = pesantezza(accordi);
  const legge = leggerezza(accordi);
  const fresca = Math.max(g(accordi, 'agrumato'), g(accordi, 'acquatico'));
  return ammorbidisci({
    primavera: a01(0.25 + 0.45 * Math.max(g(accordi, 'floreale-fresco'), g(accordi, 'rosa'))
      + 0.35 * legge + 0.25 * g(accordi, 'fruttato') + 0.2 * g(accordi, 'agrumato') - 0.4 * pesa),
    estate: a01(0.15 + 0.6 * legge + 0.35 * fresca + 0.3 * g(accordi, 'solare')
      + 0.2 * g(accordi, 'tè') - 0.55 * pesa),
    autunno: a01(0.28 + 0.4 * g(accordi, 'legnoso') + 0.25 * g(accordi, 'patchouli')
      + 0.35 * g(accordi, 'speziato') + 0.3 * g(accordi, 'tabacco') + 0.3 * g(accordi, 'cuoio')
      + 0.25 * g(accordi, 'ambrato') - 0.35 * legge),
    inverno: a01(0.2 + 0.65 * Math.max(g(accordi, 'ambrato'), g(accordi, 'gourmand'), g(accordi, 'oud'))
      + 0.4 * g(accordi, 'incenso') + 0.35 * g(accordi, 'speziato') + 0.3 * g(accordi, 'vaniglia')
      + 0.3 * g(accordi, 'cuoio') - 0.45 * legge),
  }, 0.2);
}

export function momentoDa(accordi) {
  const pesa = pesantezza(accordi);
  const legge = leggerezza(accordi);
  return ammorbidisci({
    giorno: a01(0.45 + 0.5 * legge - 0.4 * pesa),
    sera: a01(0.4 + 0.55 * pesa - 0.3 * legge),
  }, 0.3);
}

export function occasioniDa(accordi, attributi, categoria) {
  const pesa = pesantezza(accordi);
  const scelte = [];
  if (attributi.intensita >= 4 || pesa >= 0.75 || (attributi.dolcezza >= 4 && attributi.freschezza <= 2)) scelte.push('serata');
  if (attributi.intensita <= 3 && attributi.freschezza >= 2) scelte.push('quotidiano');
  if (attributi.intensita <= 3 && attributi.dolcezza <= 3 && g(accordi, 'gourmand') < 0.5
    && g(accordi, 'floreale-bianco') < 0.7 && g(accordi, 'oud') < 0.3 && g(accordi, 'boozy') < 0.6) scelte.push('ufficio');
  if (g(accordi, 'rosa') >= 0.5 || g(accordi, 'vaniglia') >= 0.6 || g(accordi, 'floreale-bianco') >= 0.6
    || g(accordi, 'miele') >= 0.5) scelte.push('romantico');
  if (g(accordi, 'oud') >= 0.5 || g(accordi, 'incenso') >= 0.5
    || (/PREMIUM/i.test(categoria || '') && attributi.intensita >= 4)) scelte.push('speciale');
  if (attributi.freschezza >= 4 && attributi.intensita <= 2) scelte.push('sport');
  if (!scelte.length) scelte.push('quotidiano');
  return scelte.slice(0, 3);
}

export function caratteriDa(accordi, attributi) {
  const legge = leggerezza(accordi);
  const punteggi = {
    fresco: 0.9 * legge + (attributi.freschezza >= 4 ? 0.4 : 0),
    energico: 0.6 * g(accordi, 'agrumato') + 0.5 * g(accordi, 'speziato') + 0.4 * g(accordi, 'fruttato'),
    calmo: 0.6 * g(accordi, 'aromatico') + 0.5 * g(accordi, 'muschiato') + 0.5 * g(accordi, 'tè')
      - (attributi.intensita >= 4 ? 0.4 : 0),
    sensuale: 0.6 * g(accordi, 'ambrato') + 0.6 * g(accordi, 'vaniglia') + 0.5 * g(accordi, 'floreale-bianco')
      + 0.5 * g(accordi, 'oud') + 0.4 * g(accordi, 'miele'),
    elegante: 0.6 * g(accordi, 'cipriato') + 0.5 * g(accordi, 'legnoso') + 0.4 * g(accordi, 'rosa') + 0.3 * g(accordi, 'tè'),
    audace: 0.6 * g(accordi, 'oud') + 0.6 * g(accordi, 'cuoio') + 0.5 * g(accordi, 'incenso') + 0.4 * g(accordi, 'speziato'),
    coccola: 0.7 * g(accordi, 'gourmand') + 0.5 * g(accordi, 'vaniglia') + 0.4 * g(accordi, 'miele') + 0.3 * g(accordi, 'solare'),
    misterioso: 0.6 * g(accordi, 'incenso') + 0.5 * g(accordi, 'tabacco') + 0.5 * g(accordi, 'patchouli') + 0.4 * g(accordi, 'oud'),
    allegro: 0.6 * g(accordi, 'fruttato') + 0.5 * g(accordi, 'solare') + 0.4 * g(accordi, 'agrumato'),
    romantico: 0.7 * g(accordi, 'rosa') + 0.5 * g(accordi, 'floreale-fresco') + 0.3 * g(accordi, 'floreale-bianco'),
    sicuro: 0.5 * g(accordi, 'legnoso') + 0.4 * g(accordi, 'ambrato') + 0.3 * g(accordi, 'muschiato')
      + (attributi.intensita >= 4 ? 0.3 : 0),
  };
  const ordinati = Object.entries(punteggi)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([nome, valore]) => ({ nome, valore }));
  const scelti = ordinati.filter((c) => c.valore >= SOGLIA_CARATTERE).slice(0, 3).map((c) => c.nome);
  while (scelti.length < 2) {
    const prossimo = ordinati.find((c) => !scelti.includes(c.nome));
    scelti.push(prossimo ? prossimo.nome : 'elegante');
  }
  return scelti;
}

// ----------------------------------------------------------- 3. famiglia e testo

export function famigliaDa(scheda, accordi, tabelle) {
  const parole = (scheda.famiglia || []).map(normalizzaNota);
  const base = tabelle.famiglie.get(parole[0]) || 'orientale';
  const seconda = parole[1] || '';
  if (g(accordi, 'gourmand') >= 0.9 || (g(accordi, 'gourmand') >= 0.7 && /gourmand|vanigliato/.test(seconda))) return 'gourmand';
  if (g(accordi, 'cuoio') >= 0.9 || seconda === 'cuoiato') return 'cuoio';
  if (base === 'orientale' && seconda === 'vanigliato' && g(accordi, 'speziato') < 0.5) return 'ambrato';
  if (base === 'orientale' && g(accordi, 'ambrato') >= 0.9 && g(accordi, 'speziato') < 0.4) return 'ambrato';
  if (base === 'floreale' && seconda === 'fruttato') return 'fruttato-floreale';
  if (base === 'aromatico' && /fougere/.test(seconda)) return 'fougère';
  if (base === 'agrumato' && (seconda === 'acquatico' || seconda === 'marino')) return 'acquatico';
  return base;
}

export function sottofamigliaDa(scheda) {
  const testo = (scheda.famiglia || []).join(' ').toLowerCase().trim();
  return testo || 'non classificato';
}

function elenca(note) {
  const pulite = (note || []).map((n) => n.toLowerCase().replace(/’/g, '\''));
  if (pulite.length <= 1) return pulite[0] || '';
  if (pulite.length === 2) return `${pulite[0]} e ${pulite[1]}`;
  return `${pulite.slice(0, -1).join(', ')} e ${pulite[pulite.length - 1]}`;
}

const MODELLI = [
  (t, c, f) => `Apre con ${t}, poi ${c}, e resta su ${f}.`,
  (t, c, f) => `${t.charAt(0).toUpperCase()}${t.slice(1)} in apertura, ${c} nel cuore, ${f} sul fondo.`,
  (t, c, f) => `Parte da ${t}, passa per ${c} e chiude su ${f}.`,
];

/** Una riga che dice la piramide a parole: niente marchi, niente numeri, max 140 caratteri. */
export function descrizioneDa(scheda, tabelle) {
  const indice = [...scheda.codice].reduce((s, c) => s + c.charCodeAt(0), 0) % MODELLI.length;
  const scrivi = (nota) => (tabelle ? scriviNota(nota, tabelle) : String(nota).toLowerCase());
  // Certe card ripetono la stessa nota su due o tre file: dirla tre volte suona male.
  const dette = new Set();
  const livello = (note) => {
    const fuori = [];
    for (const nota of note || []) {
      const scritta = scrivi(nota);
      if (dette.has(scritta)) continue;
      dette.add(scritta);
      fuori.push(scritta);
    }
    return fuori;
  };
  const testa = livello(scheda.testa);
  const cuore = livello(scheda.cuore);
  const fondo = livello(scheda.fondo);

  if (!cuore.length && !fondo.length) return `Tutta giocata su ${elenca(testa)}, dall'inizio alla fine.`;
  if (!fondo.length) return `Apre con ${elenca(testa)} e prosegue su ${elenca(cuore)}.`;
  if (!cuore.length) return `Apre con ${elenca(testa)} e resta su ${elenca(fondo)}.`;
  for (const quante of [3, 2, 1]) {
    const testo = MODELLI[indice](elenca(testa.slice(0, quante)), elenca(cuore.slice(0, quante)), elenca(fondo.slice(0, quante)));
    if (testo.length <= 140) return testo;
  }
  return MODELLI[indice](elenca(testa.slice(0, 1)), elenca(cuore.slice(0, 1)), elenca(fondo.slice(0, 1))).slice(0, 140);
}

export function genereDa(scheda, precedente) {
  if (precedente && precedente.genere) return precedente.genere;
  const categoria = (scheda.categoria || '').toUpperCase();
  if (categoria.startsWith('UOMO')) return 'uomo';
  if (categoria.startsWith('DONNA')) return 'donna';
  return 'unisex';
}

// ------------------------------------------------------------ 4. il profilo

export function profiloDa(scheda, tabelle, precedente) {
  const { accordi, fondo, sconosciute } = accordiDa(scheda, tabelle);
  const attributi = attributiDa(accordi, fondo);
  const profilo = {
    codice: scheda.codice,
    genere: genereDa(scheda, precedente),
    famiglia: famigliaDa(scheda, accordi, tabelle),
    sottofamiglia: sottofamigliaDa(scheda),
    testa: (scheda.testa || []).map((n) => scriviNota(n, tabelle)),
    cuore: (scheda.cuore || []).map((n) => scriviNota(n, tabelle)),
    fondo: (scheda.fondo || []).map((n) => scriviNota(n, tabelle)),
    accordi,
    ...attributi,
    stagioni: stagioniDa(accordi),
    momento: momentoDa(accordi),
    occasioni: occasioniDa(accordi, attributi, scheda.categoria),
    carattere: caratteriDa(accordi, attributi),
    descrizione: descrizioneDa(scheda, tabelle),
    confidenza: 'alta',
  };
  if (precedente && precedente.noteStaff) profilo.noteStaff = precedente.noteStaff;
  return { profilo, sconosciute };
}

// --------------------------------------------------------------------- main

/**
 * Un profilo senza card resta una ricostruzione: non puo' stare alla pari di uno
 * costruito sulla piramide del fornitore, e il backoffice deve vederlo per primo.
 */
function declassa(profilo) {
  return profilo.confidenza === 'bassa' ? profilo : { ...profilo, confidenza: 'media' };
}

function main() {
  const scrivi = process.argv.includes('--scrivi');
  const piramidi = leggi('dati/piramidi.json');
  const tabelle = tabelleDa(leggi('app/config/note.json'));
  const precedenti = new Map(leggi('dati/profili.json').map((p) => [p.codice, p]));

  const profili = [];
  const senzaPiramide = [];
  const sconosciute = new Map();
  for (const scheda of piramidi) {
    const precedente = precedenti.get(scheda.codice);
    if (!(scheda.testa || []).length) {
      senzaPiramide.push(scheda.codice);
      if (precedente) profili.push(declassa(precedente));
      continue;
    }
    const esito = profiloDa(scheda, tabelle, precedente);
    for (const nota of esito.sconosciute) sconosciute.set(nota, (sconosciute.get(nota) || 0) + 1);
    profili.push(esito.profilo);
  }
  // Codici a catalogo di cui non è arrivata la card: tengono il profilo di prima.
  const generati = new Set(profili.map((p) => p.codice));
  const tenuti = [];
  for (const [codice, precedente] of precedenti) {
    if (!generati.has(codice)) { profili.push(declassa(precedente)); tenuti.push(codice); }
  }
  profili.sort((a, b) => a.codice.localeCompare(b.codice));

  const conta = (chiave) => profili.reduce((m, p) => m.set(p[chiave], (m.get(p[chiave]) || 0) + 1), new Map());
  const stampaConta = (etichetta, mappa) => console.log(`${etichetta}: ` +
    [...mappa].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));

  console.log(`\nCard con piramide: ${piramidi.length - senzaPiramide.length} di ${piramidi.length}`);
  console.log(`Profili in uscita: ${profili.length} (${tenuti.length + senzaPiramide.length} tenuti come prima: ${[...senzaPiramide, ...tenuti].sort().join(', ')})`);
  if (sconosciute.size) {
    console.log(`\nNote non in tabella (${sconosciute.size}) — vanno aggiunte ad app/config/note.json:`);
    for (const [nota, quante] of [...sconosciute].sort((a, b) => b[1] - a[1])) console.log(`  · ${nota} (${quante})`);
  }
  stampaConta('\nFamiglie ', conta('famiglia'));
  stampaConta('Genere   ', conta('genere'));
  for (const attributo of ['intensita', 'persistenza', 'dolcezza', 'freschezza']) {
    const valori = profili.map((p) => p[attributo]);
    const media = valori.reduce((s, v) => s + v, 0) / valori.length;
    const distribuzione = [1, 2, 3, 4, 5].map((v) => `${v}:${valori.filter((x) => x === v).length}`).join(' ');
    console.log(`${attributo.padEnd(11)} media ${media.toFixed(2)}   ${distribuzione}`);
  }

  if (!scrivi) { console.log('\nProva a vuoto: rilancia con --scrivi per salvare dati/profili.json\n'); return; }
  writeFileSync(join(RADICE, 'dati/profili.json'), `${JSON.stringify(profili, null, 1)}\n`);
  console.log('\nScritto dati/profili.json');
  console.log('Ricorda: alza VERSIONE_DATI in app/js/dati.js, altrimenti i dispositivi già in uso');
  console.log('tengono i profili che hanno adesso (il chiosco non li sostituisce da solo).\n');
}

// Solo se lanciato a mano: importarlo (dai test) non deve rigenerare niente.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

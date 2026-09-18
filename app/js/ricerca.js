// Ricerca per note — il secondo percorso del chiosco (docs/12-ricerca-note.md).
// Puro e deterministico come motore.js: niente DOM, niente rete, niente Math.random.
// Si prova con:  node scripts/test_ricerca.mjs
//
// Il percorso guidato parte dalle domande e arriva a tre codici; questo parte
// dagli ingredienti — muschio, cuoio, agrumi — e sfoglia il catalogo. Stessa
// regola di sempre: solo referenze attive, mai un nome commerciale.

import { chiaviAccordi, elencoAccordi, etichettaFamiglia } from './motore.js';

export const FILE_PIRAMIDE = ['testa', 'cuore', 'fondo'];

const PREDEFINITI = {
  // Una nota nel fondo conta più di una in testa: è quella che resta sulla pelle.
  pesiFila: { testa: 0.85, cuore: 1, fondo: 1 },
  sogliaAccordo: 0.3,       // da qui in su la famiglia c'è davvero nella fragranza
  sogliaVeto: 0.5,          // da qui in su quello che non si vuole la toglie dalla lista
  affinita: 0.45,           // quanto vale una nota assente ma con la famiglia giusta
  forzaNota: 0.3,           // quanto conta, nell'ordine, che la nota sia protagonista
  massimoScelte: 5,
  minimoOccorrenze: 2,      // sotto questa soglia la nota non si mostra (resta cercabile)
  quanteNotePerFamiglia: 14,
  quanteNotePerGruppo: 12,   // quante note si mostrano nel cassetto di un gruppo
  quantiRisultati: 12,      // quanti se ne mostrano prima di "mostrane altri"
  intensita: {
    leggera: { max: 2 },
    media: { min: 3, max: 3 },
    decisa: { min: 4 },
  },
};

// ---------------------------------------------------------------- utilità

function numero(v, predefinito = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : predefinito;
}

/** Le note si confrontano senza accenti, apostrofi e maiuscole: "CAFFE’" e "caffè" sono la stessa. */
export function normalizzaNota(testo) {
  return String(testo || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function impostazioni(config) {
  const sue = (config && config.ricerca) || {};
  return {
    ...PREDEFINITI,
    ...sue,
    pesiFila: { ...PREDEFINITI.pesiFila, ...(sue.pesiFila || {}) },
    intensita: { ...PREDEFINITI.intensita, ...(sue.intensita || {}) },
    soglieFamiglia: { ...(sue.soglieFamiglia || {}) },
  };
}

/**
 * Quando una famiglia c'è davvero. Di norma 0,3, ma qualche accordo ha bisogno di
 * più: `ambrato` arriva anche dalla parola "ORIENTALE" stampata sulla card, e
 * settantotto profili lo portano senza avere una sola nota ambrata in piramide.
 * Le eccezioni stanno in ricerca.json, non nel codice.
 */
export function sogliaDi(chiave, opzioni) {
  const sua = opzioni.soglieFamiglia && opzioni.soglieFamiglia[chiave];
  return typeof sua === 'number' ? sua : opzioni.sogliaAccordo;
}

// Le tabelle si ricostruiscono solo quando cambia la configurazione: la schermata
// dei risultati chiama cerca() otto volte (i conteggi dei filtri) e piramide() una
// volta per scheda, e rifare 337 voci ogni volta si sente, su un iPad vecchio.
const MEMORIA = new WeakMap();

function memo(config, chiave, costruisci) {
  const oggetto = config && typeof config === 'object' ? config : null;
  if (!oggetto) return costruisci();
  let sue = MEMORIA.get(oggetto);
  if (!sue) { sue = {}; MEMORIA.set(oggetto, sue); }
  if (!(chiave in sue)) sue[chiave] = costruisci();
  return sue[chiave];
}

/**
 * Da nota scritta ad accordi, leggendo app/config/note.json: le chiavi del file
 * sono come le scrive il fornitore ("the'"), i profili portano la forma corretta
 * ("tè"), quindi si indicizzano tutte e due passando dalla tabella `scrittura`.
 */
export function tabellaNote(config) {
  return memo(config, 'note', () => costruisciTabellaNote(config));
}

function costruisciTabellaNote(config) {
  const voce = (config && config.note) || {};
  const scrittura = new Map();
  for (const [chiave, valore] of Object.entries(voce.scrittura || {})) {
    if (chiave.startsWith('_')) continue;
    scrittura.set(normalizzaNota(chiave), valore);
  }
  const tabella = new Map();
  for (const [chiave, accordi] of Object.entries(voce.note || {})) {
    if (chiave.startsWith('_')) continue;
    tabella.set(normalizzaNota(chiave), accordi);
    const corretta = scrittura.get(normalizzaNota(chiave));
    if (corretta) tabella.set(normalizzaNota(corretta), accordi);
  }
  return tabella;
}

/** I nomi che per un cliente sono la stessa nota: "rosa bulgara" sta sotto "rosa". */
export function tabellaSinonimi(config) {
  return memo(config, 'sinonimi', () => costruisciSinonimi(config));
}

function costruisciSinonimi(config) {
  const gruppi = ((config && config.ricerca) || {}).sinonimi || {};
  const verso = new Map();   // nota minore -> nota da mostrare
  const dentro = new Map();  // nota da mostrare -> tutte le sue forme
  for (const [mostra, uguali] of Object.entries(gruppi)) {
    const capo = normalizzaNota(mostra);
    const elenco = new Set([capo]);
    for (const altra of uguali || []) {
      const chiave = normalizzaNota(altra);
      verso.set(chiave, capo);
      elenco.add(chiave);
    }
    dentro.set(capo, [...elenco]);
  }
  return { verso, dentro };
}

/**
 * L'identità di una nota: la forma con cui viaggia nei criteri e nell'indice.
 * Serve perché la stessa cosa arriva scritta in modi diversi — dal cassetto come
 * chiave già normalizzata, dalla piramide di un risultato come sta sulla card
 * ("rosa bulgara", "tè") — e due forme della stessa nota farebbero due criteri.
 */
export function chiaveDiNota(nome, config) {
  const chiave = normalizzaNota(nome);
  const sinonimi = tabellaSinonimi(config);
  return sinonimi.verso.get(chiave) || chiave;
}

/** La famiglia di una nota: l'accordo che pesa di più nella sua riga di note.json. */
export function famigliaDellaNota(nota, tabella) {
  const accordi = tabella.get(normalizzaNota(nota));
  if (!accordi) return null;
  let capo = null;
  let massimo = 0;
  for (const [chiave, valore] of Object.entries(accordi)) {
    if (numero(valore) > massimo) { massimo = numero(valore); capo = chiave; }
  }
  return capo;
}

/** Quanto quella nota è protagonista in quella fragranza (0-1). */
function forzaDellaNota(profilo, nota, tabella) {
  const accordi = tabella.get(normalizzaNota(nota));
  if (!accordi) return 0;
  let massima = 0;
  for (const [chiave, valore] of Object.entries(accordi)) {
    const forza = numero((profilo.accordi || {})[chiave]) * numero(valore);
    if (forza > massima) massima = forza;
  }
  return Math.min(1, massima);
}

/** Le note di un profilo, indicizzate: chiave normalizzata -> { nome, fila, peso }. */
export function noteDelProfilo(profilo, pesiFila = PREDEFINITI.pesiFila) {
  const fuori = new Map();
  for (const fila of FILE_PIRAMIDE) {
    for (const nome of profilo[fila] || []) {
      const chiave = normalizzaNota(nome);
      if (!chiave) continue;
      const peso = numero(pesiFila[fila], 1);
      const gia = fuori.get(chiave);
      if (!gia || gia.peso < peso) fuori.set(chiave, { nome, fila, peso });
    }
  }
  return fuori;
}

// ------------------------------------------------------- 1. l'indice delle note

/**
 * Che cosa c'è davvero nel catalogo attivo: le famiglie di note con quante
 * fragranze le contengono, e dentro ciascuna le note vere, contate.
 * Si ricostruisce quando il catalogo cambia, non a ogni tocco.
 *
 * profili: già filtrati per attivo = true (motore.js, profiliAttivi).
 */
export function indiceNote(profili, config) {
  const opzioni = impostazioni(config);
  const tabella = tabellaNote(config);
  const { verso, dentro } = tabellaSinonimi(config);
  const conteggi = new Map();      // nota mostrata -> { nome, quante, forme }
  const perFamiglia = new Map();   // chiave accordo -> [note]
  const quanteFamiglia = new Map();
  let senzaFamiglia = 0;

  for (const profilo of profili || []) {
    if (!profilo) continue;
    for (const chiave of chiaviAccordi(config)) {
      if (numero((profilo.accordi || {})[chiave]) >= sogliaDi(chiave, opzioni)) {
        quanteFamiglia.set(chiave, (quanteFamiglia.get(chiave) || 0) + 1);
      }
    }
    const viste = new Set();
    for (const [chiave, voce] of noteDelProfilo(profilo, opzioni.pesiFila)) {
      const capo = verso.get(chiave) || chiave;
      if (viste.has(capo)) continue;   // "rosa" e "rosa bulgara" nella stessa piramide contano una volta
      viste.add(capo);
      const gia = conteggi.get(capo);
      if (gia) { gia.quante++; continue; }
      // Il nome mostrato è quello del capogruppo quando c'è, altrimenti come sta in piramide.
      const nome = capo === chiave ? voce.nome : capo;
      conteggi.set(capo, { chiave: capo, nome, quante: 1 });
    }
  }

  const forzate = new Map(Object.entries(((config && config.ricerca) || {}).famigliaNota || {})
    .filter(([chiave]) => !chiave.startsWith('_'))
    .map(([chiave, valore]) => [normalizzaNota(chiave), valore]));
  const nascoste = new Set((((config && config.ricerca) || {}).nascoste || {}).elenco
    ? (((config && config.ricerca) || {}).nascoste.elenco).map(normalizzaNota)
    : []);

  for (const voce of conteggi.values()) {
    const famiglia = forzate.get(voce.chiave)
      || famigliaDellaNota(voce.chiave, tabella)
      || (dentro.get(voce.chiave) || []).map((f) => famigliaDellaNota(f, tabella)).find(Boolean);
    voce.nascosta = nascoste.has(voce.chiave);
    if (!famiglia) { senzaFamiglia++; continue; }
    voce.famiglia = famiglia;
    if (!perFamiglia.has(famiglia)) perFamiglia.set(famiglia, []);
    perFamiglia.get(famiglia).push(voce);
  }

  const famiglie = elencoAccordi(config).map((accordo) => {
    const tutte = (perFamiglia.get(accordo.chiave) || [])
      .sort((a, b) => b.quante - a.quante || a.nome.localeCompare(b.nome));
    const mostrate = tutte
      .filter((n) => !n.nascosta && n.quante >= opzioni.minimoOccorrenze)
      .slice(0, opzioni.quanteNotePerFamiglia);
    return {
      chiave: accordo.chiave,
      etichetta: accordo.etichetta || accordo.chiave,
      semplice: accordo.semplice || '',
      icona: accordo.icona || 'aperto',
      tinta: accordo.tinta || 'salvia',
      quante: quanteFamiglia.get(accordo.chiave) || 0,
      note: mostrate,
      altre: tutte.length - mostrate.length,
    };
  }).filter((f) => f.quante > 0 || f.note.length);

  return {
    famiglie,
    gruppi: gruppiDelleFamiglie(famiglie, profili, opzioni, config),
    note: [...conteggi.values()].sort((a, b) => b.quante - a.quante || a.nome.localeCompare(b.nome)),
    perNota: conteggi,
    senzaFamiglia,
  };
}

/**
 * La tavolozza che vede il cliente: nove gruppi di parole normali — agrumi, fiori,
 * legni e terra — ognuno con dentro le famiglie della tassonomia. Serve a non
 * mettere ventiquattro schede davanti a chi è in piedi; le scelte restano però
 * quelle vere del motore (una famiglia o una nota), mai il gruppo.
 * `quante` conta le fragranze che hanno almeno una delle famiglie del gruppo.
 */
function gruppiDelleFamiglie(famiglie, profili, opzioni, config) {
  const definizioni = (((config && config.ricerca) || {}).gruppi) || [];
  const perChiave = new Map(famiglie.map((f) => [f.chiave, f]));
  const fuori = [];
  for (const definizione of definizioni) {
    const dentro = (definizione.famiglie || []).map((c) => perChiave.get(c)).filter(Boolean);
    if (!dentro.length) continue;
    const chiavi = dentro.map((f) => f.chiave);
    let quante = 0;
    for (const profilo of profili || []) {
      if (chiavi.some((c) => numero((profilo.accordi || {})[c]) >= sogliaDi(c, opzioni))) quante++;
    }
    const tutte = dentro.flatMap((f) => f.note)
      .sort((a, b) => b.quante - a.quante || a.nome.localeCompare(b.nome));
    const note = tutte.slice(0, opzioni.quanteNotePerGruppo);
    // `tutte` resta a disposizione del cassetto: le note oltre la dozzina non
    // devono essere irraggiungibili, solo più in là di un tocco.
    fuori.push({
      chiave: definizione.chiave,
      etichetta: definizione.etichetta || definizione.chiave,
      icona: definizione.icona || dentro[0].icona,
      tinta: definizione.tinta || dentro[0].tinta,
      famiglie: dentro,
      note,
      tutte,
      // L'assaggio è calcolato adesso sul catalogo di adesso: se il negozio
      // disattiva mezza famiglia, la riga sotto il titolo lo dice da sola.
      assaggio: note.slice(0, 3).map((n) => n.nome),
      altre: tutte.length - note.length,
      rare: dentro.reduce((s, f) => s + (f.altre || 0), 0),
      quante,
    });
  }
  return fuori;
}

// ------------------------------------------------------------- 2. la ricerca

function passaGenere(profilo, genere) {
  if (!genere) return true;
  const suo = profilo.genere || 'unisex';
  return suo === 'unisex' || suo === genere;
}

function passaIntensita(profilo, scelta, opzioni) {
  if (!scelta) return true;
  const regola = opzioni.intensita[scelta];
  if (!regola) return true;
  const valore = numero(profilo.intensita, 3);
  if ('min' in regola && valore < regola.min) return false;
  if ('max' in regola && valore > regola.max) return false;
  return true;
}

/** Le forme sotto cui cercare una nota scelta (lei stessa più i suoi sinonimi). */
function formeDi(nota, sinonimi) {
  const chiave = normalizzaNota(nota);
  const capo = sinonimi.verso.get(chiave) || chiave;
  return sinonimi.dentro.get(capo) || [chiave];
}

/**
 * Cerca nel catalogo attivo.
 *
 * criteri = {
 *   accordi: ['legnoso'],      famiglie di note volute
 *   note: ['pepe rosa'],       note precise volute
 *   escludi: ['gourmand'],     famiglie che non si vogliono
 *   genere: 'uomo'|'donna'|null,
 *   intensita: 'leggera'|'media'|'decisa'|null,
 * }
 *
 * Nessun criterio è obbligatorio: senza niente non si cerca (l'interfaccia non
 * ci arriva). Non è un filtro secco — chi non ha tutto quello che hai chiesto
 * resta in coda, perché "ci somiglia" è un'informazione utile al banco.
 */
export function cerca(criteri, profili, config) {
  const opzioni = impostazioni(config);
  const tabella = tabellaNote(config);
  const sinonimi = tabellaSinonimi(config);
  const accordiVoluti = [...new Set(criteri.accordi || [])];
  const noteVolute = [...new Set(criteri.note || [])];
  const esclusi = [...new Set(criteri.escludi || [])];
  const noteEscluse = [...new Set(criteri.escludiNote || [])];
  const quanti = accordiVoluti.length + noteVolute.length;

  // "accordo:cuoio" e "nota:cuoio" sono due cose diverse: otto parole del catalogo
  // (rosa, oud, vaniglia, cuoio, incenso, tabacco, patchouli, miele) sono insieme
  // famiglia e nota, e sommare i due conteggi darebbe numeri che non esistono.
  const contaSingoli = new Map();   // "tipo:chiave" -> quante fragranze lo soddisfano da solo
  const risultati = [];
  let fuoriPerVeto = 0;
  let fuoriPerFiltri = 0;

  for (const profilo of profili || []) {
    if (!profilo || !profilo.codice) continue;

    const urto = esclusi.find((chiave) => numero((profilo.accordi || {})[chiave]) >= opzioni.sogliaVeto);
    if (urto) { fuoriPerVeto++; continue; }

    const sue = noteDelProfilo(profilo, opzioni.pesiFila);
    // Un veto su una nota precisa è secco: "niente vaniglia" vuol dire che la
    // vaniglia in piramide non ci deve essere, non che ce ne sia poca.
    if (noteEscluse.some((nota) => formeDi(nota, sinonimi).some((forma) => sue.has(forma)))) {
      fuoriPerVeto++;
      continue;
    }
    if (!passaGenere(profilo, criteri.genere) || !passaIntensita(profilo, criteri.intensita, opzioni)) {
      fuoriPerFiltri++;
      continue;
    }
    if (!quanti) continue;
    const trovate = [];
    let somma = 0;
    let presi = 0;

    for (const chiave of accordiVoluti) {
      const valore = numero((profilo.accordi || {})[chiave]);
      if (valore >= sogliaDi(chiave, opzioni)) {
        somma += Math.min(1, valore);
        presi++;
        contaSingoli.set(`accordo:${chiave}`, (contaSingoli.get(`accordo:${chiave}`) || 0) + 1);
        trovate.push({ tipo: 'accordo', chiave, forza: Math.min(1, valore) });
      } else {
        somma += valore * 0.5;   // c'è ma appena accennata: vale mezza
      }
    }

    for (const nota of noteVolute) {
      let voce = null;
      for (const forma of formeDi(nota, sinonimi)) {
        const trovata = sue.get(forma);
        if (trovata && (!voce || trovata.peso > voce.peso)) voce = trovata;
      }
      const forza = forzaDellaNota(profilo, nota, tabella);
      if (voce) {
        somma += voce.peso * (1 - opzioni.forzaNota + opzioni.forzaNota * forza);
        presi++;
        contaSingoli.set(`nota:${nota}`, (contaSingoli.get(`nota:${nota}`) || 0) + 1);
        trovate.push({ tipo: 'nota', chiave: nota, nome: voce.nome, fila: voce.fila, forza });
      } else if (forza > 0) {
        somma += forza * opzioni.affinita;   // la nota non c'è, ma la sua famiglia sì
      }
    }

    if (somma <= 0) continue;
    risultati.push({
      codice: profilo.codice,
      profilo,
      punteggio: somma / quanti,
      presi,
      pieno: presi === quanti,
      trovate,
    });
  }

  const ordineConfidenza = { alta: 0, media: 1, bassa: 2 };
  risultati.sort((a, b) => b.presi - a.presi
    || b.punteggio - a.punteggio
    || (ordineConfidenza[a.profilo.confidenza] ?? 1) - (ordineConfidenza[b.profilo.confidenza] ?? 1)
    || String(a.codice).localeCompare(String(b.codice)));

  return {
    risultati,
    pieni: risultati.filter((r) => r.pieno).length,
    criteri: quanti,
    // Quante fragranze soddisfano ogni criterio da solo: serve a dire
    // "il tabacco è raro, da solo ne trovi sette" invece di un elenco vuoto.
    daSoli: [
      ...accordiVoluti.map((chiave) => ({ tipo: 'accordo', chiave })),
      ...noteVolute.map((chiave) => ({ tipo: 'nota', chiave })),
    ].map((criterio) => ({
      ...criterio, quante: contaSingoli.get(`${criterio.tipo}:${criterio.chiave}`) || 0,
    })),
    fuoriPerVeto,
    fuoriPerFiltri,
  };
}

/**
 * La piramide di un risultato, pronta da mostrare: per ogni nota si sa se è una
 * di quelle cercate. È l'unica parte "tecnica" che il cliente vede, ed è il
 * motivo per cui questo percorso esiste.
 */
export function piramide(profilo, criteri = {}, config = {}) {
  const sinonimi = tabellaSinonimi(config);
  const tabella = tabellaNote(config);
  const opzioni = impostazioni(config);
  const volute = new Set();
  for (const nota of criteri.note || []) for (const forma of formeDi(nota, sinonimi)) volute.add(forma);
  const famiglieVolute = new Set(criteri.accordi || []);

  return FILE_PIRAMIDE.map((fila) => ({
    fila,
    note: (profilo[fila] || []).map((nome) => {
      const chiave = normalizzaNota(nome);
      // Chi ha chiesto "legni" deve vedere accesi cedro e vetiver, non solo la parola legni.
      const suoi = tabella.get(chiave) || {};
      const accordo = [...famiglieVolute]
        .filter((f) => numero(suoi[f]) >= 0.25 && numero((profilo.accordi || {})[f]) >= sogliaDi(f, opzioni))
        .sort((a, b) => numero(suoi[b]) - numero(suoi[a]))[0] || null;
      return { nome, voluta: volute.has(chiave), accordo };
    }),
  })).filter((riga) => riga.note.length);
}

/** Etichetta leggibile di un criterio, per le chip e i riepiloghi. */
export function etichettaCriterio(criterio, config) {
  if (criterio.tipo === 'accordo') {
    const accordo = elencoAccordi(config).find((a) => a.chiave === criterio.chiave);
    return (accordo && accordo.etichetta) || criterio.chiave;
  }
  return criterio.nome || criterio.chiave;
}

/** La famiglia della fragranza in parole semplici (la stessa di motore.js). */
export function famigliaLeggibile(profilo, config) {
  return etichettaFamiglia(profilo.famiglia, config);
}

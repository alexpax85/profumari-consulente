// Statistiche anonime e aggregate (docs/06-backoffice.md): nessun identificativo,
// nessun orario oltre il giorno, nessun dato del cliente finale. Servono solo a
// capire cosa viene proposto e dove si abbandona il percorso.

import { oggi } from './ui.js';

export function nuoveStatistiche() {
  return { giorni: {}, codici: {}, opzioni: {}, abbandoni: {}, percorsi: {}, note: {}, ricerche: {}, consulti: {} };
}

function giorno(statistiche) {
  const data = oggi();
  const giorni = statistiche.giorni || (statistiche.giorni = {});
  return giorni[data] || (giorni[data] = { iniziati: 0, completati: 0, secondi: [] });
}

export function segnaInizio(statistiche) {
  if (!statistiche) return;
  giorno(statistiche).iniziati++;
}

/** Da quale delle due porte entra la clientela: percorso guidato o ricerca per note. */
export function segnaPercorso(statistiche, tipo) {
  if (!statistiche || !tipo) return;
  const percorsi = statistiche.percorsi || (statistiche.percorsi = {});
  percorsi[tipo] = (percorsi[tipo] || 0) + 1;
}

/**
 * Cosa cerca la gente quando sceglie le note. Si contano le chiavi scelte
 * (famiglie, note, veti) e quante fragranze ha trovato: niente altro, come sempre.
 */
export function segnaRicerca(statistiche, criteri = {}, esito = {}) {
  if (!statistiche) return;
  const note = statistiche.note || (statistiche.note = {});
  for (const chiave of [...(criteri.accordi || []), ...(criteri.note || [])]) {
    if (!chiave) continue;
    note[String(chiave)] = (note[String(chiave)] || 0) + 1;
  }
  const ricerche = statistiche.ricerche || (statistiche.ricerche = {});
  ricerche.fatte = (ricerche.fatte || 0) + 1;
  if (!esito.quanti) ricerche.vuote = (ricerche.vuote || 0) + 1;
  else if (!esito.pieni) ricerche.soloSomiglianti = (ricerche.soloSomiglianti || 0) + 1;
  for (const chiave of criteri.escludi || []) {
    const veti = ricerche.veti || (ricerche.veti = {});
    veti[String(chiave)] = (veti[String(chiave)] || 0) + 1;
  }
}

/**
 * Cosa racconta chi entra dalla porta delle parole (docs/13-consulente.md).
 * Si contano le CHIAVI delle scene capite — che sono nostre, scritte nel lessico —
 * e mai la frase: una frase libera è un dato del cliente, e potrebbe contenere un
 * nome commerciale. Delle parole non capite si conta solo che c'erano.
 */
export function segnaConsulto(statistiche, desiderio = {}, esito = null) {
  if (!statistiche) return;
  const c = statistiche.consulti || (statistiche.consulti = {});
  c.fatti = (c.fatti || 0) + 1;
  if (!esito || !esito.proposte || !esito.proposte.length) c.vuoti = (c.vuoti || 0) + 1;
  if ((desiderio.ignorate || []).length) c.conParoleIgnote = (c.conParoleIgnote || 0) + 1;
  for (const capita of desiderio.capito || []) {
    const dove = capita.modo === 'no' ? 'veti' : 'scene';
    const conteggi = c[dove] || (c[dove] = {});
    conteggi[capita.chiave] = (conteggi[capita.chiave] || 0) + 1;
  }
  const codici = statistiche.codici || (statistiche.codici = {});
  for (const p of (esito && esito.proposte) || []) codici[p.codice] = (codici[p.codice] || 0) + 1;
}

/** Il codice che il cliente si è aperto per leggerne la piramide. */
export function segnaSchedaAperta(statistiche, codice) {
  if (!statistiche || !codice) return;
  const aperte = (statistiche.ricerche || (statistiche.ricerche = {}));
  const schede = aperte.schede || (aperte.schede = {});
  schede[String(codice)] = (schede[String(codice)] || 0) + 1;
}

export function segnaCompletato(statistiche, { secondi = 0, codici = [] } = {}) {
  if (!statistiche) return;
  const g = giorno(statistiche);
  g.completati++;
  if (secondi > 0 && secondi < 900) g.secondi.push(Math.round(secondi));
  const conteggi = statistiche.codici || (statistiche.codici = {});
  for (const codice of codici) conteggi[codice] = (conteggi[codice] || 0) + 1;
}

/** Dove si è fermato chi non è arrivato in fondo. */
export function segnaAbbandono(statistiche, idDomanda) {
  if (!statistiche || !idDomanda) return;
  const abbandoni = statistiche.abbandoni || (statistiche.abbandoni = {});
  abbandoni[idDomanda] = (abbandoni[idDomanda] || 0) + 1;
}

export function segnaRisposta(statistiche, idDomanda, valore) {
  if (!statistiche || !idDomanda) return;
  const opzioni = statistiche.opzioni || (statistiche.opzioni = {});
  const perDomanda = opzioni[idDomanda] || (opzioni[idDomanda] = {});
  for (const scelta of [].concat(valore)) {
    if (scelta === null || scelta === undefined || scelta === '') continue;
    const chiave = String(scelta);
    perDomanda[chiave] = (perDomanda[chiave] || 0) + 1;
  }
}

export function riepilogo(statistiche) {
  const giorni = Object.entries((statistiche && statistiche.giorni) || {})
    .sort((a, b) => b[0].localeCompare(a[0]));
  let iniziati = 0, completati = 0;
  const tempi = [];
  for (const [, g] of giorni) {
    iniziati += g.iniziati || 0;
    completati += g.completati || 0;
    for (const s of g.secondi || []) tempi.push(s);
  }
  tempi.sort((a, b) => a - b);
  const mediano = tempi.length ? tempi[Math.floor(tempi.length / 2)] : null;
  const codici = Object.entries((statistiche && statistiche.codici) || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const abbandoni = Object.entries((statistiche && statistiche.abbandoni) || {})
    .sort((a, b) => b[1] - a[1]);
  const note = Object.entries((statistiche && statistiche.note) || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const percorsi = (statistiche && statistiche.percorsi) || {};
  const ricerche = (statistiche && statistiche.ricerche) || {};
  const consulti = (statistiche && statistiche.consulti) || {};
  return { giorni, iniziati, completati, mediano, codici, abbandoni, note, percorsi, ricerche, consulti };
}

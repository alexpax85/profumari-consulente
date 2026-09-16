// Statistiche anonime e aggregate (docs/06-backoffice.md): nessun identificativo,
// nessun orario oltre il giorno, nessun dato del cliente finale. Servono solo a
// capire cosa viene proposto e dove si abbandona il percorso.

import { oggi } from './ui.js';

export function nuoveStatistiche() {
  return { giorni: {}, codici: {}, opzioni: {}, abbandoni: {} };
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
  return { giorni, iniziati, completati, mediano, codici, abbandoni };
}

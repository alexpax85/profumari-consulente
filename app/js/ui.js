// Aiutanti minimi per il DOM: niente framework, niente librerie esterne.

export const $ = (selettore, dentro = document) => dentro.querySelector(selettore);
export const $$ = (selettore, dentro = document) => [...dentro.querySelectorAll(selettore)];

/** el('button', { class: 'primario', onclick: fn }, 'Testo') */
export function el(tag, attributi = {}, figli = []) {
  const nodo = document.createElement(tag);
  for (const [chiave, valore] of Object.entries(attributi)) {
    if (valore === null || valore === undefined || valore === false) continue;
    if (chiave === 'class') nodo.className = valore;
    else if (chiave === 'html') nodo.innerHTML = valore;
    else if (chiave === 'testo') nodo.textContent = valore;
    else if (chiave === 'dati') for (const [d, v] of Object.entries(valore)) nodo.dataset[d] = v;
    // Sui campi il valore va messo come proprietà: sulle textarea l'attributo non si vede.
    else if (chiave === 'value' && 'value' in nodo) nodo.value = valore;
    else if (chiave.startsWith('on') && typeof valore === 'function') nodo.addEventListener(chiave.slice(2), valore);
    else if (valore === true) nodo.setAttribute(chiave, '');
    else nodo.setAttribute(chiave, valore);
  }
  for (const figlio of [].concat(figli)) {
    if (figlio === null || figlio === undefined || figlio === false) continue;
    nodo.append(typeof figlio === 'string' || typeof figlio === 'number' ? String(figlio) : figlio);
  }
  return nodo;
}

export function svuota(nodo) {
  while (nodo && nodo.firstChild) nodo.removeChild(nodo.firstChild);
  return nodo;
}

export function mostra(nodo, visibile = true) {
  if (nodo) nodo.hidden = !visibile;
}

let timerToast = null;
export function toast(messaggio, millisecondi = 2600) {
  const nodo = document.getElementById('toast');
  if (!nodo) return;
  nodo.textContent = messaggio;
  nodo.classList.add('on');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => nodo.classList.remove('on'), millisecondi);
}

export function oggi() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dataItaliana(iso) {
  if (!iso) return '—';
  const [a, m, g] = String(iso).slice(0, 10).split('-');
  return g && m && a ? `${g}/${m}/${a}` : iso;
}

/** Tocco lungo (apre il backoffice dal logo). Pollice fermo per N millisecondi. */
export function toccoLungo(nodo, millisecondi, azione) {
  let timer = null;
  const ferma = () => { clearTimeout(timer); timer = null; };
  const parti = () => { ferma(); timer = setTimeout(() => { ferma(); azione(); }, millisecondi); };
  nodo.addEventListener('pointerdown', parti);
  for (const evento of ['pointerup', 'pointerleave', 'pointercancel']) nodo.addEventListener(evento, ferma);
  nodo.addEventListener('contextmenu', (e) => e.preventDefault());
  return ferma;
}

/**
 * Conferma che invece di chiedere "sei sicuro?" dice **cosa cambia e cosa resta**.
 * Si usa solo dove qualcosa viene sostituito o perso: su un interruttore sarebbe
 * rumore, e un popup che si clicca senza leggere non protegge più niente.
 *
 *   const scelte = await chiediConferma({
 *     titolo: 'Elimina la domanda',
 *     righe: [
 *       { cosa: 'cambia', testo: 'Sparisce dal percorso al prossimo cliente.' },
 *       { cosa: 'resta', testo: 'Statistiche e profili non si toccano.' },
 *     ],
 *     opzioni: [{ id: 'tieni', etichetta: 'Tieni le mie domande', valore: true }],
 *     conferma: 'Elimina', pericolo: true,
 *   });
 *   if (!scelte) return;      // annullato
 *   if (scelte.tieni) { ... } // le caselle spuntate tornano qui
 */
export function chiediConferma({
  titolo, righe = [], opzioni = [], conferma = 'Conferma', annulla = 'Annulla', pericolo = false,
} = {}) {
  const dialogo = document.getElementById('dlg-conferma');
  if (!dialogo) return Promise.resolve(window.confirm(titolo) ? {} : false);

  document.getElementById('dlg-conferma-titolo').textContent = titolo || 'Conferma';
  const elencoRighe = svuota(document.getElementById('dlg-conferma-righe'));
  for (const riga of righe) {
    if (!riga) continue;
    const { cosa = 'cambia', testo } = typeof riga === 'string' ? { testo: riga } : riga;
    elencoRighe.append(el('li', { class: cosa, testo }));
  }
  const elencoOpzioni = svuota(document.getElementById('dlg-conferma-opzioni'));
  const caselle = new Map();
  for (const opzione of opzioni) {
    const casella = el('input', { type: 'checkbox', checked: opzione.valore !== false });
    caselle.set(opzione.id, casella);
    elencoOpzioni.append(el('label', { class: 'casella' }, [casella, opzione.etichetta]));
  }

  const ok = document.getElementById('dlg-conferma-ok');
  const no = document.getElementById('dlg-conferma-annulla');
  ok.textContent = conferma;
  no.textContent = annulla;
  ok.className = pericolo ? 'pericolo' : 'primario';

  return new Promise((risolvi) => {
    const chiudi = (esito) => {
      ok.removeEventListener('click', accetta);
      no.removeEventListener('click', rifiuta);
      dialogo.removeEventListener('close', rifiuta);
      dialogo.close();
      risolvi(esito);
    };
    const accetta = () => chiudi(Object.fromEntries([...caselle].map(([id, c]) => [id, c.checked])));
    const rifiuta = () => chiudi(false);
    ok.addEventListener('click', accetta);
    no.addEventListener('click', rifiuta);
    dialogo.addEventListener('close', rifiuta);
    dialogo.showModal();
  });
}

/** Scarica un file dal browser (export JSON del backoffice). */
export function scarica(nomeFile, testo, tipo = 'application/json') {
  const blob = new Blob([testo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: nomeFile });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

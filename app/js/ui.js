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

// Icone a linea, monocrome, disegnate qui dentro: nessuna immagine, nessun marchio.
// Ogni voce è il contenuto di un <svg viewBox="0 0 24 24">; colore e spessore
// arrivano dal CSS (.scheda-opzione .cerchio svg).

const D = {
  persona: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.7 3.1-5.8 7-5.8s7 2.1 7 5.8"/>',
  pacco: '<rect x="3.5" y="9" width="17" height="11" rx="1.4"/><path d="M3.5 13h17M12 9v11"/><path d="M12 9C11 6.6 9.7 5 8.3 5a2 2 0 0 0 0 4zM12 9c1-2.4 2.3-4 3.7-4a2 2 0 0 1 0 4z"/>',
  cuore: '<path d="M12 20.3 4.9 13.2a4.4 4.4 0 0 1 6.2-6.2l.9.9.9-.9a4.4 4.4 0 0 1 6.2 6.2z"/>',
  casa: '<path d="M3.8 10.6 12 4l8.2 6.6"/><path d="M6 10v10h12V10"/><path d="M10 20v-5.2h4V20"/>',
  amici: '<circle cx="9" cy="8.4" r="3"/><path d="M3 19.5c0-3.1 2.7-4.9 6-4.9s6 1.8 6 4.9"/><path d="M16.2 6.1a3 3 0 0 1 0 5.8M17.3 14.4c2.3.6 3.7 2.1 3.7 4.4"/>',
  valigetta: '<rect x="3" y="7.5" width="18" height="12.5" rx="1.6"/><path d="M9 7.5V6.2A1.7 1.7 0 0 1 10.7 4.5h2.6A1.7 1.7 0 0 1 15 6.2v1.3"/><path d="M3 13.2h18"/>',
  scintilla: '<path d="M11 3 12.7 8.3 18 10l-5.3 1.7L11 17l-1.7-5.3L4 10l5.3-1.7z"/><path d="M17.8 15.6l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8z"/>',
  uomo: '<circle cx="10" cy="14.2" r="5.2"/><path d="M13.9 10.3 20 4.2M15 4h5v5"/>',
  donna: '<circle cx="12" cy="9" r="5.2"/><path d="M12 14.2v7M9 18.2h6"/>',
  entrambi: '<circle cx="11" cy="12" r="4.4"/><path d="M11 16.4V21M8.6 18.7h4.8M14.3 8.7 19 4M14.6 4h4.4v4.4"/>',
  onda: '<path d="M3 8.5c2-1.7 3.7-1.7 5.7 0s3.9 1.7 5.9 0 3.7-1.7 5.7 0"/><path d="M3 13.5c2-1.7 3.7-1.7 5.7 0s3.9 1.7 5.9 0 3.7-1.7 5.7 0"/><path d="M3 18.5c2-1.7 3.7-1.7 5.7 0s3.9 1.7 5.9 0 3.7-1.7 5.7 0"/>',
  albero: '<path d="M12 21v-4.2"/><path d="M12 3 6.6 11h10.8z"/><path d="M12 8.6 7 16.8h10z"/>',
  citta: '<path d="M2.5 20.5h19"/><path d="M5 20.5V8.6l5.2-3v14.9"/><path d="M14 20.5v-9.2l5 2.6v6.6"/><path d="M7.2 11h1M7.2 14h1M16.2 16h1"/>',
  dolce: '<path d="M6 11h12l-1.6 8.6a1.1 1.1 0 0 1-1.1.9H8.7a1.1 1.1 0 0 1-1.1-.9z"/><path d="M6.6 11a3 3 0 0 1 .9-5.4 3.2 3.2 0 0 1 6-1.1 3 3 0 0 1 4.1 3.5A3 3 0 0 1 17.4 11"/>',
  fiore: '<circle cx="12" cy="12" r="2.3"/><ellipse cx="12" cy="6.7" rx="2.1" ry="3"/><ellipse cx="12" cy="17.3" rx="2.1" ry="3"/><ellipse cx="6.7" cy="12" rx="3" ry="2.1"/><ellipse cx="17.3" cy="12" rx="3" ry="2.1"/>',
  'fiore-pieno': '<circle cx="12" cy="11" r="2"/><ellipse cx="12" cy="6.2" rx="1.9" ry="2.7"/><ellipse cx="7.4" cy="12.6" rx="2.7" ry="1.9" transform="rotate(-35 7.4 12.6)"/><ellipse cx="16.6" cy="12.6" rx="2.7" ry="1.9" transform="rotate(35 16.6 12.6)"/><path d="M12 13v8"/>',
  rosa: '<circle cx="12" cy="12" r="8.2"/><path d="M15.6 10.4a3.7 3.7 0 1 0-1.2 3.9c1.4-1.2 1.2-3.4-.5-4.2-1.5-.7-3 .4-3 1.9"/>',
  spezie: '<path d="M12 3.2 13.6 7.6 18 6l-1.6 4.4 4.4 1.6-4.4 1.6L18 18l-4.4-1.6L12 20.8l-1.6-4.4L6 18l1.6-4.4L3.2 12l4.4-1.6L6 6l4.4 1.6z"/>',
  palma: '<path d="M12.6 21c-.2-5 .2-8.7 1-10.8"/><path d="M13.6 10.2C11.8 7.7 9 7 5.6 8.5M13.6 10.2c-.7-3 .7-5.5 4-6.8M13.6 10.2c2.7-1.7 5.4-1.3 7.4 1.2M13.6 10.2c-2.5 1-3.8 3.1-3.8 6"/>',
  baita: '<path d="M2.5 19.5h19L15 7l-3.5 6.2L9.2 10z"/><path d="M12.4 10.8 15 7"/>',
  limone: '<circle cx="11.3" cy="13.2" r="6.9"/><path d="M11.3 6.3v13.8M4.4 13.2h13.8"/><path d="M14.8 6.6c1.5-2 3.4-2.7 5.1-2.5-.2 1.8-1.1 3.4-2.9 4.1"/>',
  libro: '<path d="M4 4.8h5.6A2.4 2.4 0 0 1 12 6.4a2.4 2.4 0 0 1 2.4-1.6H20v13h-5.6A2.4 2.4 0 0 0 12 19.4a2.4 2.4 0 0 0-2.4-1.6H4z"/><path d="M12 6.4v13"/>',
  goccia: '<path d="M12 3.4s6.2 6.6 6.2 10.2a6.2 6.2 0 0 1-12.4 0C5.8 10 12 3.4 12 3.4z"/>',
  volume: '<path d="M3.5 9.4h3.6L12 5.3v13.4L7.1 14.6H3.5z"/><path d="M15.2 9.2a4.6 4.6 0 0 1 0 5.6M18.2 6.4a8.3 8.3 0 0 1 0 11.2"/>',
  cipria: '<circle cx="12" cy="12" r="8.2"/><path d="M4.6 8.6h14.8"/><path d="M8.6 13.4a3.4 3.4 0 0 1 6.8 0"/>',
  fumo: '<path d="M8 20.5c0-2.5 2-2.9 2-5.2s-2-2.7-2-5.1 2-3.4 2-5.2"/><path d="M14 20.5c0-2.5 2-2.9 2-5.2s-2-2.7-2-5.1"/><path d="M4.5 20.5h15"/>',
  terra: '<path d="M3.5 16.6h17"/><path d="M12 16.6v-4.3"/><path d="M12 12.3c-3.5 0-4.8-2.3-4.8-4.8 2.7 0 4.8 1.5 4.8 4.8zM12 12.3c0-3.1 1.9-4.8 4.6-4.8 0 2.7-1.3 4.8-4.6 4.8z"/><path d="M5 20.5h14"/>',
  aperto: '<path d="M2.5 12S6 6.4 12 6.4 21.5 12 21.5 12 18 17.6 12 17.6 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  calendario: '<rect x="3.5" y="5.6" width="17" height="14.9" rx="1.6"/><path d="M3.5 10.2h17M8.2 3.5v4.2M15.8 3.5v4.2"/>',
  luna: '<path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8 8.6 8.6 0 1 0 20.2 14.6z"/>',
  corsa: '<circle cx="15.2" cy="4.8" r="1.9"/><path d="M8.2 20.6 11 15.9 9.2 12.7l1.3-3.9 3.1 1.5 1.4 2.9 3.2 1.1"/><path d="M5.6 12.4l4.9-3.6"/><path d="M13 13.8l-.6 6.8"/>',
  calice: '<path d="M7 3.8h10l-1 5.6a4 4 0 0 1-8 0z"/><path d="M12 13.4v6.8M8.4 20.2h7.2"/>',
  germoglio: '<path d="M12 20.5v-6.3"/><path d="M12 14.2c0-3.2 2.1-5.2 5.2-5.2 0 3.2-2.1 5.2-5.2 5.2zM12 16.4c0-2.5-1.7-4.2-4.2-4.2 0 2.5 1.7 4.2 4.2 4.2z"/>',
  sole: '<circle cx="12" cy="12" r="4.4"/><path d="M12 2.4v2.5M12 19.1v2.5M2.4 12h2.5M19.1 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/>',
  fogliacaduta: '<path d="M4.5 19.5C4.5 11 9.8 5.2 19.8 4.5c.7 10-5 15.5-14 15"/><path d="M5 19 14.2 9.8"/><path d="M4 8.5 2 7M6.5 5 5.5 2.8"/>',
  fiocco: '<path d="M12 2.6v18.8M3.9 7.3l16.2 9.4M20.1 7.3 3.9 16.7"/><path d="M12 6.2 9.6 3.8M12 6.2l2.4-2.4M12 17.8l-2.4 2.4M12 17.8l2.4 2.4"/>',
  ciclo: '<path d="M20 12a8 8 0 1 1-2.7-6"/><path d="M20.4 3.6v4.8h-4.8"/>',
  fulmine: '<path d="M13.6 2.4 5 13.6h6.1L9.6 21.6 19 10.2h-6.1z"/>',
  zen: '<circle cx="12" cy="12" r="8.4"/><path d="M12 3.6a4.2 4.2 0 0 0 0 8.4 4.2 4.2 0 0 1 0 8.4"/>',
  fiamma: '<path d="M12 3c3 4 .8 5.5 2.2 7.5C15.4 12.2 18 11.6 18 14.6A6 6 0 0 1 6 14.6C6 10.2 12 9.2 12 3z"/>',
  diamante: '<path d="M5 9.4 8.2 4.4h7.6L19 9.4l-7 10.6z"/><path d="M5 9.4h14M8.2 4.4 12 20M15.8 4.4 12 20"/>',
  freccia: '<path d="M4.4 19.6 19.6 4.4"/><path d="M12.6 4.4h7v7"/><path d="M4.4 19.6h4M4.4 19.6v-4"/>',
  nuvola: '<path d="M7.4 18.4h9.2a4.1 4.1 0 0 0 .6-8.2 5.6 5.6 0 0 0-10.7 1A3.6 3.6 0 0 0 7.4 18.4z"/>',
  maschera: '<path d="M3.4 8.4C7 6.9 9.5 6.9 12 8.4c2.5-1.5 5-1.5 8.6 0-.5 5.1-2.6 8.2-5.1 8.2-1.6 0-2.7-1.2-3.5-2.7-.8 1.5-1.9 2.7-3.5 2.7-2.5 0-4.6-3.1-5.1-8.2z"/><circle cx="7.7" cy="11.3" r=".9"/><circle cx="16.3" cy="11.3" r=".9"/>',
  sorriso: '<circle cx="12" cy="12" r="8.4"/><path d="M8 13.6a4.6 4.6 0 0 0 8 0"/><circle cx="9.3" cy="9.8" r=".9"/><circle cx="14.7" cy="9.8" r=".9"/>',
  tazza: '<path d="M4.4 7.6h12v6.6a4.4 4.4 0 0 1-8.8 0z"/><path d="M16.4 9.2h1.8a2.2 2.2 0 0 1 0 4.4h-1.8"/><path d="M4 20.2h13.6"/>',
  bicchiere: '<path d="M7.2 4h9.6l-1.2 16.2H8.4z"/><path d="M7.7 11h8.6"/>',
  tessuto: '<rect x="4" y="4" width="16" height="16" rx="1.6"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
  drappo: '<path d="M4.2 4.5c3 1.7 5 5.2 5 8.8s-2 5.7-5 7.2"/><path d="M10 4.5c3.3 1.7 5.5 5.4 5.5 9.1 0 2.6-1 4.9-2.6 6.4"/><path d="M15.8 4.8c3 2 4.4 5.2 4.4 8.6 0 2.5-.8 4.9-2.2 6.7"/>',
  gomitolo: '<circle cx="12" cy="12" r="8.2"/><path d="M6.2 7c3.2 1.5 6.8 5.1 8.8 9.8M8.8 4.8c3.1 2 6.2 5.6 7.8 9.4M5 10.6c2.6 1 5.7 3.9 7.2 7.2"/>',
  cuoio: '<rect x="3.4" y="6.4" width="17.2" height="11.4" rx="2.2"/><path d="M3.4 10.4h17.2"/><circle cx="16.6" cy="14.2" r="1.2"/>',
  bucato: '<path d="M8.6 4 5 6.2l1.6 3.6L8.2 9.2V20h7.6V9.2l1.6.6L19 6.2 15.4 4c-.8 1.5-2 2.2-3.4 2.2S9.4 5.5 8.6 4z"/>',
  ambra: '<path d="M12 3.4 19 7.7v8.6L12 20.6 5 16.3V7.7z"/><path d="M12 8.4 15.6 10.6v4.4L12 17.2l-3.6-2.2v-4.4z"/>',
  vaniglia: '<path d="M10.4 20.6c-2.4-4.2-2.2-11.4 1.8-17.2 3.6 5.2 3.8 13.4.4 17.2z"/><path d="M11.2 6.4v12.4"/>',
  miele: '<path d="M8.2 3.8h7.6l-.8 3.4H9z"/><path d="M9 7.2h6a3.2 3.2 0 0 1 3.2 3.2v6.4A3.2 3.2 0 0 1 15 20H9a3.2 3.2 0 0 1-3.2-3.2v-6.4A3.2 3.2 0 0 1 9 7.2z"/><path d="M5.8 12.8h12.4"/>',
  tabacco: '<path d="M12 20.6c-5-3-7-7.6-7-13.2 4.1 0 7 1.6 7 5.6 0-4 2.9-5.6 7-5.6 0 5.6-2 10.2-7 13.2z"/><path d="M12 20.6V13"/>',
  oud: '<ellipse cx="8.6" cy="12" rx="3.2" ry="7.4"/><path d="M8.6 4.6h6.6c1.8 0 3.2 3.3 3.2 7.4s-1.4 7.4-3.2 7.4H8.6"/><ellipse cx="8.6" cy="12" rx="1.2" ry="3"/>',
  erba: '<path d="M12 20.4c0-5.2-2.1-8.4-5.2-10.4 3.1 0 6.2 2.6 6.2 6.2M12 20.4c0-5.2 2.1-8.4 5.2-10.4-3.1 0-6.2 2.6-6.2 6.2"/><path d="M12 20.4v-4.2"/>',
  foglia: '<path d="M4.6 19.4C4.6 11 10 5.2 20 4.6c.6 10-5 15.4-14 15.4"/><path d="M5 19 14.2 9.8"/>',
  pera: '<path d="M12 6.6c-2.7.9-4.6 3.5-4.6 6.8 0 3.7 2.1 6.6 4.6 6.6s4.6-2.9 4.6-6.6c0-3.3-1.9-5.9-4.6-6.8z"/><path d="M12 6.6V3.4M12 4.4c1.7-1 3.1-1 4.2-.5"/>',
  alba: '<path d="M2.6 18.6h18.8"/><path d="M6.4 18.6a5.6 5.6 0 0 1 11.2 0"/><path d="M12 3.6v5M9.6 6 12 3.6 14.4 6"/><path d="M4.4 9.4 6 11M19.6 9.4 18 11"/>',
  tramonto: '<path d="M2.6 18.6h18.8"/><path d="M6.4 18.6a5.6 5.6 0 0 1 11.2 0"/><path d="M12 9V3.6M9.6 6.6 12 9l2.4-2.4"/><path d="M4.4 9.4 6 11M19.6 9.4 18 11"/>',
  vento: '<path d="M3 9h10.6a3 3 0 1 0-3-3"/><path d="M3 14h13.6a3 3 0 1 1-3 3"/><path d="M3 19h6.6"/>',
  spunta: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
};

/** I nomi disponibili, per chi deve farli scegliere (l'editor delle domande). */
export const NOMI_ICONE = Object.keys(D).sort();

/** Restituisce un <svg> pronto da inserire. */
export function icona(nome) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = D[nome] || D.aperto;
  return svg;
}

/** Tinta di sfondo del cerchio: sabbia, salvia, cipria, notte (docs/07-stile.md). */
const TINTE = {
  onda: 'salvia', albero: 'salvia', citta: 'notte', dolce: 'sabbia', fiore: 'cipria',
  'fiore-pieno': 'cipria', rosa: 'cipria', spezie: 'sabbia', palma: 'sabbia', baita: 'notte',
  limone: 'sabbia', libro: 'notte', goccia: 'salvia', volume: 'notte', cipria: 'cipria',
  fumo: 'notte', terra: 'salvia', aperto: 'salvia', calendario: 'salvia', luna: 'notte',
  corsa: 'salvia', calice: 'sabbia', germoglio: 'salvia', sole: 'sabbia', fogliacaduta: 'sabbia',
  fiocco: 'salvia', ciclo: 'salvia', fulmine: 'sabbia', zen: 'salvia', fiamma: 'sabbia',
  diamante: 'cipria', freccia: 'notte', nuvola: 'cipria', maschera: 'notte', sorriso: 'cipria',
  tazza: 'sabbia', bicchiere: 'sabbia', tessuto: 'salvia', drappo: 'cipria', gomitolo: 'sabbia',
  cuoio: 'notte', bucato: 'salvia', ambra: 'sabbia', vaniglia: 'sabbia', miele: 'sabbia',
  tabacco: 'notte', oud: 'notte', erba: 'salvia', foglia: 'salvia', pera: 'cipria',
  alba: 'sabbia', tramonto: 'sabbia', vento: 'salvia', cuore: 'cipria', casa: 'sabbia',
  amici: 'salvia', valigetta: 'notte', scintilla: 'cipria', persona: 'salvia', pacco: 'cipria',
  uomo: 'salvia', donna: 'cipria', entrambi: 'sabbia',
};

export function tintaIcona(nome) {
  return TINTE[nome] || 'salvia';
}

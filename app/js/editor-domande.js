// Editor delle domande del percorso, dentro il backoffice (docs/06-backoffice.md).
//
// Il motore non sa quante domande esistono: legge quelle che trova e somma i
// contributi delle risposte scelte. Aggiungere una domanda quindi è
// configurazione, non codice — e da qui la si scrive senza toccare i file.
//
// Ogni domanda modificata qui viene marcata `toccata`: da quel momento gli
// aggiornamenti dell'app non la riscrivono più (vedi aggiornaDomande in dati.js).

import { el, svuota, toast, chiediConferma } from './ui.js';
import { icona, NOMI_ICONE } from './icone.js';
import { elencoAccordi, elencoDomande, etichettaAccordo } from './motore.js';

const TIPI = [
  { valore: 'singola', etichetta: 'Una risposta sola' },
  { valore: 'multipla', etichetta: 'Più risposte' },
  { valore: 'scala', etichetta: 'Cursore da 1 a 5' },
];
const GRUPPI = [
  { valore: '', etichetta: 'Domanda del percorso' },
  { valore: 'gioco', etichetta: 'Domanda gioco (a rotazione, una per percorso)' },
];
/** Un id ancora provvisorio: nessuno ci ha fatto affidamento, si può cambiare. */
const PROVVISORIO = /^(domanda|gioco)(_\d+)?$/;

const ATTRIBUTI_SCALA = ['intensita', 'persistenza', 'dolcezza', 'freschezza'];
const OCCASIONI = ['quotidiano', 'ufficio', 'serata', 'sport', 'speciale', 'romantico'];
const CARATTERE = ['energico', 'calmo', 'sensuale', 'elegante', 'audace', 'coccola',
  'misterioso', 'allegro', 'romantico', 'sicuro', 'fresco'];

/** Quanto una risposta spinge su un accordo, detto in parole invece che in numeri. */
export const LIVELLI = [
  { valore: 0, etichetta: '—' },
  { valore: 0.3, etichetta: 'un tocco' },
  { valore: 0.6, etichetta: 'abbastanza' },
  { valore: 1, etichetta: 'tanto' },
];

export function livelloDi(valore) {
  const v = Number(valore) || 0;
  let scelto = LIVELLI[0];
  for (const livello of LIVELLI) if (Math.abs(livello.valore - v) < Math.abs(scelto.valore - v)) scelto = livello;
  return scelto;
}

/** Un tocco → abbastanza → tanto → niente. */
export function prossimoLivello(valore) {
  const indice = LIVELLI.indexOf(livelloDi(valore));
  return LIVELLI[(indice + 1) % LIVELLI.length].valore;
}

/** Id leggibile ricavato dal titolo, senza scontrarsi con quelli già in uso. */
export function idDaTitolo(titolo, presi = [], prefisso = 'domanda') {
  const base = String(titolo || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .split('_').filter((pezzo) => pezzo.length > 1).slice(0, 3).join('_') || prefisso;
  if (!presi.includes(base)) return base;
  let n = 2;
  while (presi.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export function nuovaDomanda(presi = [], gruppo = '') {
  const id = idDaTitolo('', presi, gruppo === 'gioco' ? 'gioco' : 'domanda');
  return {
    id,
    tipo: 'singola',
    peso: gruppo === 'gioco' ? 0.35 : 0.7,
    attiva: true,
    gruppo: gruppo || undefined,
    titolo: '',
    sottotitolo: '',
    opzioni: [
      { id: 'risposta_1', etichetta: '', icona: 'aperto', accordi: {} },
      { id: 'risposta_2', etichetta: '', icona: 'aperto', accordi: {} },
    ],
    toccata: true,
  };
}

export function duplicaDomanda(domanda, presi = []) {
  const copia = structuredClone(domanda);
  copia.id = idDaTitolo(`${domanda.titolo || domanda.id} copia`, presi, `${domanda.id}_copia`);
  copia.titolo = `${domanda.titolo || domanda.id} (copia)`;
  copia.attiva = false;
  copia.toccata = true;
  return copia;
}

/** Cosa manca perché la domanda sia utilizzabile al chiosco. */
export function problemiDi(domanda) {
  const problemi = [];
  if (!String(domanda.titolo || '').trim()) problemi.push('manca il titolo');
  if (domanda.tipo === 'scala') {
    if (!(domanda.attributiScala || []).length) problemi.push('scegli almeno un attributo da spostare');
    return problemi;
  }
  const opzioni = domanda.opzioni || [];
  if (opzioni.length < 2) problemi.push('servono almeno due risposte');
  if (opzioni.some((o) => !String(o.etichetta || '').trim())) problemi.push('una risposta non ha il testo');
  // Una risposta "parla" in tanti modi: accordi, attributi, contesto, veti, filtri.
  const dice = (o) => Object.keys(o.accordi || {}).length || Object.keys(o.attributi || {}).length
    || Object.keys(o.stagioni || {}).length || Object.keys(o.momento || {}).length
    || Object.keys(o.escludi || {}).length || Object.keys(o.escludiAttributi || {}).length
    || (o.carattere || []).length || (o.occasioni || []).length || o.filtro || o.modo;
  const muta = opzioni.every((o) => !dice(o));
  if (muta) problemi.push('nessuna risposta sposta qualcosa: la domanda non cambierebbe i risultati');
  return problemi;
}

// ------------------------------------------------------------------- editor

export function creaEditorDomande({ salva, disegna, predefinite = () => [] }) {
  let aperta = null;

  const elenco = (s) => elencoDomande(s.config);
  const ids = (s) => elenco(s).map((d) => d.id);

  function scriviElenco(s, nuovo) {
    if (Array.isArray(s.config.domande)) s.config.domande = nuovo;
    else s.config.domande = { ...s.config.domande, domande: nuovo };
  }

  function segna(domanda) {
    domanda.toccata = true;
  }

  /** Arrivata con l'app (e quindi tornerebbe da sola), oppure scritta dal negozio. */
  const diFabbrica = (domanda) => predefinite().some((d) => d && d.id === domanda.id);

  // ------------------------------------------------------------ la tabella

  function tabella(s) {
    const domande = elenco(s);
    const righe = el('tbody');
    domande.forEach((domanda, i) => {
      const problemi = problemiDi(domanda);
      righe.append(el('tr', {}, [
        el('td', { class: 'num' }, [
          el('div', { class: 'azioni-riga' }, [
            el('button', {
              type: 'button', title: 'Sposta su', disabled: i === 0,
              onclick: () => { const n = [...domande]; n.splice(i - 1, 0, n.splice(i, 1)[0]); scriviElenco(s, n); salva(); disegna(); },
            }, '↑'),
            el('button', {
              type: 'button', title: 'Sposta giù', disabled: i === domande.length - 1,
              onclick: () => { const n = [...domande]; n.splice(i + 1, 0, n.splice(i, 1)[0]); scriviElenco(s, n); salva(); disegna(); },
            }, '↓'),
          ]),
        ]),
        el('td', {}, [
          el('button', { class: 'collegamento', type: 'button', onclick: () => { aperta = domanda.id; disegna(); } },
            domanda.titolo || '(senza titolo)'),
          problemi.length ? el('span', { class: 'badge esaurito', testo: 'da completare' }) : null,
          el('div', { class: 'muted piccolo-testo', testo: domanda.id }),
        ]),
        el('td', { class: 'muted', testo: (TIPI.find((t) => t.valore === domanda.tipo) || {}).etichetta || domanda.tipo }),
        el('td', { testo: domanda.gruppo === 'gioco' ? 'gioco' : '' }),
        el('td', { class: 'num', testo: domanda.tipo === 'scala' ? '—' : String((domanda.opzioni || []).length) }),
        el('td', { class: 'num' }, [el('input', {
          type: 'number', value: String(domanda.peso ?? 1), min: '0', max: '2', step: '0.05',
          style: 'max-width:6rem',
          onchange: (e) => { domanda.peso = Number(e.target.value); salva(); },
        })]),
        el('td', {}, [el('input', {
          type: 'checkbox', checked: domanda.attiva !== false,
          onchange: (e) => { domanda.attiva = e.target.checked; salva(); },
        })]),
        el('td', {}, [
          el('div', { class: 'azioni-riga' }, [
            el('button', { type: 'button', onclick: () => { aperta = domanda.id; disegna(); } }, 'Apri'),
            el('button', {
              type: 'button',
              onclick: () => {
                const copia = duplicaDomanda(domanda, ids(s));
                scriviElenco(s, [...domande.slice(0, i + 1), copia, ...domande.slice(i + 1)]);
                aperta = copia.id;
                salva(); disegna();
                toast('Copia creata, spenta finché non la accendi.');
              },
            }, 'Duplica'),
            el('button', { class: 'pericolo', type: 'button', onclick: () => elimina(s, domanda, diFabbrica(domanda)) }, 'Elimina'),
          ]),
        ]),
      ]));
    });

    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Domande del percorso' }),
      el('p', { class: 'muted piccolo-testo' },
        'Il peso moltiplica i contributi della domanda. Le domande “gioco” ruotano: a ogni percorso ne compare una. '
        + 'Apri una domanda per cambiarne le risposte e quello che spostano; sotto, la Prova rapida mostra subito l’effetto.'),
      el('div', { class: 'tabella-wrap' }, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [
          el('th', { testo: '' }), el('th', { testo: 'Domanda' }), el('th', { testo: 'Tipo' }),
          el('th', { testo: 'Gruppo' }), el('th', { class: 'num', testo: 'Risposte' }),
          el('th', { class: 'num', testo: 'Peso' }), el('th', { testo: 'Attiva' }), el('th', { testo: '' }),
        ])]),
        righe,
      ])]),
      el('div', { class: 'azioni' }, [
        el('button', {
          class: 'primario', type: 'button',
          onclick: () => {
            const domanda = nuovaDomanda(ids(s), '');
            scriviElenco(s, [...elenco(s), domanda]);
            aperta = domanda.id;
            salva(); disegna();
          },
        }, 'Nuova domanda'),
        el('button', {
          type: 'button',
          onclick: () => {
            const domanda = nuovaDomanda(ids(s), 'gioco');
            scriviElenco(s, [...elenco(s), domanda]);
            aperta = domanda.id;
            salva(); disegna();
          },
        }, 'Nuova domanda gioco'),
      ]),
    ]);
  }

  async function elimina(s, domanda, arrivataConLApp) {
    const scelte = await chiediConferma({
      titolo: `Elimina “${domanda.titolo || domanda.id}”`,
      righe: [
        { cosa: 'cambia', testo: 'Sparisce dal percorso a partire dal prossimo cliente.' },
        arrivataConLApp
          ? { cosa: 'cambia', testo: 'È una domanda arrivata con l\'app: non tornerà con i prossimi aggiornamenti.' }
          : { cosa: 'cambia', testo: 'L\'hai scritta tu: per riaverla va riscritta.' },
        { cosa: 'resta', testo: 'Le altre domande, i profili e le statistiche non si toccano.' },
      ],
      conferma: 'Elimina',
      pericolo: true,
    });
    if (!scelte) return;
    scriviElenco(s, elenco(s).filter((d) => d.id !== domanda.id));
    // Se è una domanda arrivata con l'app, va ricordato che è stata tolta:
    // altrimenti il prossimo aggiornamento la rimetterebbe dentro.
    const rimosse = new Set(s.config.domandeRimosse || []);
    rimosse.add(domanda.id);
    s.config.domandeRimosse = [...rimosse];
    if (aperta === domanda.id) aperta = null;
    salva(); disegna();
    toast('Domanda eliminata.');
  }

  // ------------------------------------------------------------- la scheda

  function chips(elencoValori, leggi, scrivi, etichettaDi = (v) => v) {
    const pulsanti = new Map();
    const rinfresca = () => {
      const scelti = leggi() || [];
      for (const [v, pulsante] of pulsanti) pulsante.classList.toggle('scelto', scelti.includes(v));
    };
    const riga = el('div', { class: 'chips' }, elencoValori.map((v) => {
      const pulsante = el('button', {
        type: 'button',
        onclick: () => {
          const scelti = leggi() || [];
          scrivi(scelti.includes(v) ? scelti.filter((x) => x !== v) : [...scelti, v]);
          rinfresca();
        },
      }, etichettaDi(v));
      pulsanti.set(v, pulsante);
      return pulsante;
    }));
    rinfresca();
    return riga;
  }

  function sceltaIcona(opzione, domanda) {
    const griglia = el('div', { class: 'griglia-icone' });
    const pulsanti = new Map();
    for (const nome of NOMI_ICONE) {
      const pulsante = el('button', {
        type: 'button', class: opzione.icona === nome ? 'scelto' : '', title: nome,
        onclick: () => {
          opzione.icona = nome;
          for (const [n, b] of pulsanti) b.classList.toggle('scelto', n === nome);
          segna(domanda); salva();
        },
      }, [icona(nome)]);
      pulsanti.set(nome, pulsante);
      griglia.append(pulsante);
    }
    return el('label', { class: 'campo' }, ['Icona', griglia]);
  }

  function contributi(s, opzione, domanda) {
    opzione.accordi = opzione.accordi || {};
    const pulsanti = new Map();
    const disegnaChip = (chiave, pulsante) => {
      const livello = livelloDi(opzione.accordi[chiave]);
      svuota(pulsante).append(etichettaAccordo(chiave, s.config));
      if (livello.valore > 0) pulsante.append(el('span', { class: 'livello', testo: ` · ${livello.etichetta}` }));
      pulsante.classList.toggle('scelto', livello.valore > 0);
    };
    const riga = el('div', { class: 'chips' }, elencoAccordi(s.config).map((accordo) => {
      const chiave = typeof accordo === 'string' ? accordo : accordo.chiave;
      const pulsante = el('button', {
        type: 'button',
        onclick: () => {
          const prossimo = prossimoLivello(opzione.accordi[chiave]);
          if (prossimo > 0) opzione.accordi[chiave] = prossimo;
          else delete opzione.accordi[chiave];
          disegnaChip(chiave, pulsante);
          segna(domanda); salva();
        },
      });
      pulsanti.set(chiave, pulsante);
      disegnaChip(chiave, pulsante);
      return pulsante;
    }));
    return el('label', { class: 'campo' }, [
      el('span', {}, ['Verso cosa porta questa risposta ', el('span', { class: 'muted piccolo-testo', testo: '(tocca più volte: un tocco · abbastanza · tanto)' })]),
      riga,
    ]);
  }

  function schedaOpzione(s, domanda, opzione, i) {
    const opzioni = domanda.opzioni;
    return el('section', { class: 'card sotto' }, [
      el('div', { class: 'riga' }, [
        el('label', { class: 'campo' }, ['Risposta', el('input', {
          type: 'text', value: opzione.etichetta || '', placeholder: 'In riva al mare',
          oninput: (e) => {
            opzione.etichetta = e.target.value;
            if (!opzione.bloccaId) opzione.id = idDaTitolo(e.target.value, opzioni.filter((o) => o !== opzione).map((o) => o.id), `risposta_${i + 1}`);
            segna(domanda); salva();
          },
        })]),
        el('label', { class: 'campo' }, ['Riga piccola (facoltativa)', el('input', {
          type: 'text', value: opzione.sottotitolo || '', placeholder: 'Lo porterò io',
          oninput: (e) => { opzione.sottotitolo = e.target.value || undefined; segna(domanda); salva(); },
        })]),
        el('div', { class: 'azioni-riga', style: 'align-self:end' }, [
          el('button', {
            type: 'button', title: 'Sposta su', disabled: i === 0,
            onclick: () => { opzioni.splice(i - 1, 0, opzioni.splice(i, 1)[0]); segna(domanda); salva(); disegna(); },
          }, '↑'),
          el('button', {
            type: 'button', title: 'Sposta giù', disabled: i === opzioni.length - 1,
            onclick: () => { opzioni.splice(i + 1, 0, opzioni.splice(i, 1)[0]); segna(domanda); salva(); disegna(); },
          }, '↓'),
          el('button', {
            class: 'pericolo', type: 'button',
            onclick: () => { opzioni.splice(i, 1); segna(domanda); salva(); disegna(); },
          }, 'Togli'),
        ]),
      ]),
      sceltaIcona(opzione, domanda),
      contributi(s, opzione, domanda),
      el('div', { class: 'riga' }, [
        el('label', { class: 'campo' }, ['Carattere', chips(CARATTERE,
          () => opzione.carattere, (v) => { opzione.carattere = v.length ? v : undefined; segna(domanda); salva(); })]),
        el('label', { class: 'campo' }, ['Occasioni', chips(OCCASIONI,
          () => opzione.occasioni, (v) => { opzione.occasioni = v.length ? v : undefined; segna(domanda); salva(); })]),
      ]),
    ]);
  }

  function scheda(s, domanda) {
    const problemi = problemiDi(domanda);
    const rigaId = el('p', { class: 'muted piccolo-testo', testo: `id: ${domanda.id}` });
    const campo = (etichetta, chiave, segnaposto = '') => el('label', { class: 'campo' }, [etichetta, el('input', {
      type: 'text', value: domanda[chiave] || '', placeholder: segnaposto,
      oninput: (e) => {
        domanda[chiave] = e.target.value;
        // Finché l'id è quello provvisorio, segue il titolo: così nelle statistiche
        // si legge "che_musica_metti" invece di "domanda_3". Poi non si tocca più:
        // cambiarlo dopo vorrebbe dire perdere il filo delle risposte già contate.
        if (chiave === 'titolo' && PROVVISORIO.test(domanda.id)) {
          domanda.id = idDaTitolo(e.target.value, ids(s).filter((x) => x !== domanda.id), domanda.id);
          aperta = domanda.id;
          rigaId.textContent = `id: ${domanda.id}`;
        }
        segna(domanda); salva();
      },
    })]);

    const testa = el('section', { class: 'card' }, [
      el('div', { class: 'titolo-riga' }, [
        el('h2', { testo: domanda.titolo || 'Domanda nuova' }),
        el('div', { class: 'azioni-riga' }, [
          el('button', { type: 'button', onclick: () => { aperta = null; disegna(); } }, 'Chiudi'),
          el('button', { class: 'pericolo', type: 'button', onclick: () => elimina(s, domanda, diFabbrica(domanda)) }, 'Elimina'),
        ]),
      ]),
      rigaId,
      problemi.length
        ? el('p', { class: 'avviso', testo: `Da completare: ${problemi.join('; ')}.` })
        : el('p', { class: 'muted piccolo-testo', testo: 'La domanda è completa: compare nel percorso se è accesa.' }),
      el('div', { class: 'riga' }, [
        campo('Domanda', 'titolo', 'Dove vorresti essere adesso?'),
        campo('Riga piccola', 'sottotitolo', 'Scegli uno o due posti.'),
      ]),
      el('div', { class: 'riga' }, [
        el('label', { class: 'campo' }, ['Tipo', el('select', {
          onchange: (e) => {
            domanda.tipo = e.target.value;
            if (domanda.tipo === 'scala') {
              domanda.min = domanda.min || 1;
              domanda.max = domanda.max || 5;
              domanda.attributiScala = domanda.attributiScala || ['intensita'];
            }
            segna(domanda); salva(); disegna();
          },
        }, TIPI.map((t) => el('option', { value: t.valore, selected: domanda.tipo === t.valore }, t.etichetta)))]),
        el('label', { class: 'campo' }, ['Gruppo', el('select', {
          onchange: (e) => { domanda.gruppo = e.target.value || undefined; segna(domanda); salva(); disegna(); },
        }, GRUPPI.map((g) => el('option', { value: g.valore, selected: (domanda.gruppo || '') === g.valore }, g.etichetta)))]),
        el('label', { class: 'campo' }, ['Peso', el('input', {
          type: 'number', value: String(domanda.peso ?? 1), min: '0', max: '2', step: '0.05',
          onchange: (e) => { domanda.peso = Number(e.target.value); salva(); },
        })]),
        el('label', { class: 'campo' }, ['Attiva', el('input', {
          type: 'checkbox', checked: domanda.attiva !== false,
          onchange: (e) => { domanda.attiva = e.target.checked; salva(); },
        })]),
      ]),
      domanda.tipo === 'multipla' ? el('label', { class: 'campo' }, ['Quante risposte al massimo', el('input', {
        type: 'number', value: String(domanda.max || (domanda.opzioni || []).length), min: '1', max: '5', step: '1',
        style: 'max-width:8rem',
        onchange: (e) => { domanda.max = Number(e.target.value); segna(domanda); salva(); },
      })]) : null,
      domanda.tipo === 'scala' ? el('label', { class: 'campo' }, ['Cosa sposta il cursore', chips(ATTRIBUTI_SCALA,
        () => domanda.attributiScala, (v) => { domanda.attributiScala = v; segna(domanda); salva(); })]) : null,
    ]);

    if (domanda.tipo === 'scala') return [testa];

    domanda.opzioni = domanda.opzioni || [];
    const opzioni = domanda.opzioni.map((opzione, i) => schedaOpzione(s, domanda, opzione, i));
    const aggiungi = el('div', { class: 'azioni' }, [
      el('button', {
        class: 'primario', type: 'button',
        onclick: () => {
          domanda.opzioni.push({
            id: idDaTitolo('', domanda.opzioni.map((o) => o.id), `risposta_${domanda.opzioni.length + 1}`),
            etichetta: '', icona: 'aperto', accordi: {},
          });
          segna(domanda); salva(); disegna();
        },
      }, 'Aggiungi risposta'),
    ]);
    return [testa, ...opzioni, aggiungi];
  }

  return {
    /** Una o più card: la tabella, oppure la domanda aperta. */
    sezione(s) {
      const domanda = aperta ? elenco(s).find((d) => d.id === aperta) : null;
      if (!domanda) { aperta = null; return [tabella(s)]; }
      return scheda(s, domanda);
    },
    chiudi() { aperta = null; },
  };
}

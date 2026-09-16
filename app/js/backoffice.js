// Area del personale (docs/06-backoffice.md): catalogo, profili, taratura,
// statistiche, backup. Stessa impostazione visiva del gestionale.
// Nessun nome commerciale entra qui: dall'import teniamo solo codice, categoria, attivo.

import { $, $$, el, svuota, toast, scarica, oggi, dataItaliana } from './ui.js';
import { ripulisciCatalogo, categoriaDaCodice } from './dati.js';
import { store } from './store-locale.js';
import { SCENARI } from './scenari.js';
import {
  elencoAccordi, elencoFamiglie, elencoDomande, etichettaAccordo, ATTRIBUTI, STAGIONI, MOMENTI,
} from './motore.js';

const OCCASIONI = ['quotidiano', 'ufficio', 'serata', 'sport', 'speciale', 'romantico'];
const CARATTERE = ['energico', 'calmo', 'sensuale', 'elegante', 'audace', 'coccola', 'misterioso', 'allegro', 'romantico', 'sicuro', 'fresco'];
const GENERI = ['uomo', 'donna', 'unisex'];
const CONFIDENZE = ['alta', 'media', 'bassa'];
const BADGE_CONFIDENZA = { alta: 'ok', media: 'sotto', bassa: 'esaurito' };
const ETICHETTA_ATTRIBUTI = { intensita: 'Intensità', persistenza: 'Persistenza', dolcezza: 'Dolcezza', freschezza: 'Freschezza' };

export function creaBackoffice({ stato, predefiniti, salva, provaMotore, profiliInGioco, esci, sostituisciStato }) {
  let s = stato;
  let scheda = 'catalogo';
  let filtriCatalogo = { senzaProfilo: false, bassa: false, inattivi: false, cerca: '' };
  let cercaProfili = '';
  let codiceAperto = null;
  let risposteProva = { per_chi: 'me', genere: 'libero' };

  const profiloDi = (codice) => s.profili.find((p) => p.codice === codice) || null;
  const vociCatalogo = () => [...s.catalogo].sort((a, b) => a.codice.localeCompare(b.codice));

  function salvaEDisegna(messaggio) {
    salva();
    if (messaggio) toast(messaggio);
    disegna();
  }

  // =============================================================== catalogo

  function disegnaCatalogo(sezione) {
    const conProfilo = new Set(s.profili.map((p) => p.codice));
    const attivi = s.catalogo.filter((c) => c.attivo);
    const senzaProfilo = attivi.filter((c) => !conProfilo.has(c.codice));
    const bassa = s.profili.filter((p) => p.confidenza === 'bassa').length;

    sezione.append(
      el('div', { class: 'kpi' }, [
        riquadro(String(s.catalogo.length), 'Referenze'),
        riquadro(String(attivi.length), 'Attive', 'teal'),
        riquadro(String(senzaProfilo.length), 'Attive senza profilo', senzaProfilo.length ? 'bad' : ''),
        riquadro(String(bassa), 'Profili da rivedere', bassa ? 'warn' : ''),
      ]),
      cardImport(),
      cardTabellaCatalogo(conProfilo),
    );
  }

  function riquadro(valore, etichetta, tipo = '') {
    return el('div', { class: `card ${tipo}` }, [
      el('div', { class: 'v', testo: valore }),
      el('div', { class: 'l', testo: etichetta }),
    ]);
  }

  function cardImport() {
    const area = el('textarea', { placeholder: 'Incolla qui il JSON del catalogo esportato dal gestionale…', rows: 4 });
    const file = el('input', { type: 'file', accept: '.json,application/json' });
    const esito = el('div');

    const applica = (testo) => {
      try {
        const pulito = ripulisciCatalogo(JSON.parse(testo));
        const rapporto = importaCatalogo(pulito);
        svuota(esito).append(el('div', { class: 'card info' }, [
          el('h3', { testo: 'Import completato' }),
          el('p', { testo: `Nuove ${rapporto.nuove} · disattivate ${rapporto.disattivate} · riattivate ${rapporto.riattivate} · invariate ${rapporto.invariate}` }),
          rapporto.senzaProfilo.length
            ? el('p', { class: 'errore-testo', testo: `Attive senza profilo (${rapporto.senzaProfilo.length}): ${rapporto.senzaProfilo.join(', ')}` })
            : el('p', { class: 'muted', testo: 'Ogni referenza attiva ha il suo profilo.' }),
        ]));
        area.value = '';
        salvaEDisegna('Catalogo aggiornato.');
      } catch (errore) {
        svuota(esito).append(el('p', { class: 'errore-testo', testo: `Non riesco a leggere il file: ${errore.message}` }));
      }
    };

    file.addEventListener('change', async () => {
      const scelto = file.files && file.files[0];
      if (scelto) applica(await scelto.text());
    });

    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Import del catalogo' }),
      el('p', { class: 'muted' }, 'Dal gestionale teniamo solo codice, categoria e attivo. Nome, brand, fornitori e costi vengono scartati prima del salvataggio: qui dentro non esistono.'),
      el('label', { class: 'campo' }, ['File JSON', file]),
      el('label', { class: 'campo' }, ['Oppure incolla il testo', area]),
      el('div', { class: 'azioni' }, [
        el('button', { class: 'primario', type: 'button', onclick: () => area.value.trim() ? applica(area.value) : toast('Incolla prima il testo.') }, 'Importa dal testo'),
      ]),
      esito,
    ]);
  }

  function importaCatalogo(nuovo) {
    const vecchio = new Map(s.catalogo.map((c) => [c.codice, c]));
    const rapporto = { nuove: 0, disattivate: 0, riattivate: 0, invariate: 0, senzaProfilo: [] };
    const conProfilo = new Set(s.profili.map((p) => p.codice));
    for (const voce of nuovo) {
      const prima = vecchio.get(voce.codice);
      if (!prima) rapporto.nuove++;
      else if (prima.attivo && !voce.attivo) rapporto.disattivate++;
      else if (!prima.attivo && voce.attivo) rapporto.riattivate++;
      else rapporto.invariate++;
      if (voce.attivo && !conProfilo.has(voce.codice)) rapporto.senzaProfilo.push(voce.codice);
    }
    // Le referenze sparite dall'export restano in archivio, ma disattivate.
    for (const [codice, voce] of vecchio) {
      if (!nuovo.some((n) => n.codice === codice)) {
        nuovo.push({ ...voce, attivo: false });
        if (voce.attivo) rapporto.disattivate++;
      }
    }
    nuovo.sort((a, b) => a.codice.localeCompare(b.codice));
    s.catalogo = nuovo;
    return rapporto;
  }

  function cardTabellaCatalogo(conProfilo) {
    const cerca = el('input', {
      type: 'search', placeholder: 'Cerca un codice…', value: filtriCatalogo.cerca,
      oninput: (e) => { filtriCatalogo.cerca = e.target.value.trim(); aggiornaCorpoCatalogo(); },
    });
    const spunta = (chiave, etichetta) => el('label', { class: 'chk' }, [
      el('input', {
        type: 'checkbox', checked: filtriCatalogo[chiave],
        onchange: (e) => { filtriCatalogo[chiave] = e.target.checked; aggiornaCorpoCatalogo(); },
      }), etichetta,
    ]);

    const corpo = el('tbody');
    const card = el('section', { class: 'card' }, [
      el('h2', { testo: 'Referenze' }),
      el('div', { class: 'cerca' }, [cerca, spunta('senzaProfilo', 'Senza profilo'), spunta('bassa', 'Confidenza bassa'), spunta('inattivi', 'Mostra inattive')]),
      el('div', { class: 'tabella-wrap' }, [
        el('table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { testo: 'Codice' }), el('th', { testo: 'Categoria' }), el('th', { testo: 'Stato' }),
            el('th', { testo: 'Profilo' }), el('th', { testo: 'Confidenza' }), el('th', { testo: 'Rivisto' }), el('th', {}),
          ])]),
          corpo,
        ]),
      ]),
    ]);

    function aggiornaCorpoCatalogo() {
      svuota(corpo);
      let categoria = null;
      let mostrate = 0;
      for (const voce of vociCatalogo()) {
        const profilo = profiloDi(voce.codice);
        if (!filtriCatalogo.inattivi && !voce.attivo) continue;
        if (filtriCatalogo.senzaProfilo && profilo) continue;
        if (filtriCatalogo.bassa && (!profilo || profilo.confidenza !== 'bassa')) continue;
        if (filtriCatalogo.cerca && !voce.codice.includes(filtriCatalogo.cerca)) continue;
        if (voce.categoria !== categoria) {
          categoria = voce.categoria;
          corpo.append(el('tr', { class: 'cat' }, [el('td', { colspan: 7, testo: categoria })]));
        }
        const manca = voce.attivo && !profilo;
        corpo.append(el('tr', { class: manca ? 'manca' : '' }, [
          el('td', { class: 'cod', testo: voce.codice }),
          el('td', { testo: voce.categoria }),
          el('td', {}, [el('span', { class: `badge ${voce.attivo ? 'ok' : 'grigio'}`, testo: voce.attivo ? 'attiva' : 'inattiva' })]),
          el('td', { testo: profilo ? 'sì' : 'no' }),
          el('td', {}, [profilo ? el('span', { class: `badge ${BADGE_CONFIDENZA[profilo.confidenza] || 'grigio'}`, testo: profilo.confidenza }) : '—']),
          el('td', { testo: profilo && profilo.rivisto ? dataItaliana(profilo.rivisto) : '—' }),
          el('td', {}, [
            el('button', {
              class: 'piccolo', type: 'button',
              onclick: () => { voce.attivo = !voce.attivo; salvaEDisegna(`${voce.codice} ${voce.attivo ? 'attivata' : 'disattivata'}.`); },
            }, voce.attivo ? 'Disattiva' : 'Attiva'),
            ' ',
            el('button', {
              class: 'piccolo', type: 'button',
              onclick: () => { codiceAperto = voce.codice; vaiA('profili'); },
            }, profilo ? 'Profilo' : 'Crea profilo'),
          ]),
        ]));
        mostrate++;
      }
      if (!mostrate) corpo.append(el('tr', {}, [el('td', { colspan: 7, class: 'vuoto', testo: 'Nessuna referenza con questi filtri.' })]));
    }

    aggiornaCorpoCatalogo();
    return card;
  }

  // ================================================================ profili

  function disegnaProfili(sezione) {
    if (codiceAperto) { sezione.append(schedaProfilo(codiceAperto)); return; }

    const ordinati = [...s.profili].sort((a, b) => {
      const pa = CONFIDENZE.indexOf(a.confidenza), pb = CONFIDENZE.indexOf(b.confidenza);
      if (pa !== pb) return pb - pa; // prima le bozze da verificare
      return a.codice.localeCompare(b.codice);
    });
    const attiviSenzaProfilo = s.catalogo
      .filter((c) => c.attivo && !s.profili.some((p) => p.codice === c.codice))
      .map((c) => c.codice);

    const corpo = el('tbody');
    const cerca = el('input', {
      type: 'search', placeholder: 'Cerca un codice…', value: cercaProfili,
      oninput: (e) => { cercaProfili = e.target.value.trim(); riempi(); },
    });

    function riempi() {
      svuota(corpo);
      const elenco = ordinati.filter((p) => !cercaProfili || p.codice.includes(cercaProfili));
      for (const profilo of elenco.slice(0, 400)) {
        const voce = s.catalogo.find((c) => c.codice === profilo.codice);
        corpo.append(el('tr', {}, [
          el('td', { class: 'cod', testo: profilo.codice }),
          el('td', {}, [el('span', { class: `badge ${BADGE_CONFIDENZA[profilo.confidenza] || 'grigio'}`, testo: profilo.confidenza })]),
          el('td', { testo: profilo.famiglia }),
          el('td', { class: 'muted', testo: profilo.sottofamiglia }),
          el('td', { testo: profilo.genere }),
          el('td', { testo: voce && !voce.attivo ? 'inattiva' : '' }),
          el('td', {}, [el('button', { class: 'piccolo', type: 'button', onclick: () => { codiceAperto = profilo.codice; disegna(); } }, 'Apri')]),
        ]));
      }
      if (elenco.length > 400) corpo.append(el('tr', {}, [el('td', { colspan: 7, class: 'muted piccolo-testo', testo: `…e altri ${elenco.length - 400}. Usa la ricerca.` })]));
      if (!elenco.length) corpo.append(el('tr', {}, [el('td', { colspan: 7, class: 'vuoto', testo: 'Nessun profilo.' })]));
    }
    riempi();

    if (attiviSenzaProfilo.length) {
      sezione.append(el('section', { class: 'card avviso' }, [
        el('h3', { testo: `${attiviSenzaProfilo.length} referenze attive senza profilo` }),
        el('p', { testo: 'Finché non hanno un profilo non entrano nel percorso del cliente.' }),
        el('div', { class: 'chips' }, attiviSenzaProfilo.slice(0, 40).map((codice) => el('button', {
          type: 'button', onclick: () => { creaProfiloVuoto(codice); codiceAperto = codice; disegna(); },
        }, codice))),
      ]));
    }

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Profili olfattivi' }),
      el('p', { class: 'muted' }, 'In cima le bozze a confidenza bassa: sono quelle da rivedere per prime.'),
      el('div', { class: 'cerca' }, [cerca]),
      el('div', { class: 'tabella-wrap' }, [
        el('table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { testo: 'Codice' }), el('th', { testo: 'Confidenza' }), el('th', { testo: 'Famiglia' }),
            el('th', { testo: 'Sottofamiglia' }), el('th', { testo: 'Genere' }), el('th', { testo: 'Catalogo' }), el('th', {}),
          ])]),
          corpo,
        ]),
      ]),
    ]));
  }

  function creaProfiloVuoto(codice) {
    if (profiloDi(codice)) return;
    s.profili.push({
      codice, genere: 'unisex', famiglia: 'legnoso', sottofamiglia: 'da definire',
      testa: ['—'], cuore: ['—'], fondo: ['—'], accordi: { legnoso: 0.5 },
      intensita: 3, persistenza: 3, dolcezza: 3, freschezza: 3,
      stagioni: { primavera: 0.5, estate: 0.5, autunno: 0.5, inverno: 0.5 },
      momento: { giorno: 0.5, sera: 0.5 },
      occasioni: ['quotidiano'], carattere: ['calmo'],
      descrizione: 'Scheda da compilare.', confidenza: 'bassa',
    });
    salva();
  }

  function schedaProfilo(codice) {
    const profilo = profiloDi(codice);
    if (!profilo) return el('div', { class: 'vuoto', testo: 'Profilo non trovato.' });
    const aggiorna = (campo, valore) => { profilo[campo] = valore; salva(); };

    const sezione = el('div');
    const voce = s.catalogo.find((c) => c.codice === codice);

    // ---- testata
    sezione.append(el('section', { class: 'card' }, [
      el('div', { class: 'riga' }, [
        el('div', { class: 'stretto' }, [
          el('div', { class: 'v', style: 'font-size:2.4rem;font-weight:700;color:var(--teal-scuro)', testo: codice }),
          el('div', { class: 'l muted piccolo-testo', testo: `${voce ? voce.categoria : categoriaDaCodice(codice)}${voce && !voce.attivo ? ' · inattiva' : ''}` }),
        ]),
        el('div', { class: 'azioni stretto' }, [
          el('button', { type: 'button', onclick: () => { codiceAperto = null; disegna(); } }, 'Torna all\'elenco'),
          el('button', {
            class: 'primario', type: 'button',
            onclick: () => { profilo.confidenza = 'alta'; profilo.rivisto = oggi(); salvaEDisegna(`${codice} confermato.`); },
          }, 'Confermato'),
        ]),
      ]),
      profilo.rivisto ? el('p', { class: 'piccolo-testo muted', testo: `Ultima revisione: ${dataItaliana(profilo.rivisto)}` }) : null,
    ]));

    // ---- identità
    const menu = (valori, corrente, onCambio) => el('select', { onchange: (e) => onCambio(e.target.value) },
      valori.map((v) => el('option', { value: v, selected: v === corrente }, v)));

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Identità' }),
      el('div', { class: 'riga' }, [
        el('label', { class: 'campo' }, ['Genere', menu(GENERI, profilo.genere, (v) => aggiorna('genere', v))]),
        el('label', { class: 'campo' }, ['Famiglia', menu(elencoFamiglie(s.config).map((f) => f.chiave), profilo.famiglia, (v) => aggiorna('famiglia', v))]),
        el('label', { class: 'campo' }, ['Confidenza', menu(CONFIDENZE, profilo.confidenza, (v) => aggiorna('confidenza', v))]),
      ]),
      el('label', { class: 'campo' }, ['Sottofamiglia',
        el('input', { type: 'text', value: profilo.sottofamiglia || '', oninput: (e) => aggiorna('sottofamiglia', e.target.value) })]),
      el('div', { class: 'riga' }, ['testa', 'cuore', 'fondo'].map((livello) => el('label', { class: 'campo' }, [
        `Note di ${livello}`,
        el('input', {
          type: 'text', value: (profilo[livello] || []).join(', '),
          oninput: (e) => aggiorna(livello, e.target.value.split(',').map((x) => x.trim()).filter(Boolean)),
        }),
      ]))),
    ]));

    // ---- accordi
    const accordi = elencoAccordi(s.config);
    const ordinati = [...accordi].sort((a, b) => (profilo.accordi[b.chiave] || 0) - (profilo.accordi[a.chiave] || 0) || a.chiave.localeCompare(b.chiave));
    const cursori = el('div', { class: 'cursori' });
    for (const accordo of ordinati) {
      const valore = profilo.accordi[accordo.chiave] || 0;
      const mostra = el('span', { class: 'val', testo: valore.toFixed(1) });
      const riga = el('label', { class: `cursore${valore ? '' : ' spento'}` }, [
        el('span', { class: 'nome', testo: accordo.etichetta, title: accordo.semplice }),
        mostra,
        el('input', {
          type: 'range', min: '0', max: '1', step: '0.1', value: String(valore),
          oninput: (e) => {
            const v = Number(e.target.value);
            mostra.textContent = v.toFixed(1);
            riga.classList.toggle('spento', !v);
            if (v === 0) delete profilo.accordi[accordo.chiave]; else profilo.accordi[accordo.chiave] = v;
            salva();
          },
        }),
      ]);
      cursori.append(riga);
    }
    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Accordi' }),
      el('p', { class: 'muted piccolo-testo' }, 'È il vettore che il motore confronta con le risposte. In genere da tre a sei accordi, con uno dominante fra 0,8 e 1.'),
      cursori,
    ]));

    // ---- attributi, stagioni, momento
    const tacche = (campo) => {
      const riga = el('div', { class: 'chips' });
      const pulsanti = [];
      for (let v = 1; v <= 5; v++) {
        const pulsante = el('button', {
          type: 'button', class: profilo[campo] === v ? 'scelto' : '',
          onclick: () => {
            profilo[campo] = v;
            salva();
            pulsanti.forEach((b, i) => b.classList.toggle('scelto', i + 1 === v));
          },
        }, String(v));
        pulsanti.push(pulsante);
        riga.append(pulsante);
      }
      return el('label', { class: 'campo' }, [ETICHETTA_ATTRIBUTI[campo] || campo, riga]);
    };
    const cursore01 = (oggetto, chiave, etichetta) => {
      const valore = (oggetto[chiave] === undefined ? 0 : oggetto[chiave]);
      const mostra = el('span', { class: 'val', testo: Number(valore).toFixed(1) });
      return el('label', { class: 'cursore' }, [
        el('span', { class: 'nome', testo: etichetta }), mostra,
        el('input', {
          type: 'range', min: '0', max: '1', step: '0.1', value: String(valore),
          oninput: (e) => { const v = Number(e.target.value); mostra.textContent = v.toFixed(1); oggetto[chiave] = v; salva(); },
        }),
      ]);
    };
    profilo.stagioni = profilo.stagioni || {};
    profilo.momento = profilo.momento || {};

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Come si porta' }),
      el('div', { class: 'riga' }, ATTRIBUTI.map(tacche)),
      el('h3', { testo: 'Stagioni' }),
      el('div', { class: 'cursori' }, STAGIONI.map((st) => cursore01(profilo.stagioni, st, st))),
      el('h3', { testo: 'Momento' }),
      el('div', { class: 'cursori' }, MOMENTI.map((m) => cursore01(profilo.momento, m, m))),
    ]));

    // ---- occasioni, carattere, descrizione
    const chipSet = (elenco, campo) => {
      const pulsanti = new Map();
      const rinfresca = () => {
        const scelti = profilo[campo] || [];
        for (const [v, pulsante] of pulsanti) pulsante.classList.toggle('scelto', scelti.includes(v));
      };
      const riga = el('div', { class: 'chips' }, elenco.map((v) => {
        const pulsante = el('button', {
          type: 'button',
          onclick: () => {
            const scelti = profilo[campo] || [];
            aggiorna(campo, scelti.includes(v) ? scelti.filter((x) => x !== v) : [...scelti, v]);
            rinfresca();
          },
        }, v);
        pulsanti.set(v, pulsante);
        return pulsante;
      }));
      rinfresca();
      return riga;
    };

    const contatore = el('span', { class: 'piccolo-testo muted' });
    const testoDescrizione = el('textarea', {
      value: profilo.descrizione || '', maxlength: '140',
      oninput: (e) => { aggiorna('descrizione', e.target.value); contatore.textContent = `${e.target.value.length}/140`; },
    });
    contatore.textContent = `${(profilo.descrizione || '').length}/140`;

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Parole' }),
      el('label', { class: 'campo' }, ['Occasioni', chipSet(OCCASIONI, 'occasioni')]),
      el('label', { class: 'campo' }, ['Carattere', chipSet(CARATTERE, 'carattere')]),
      el('label', { class: 'campo' }, ['Descrizione mostrata al cliente', testoDescrizione, contatore]),
      el('label', { class: 'campo' }, ['Note interne (mai mostrate al cliente)',
        el('textarea', { value: profilo.noteStaff || '', oninput: (e) => aggiorna('noteStaff', e.target.value) })]),
    ]));

    // ---- anteprima e duplica
    sezione.append(cardAnteprima(codice), cardDuplica(profilo));
    return sezione;
  }

  function cardAnteprima(codice) {
    const dove = [];
    for (const scenario of SCENARI) {
      const esito = provaMotore(scenario.risposte);
      const posizione = esito.proposte.findIndex((p) => p.codice === codice);
      if (posizione >= 0) dove.push({ titolo: scenario.titolo, posizione: posizione + 1, punteggio: esito.proposte[posizione].punteggio });
      else if (esito.riserva && esito.riserva.codice === codice) dove.push({ titolo: scenario.titolo, posizione: 4, punteggio: esito.riserva.punteggio });
    }
    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Con che risposte esce questo profumo?' }),
      dove.length
        ? el('ul', { class: 'pulita' }, dove.map((d) => el('li', { testo: `${d.titolo} — ${d.posizione === 4 ? 'riserva' : `${d.posizione}º`} (${d.punteggio.toFixed(2)})` })))
        : el('p', { class: 'muted' }, 'In nessuno degli scenari tipici. Non è un errore di per sé — il catalogo è grande — ma se ti aspettavi il contrario, controlla accordi e genere.'),
    ]);
  }

  function cardDuplica(profilo) {
    const campo = el('input', { type: 'text', placeholder: 'Codice da cui copiare', inputmode: 'numeric', maxlength: '3' });
    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Duplica da un altro codice' }),
      el('p', { class: 'muted piccolo-testo' }, 'Per le varianti (intense, elixir, eau fraîche): copia tutto tranne il codice, poi correggi.'),
      el('div', { class: 'riga' }, [
        campo,
        el('button', {
          class: 'stretto', type: 'button',
          onclick: () => {
            const sorgente = profiloDi(campo.value.trim().padStart(3, '0'));
            if (!sorgente) { toast('Codice non trovato.'); return; }
            Object.assign(profilo, structuredClone(sorgente), { codice: profilo.codice, confidenza: 'bassa', rivisto: undefined });
            salvaEDisegna(`Copiato da ${sorgente.codice}.`);
          },
        }, 'Copia'),
      ]),
    ]);
  }

  // =============================================================== taratura

  function disegnaTaratura(sezione) {
    const pesi = s.config.pesi;
    const numerico = (chiave, etichetta, min, max, passo = 0.01) => el('label', { class: 'campo' }, [
      etichetta,
      el('input', {
        type: 'number', value: String(pesi[chiave]), min: String(min), max: String(max), step: String(passo),
        onchange: (e) => { pesi[chiave] = Number(e.target.value); salva(); },
      }),
    ]);

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Coefficienti del punteggio' }),
      el('p', { class: 'muted piccolo-testo' }, 'Somiglianza degli accordi, vicinanza degli attributi, contesto, carattere; poi la forza dei veti e la penalità delle bozze incerte.'),
      el('div', { class: 'riga' }, [
        numerico('coseno', 'Accordi', 0, 1), numerico('attributi', 'Attributi', 0, 1),
        numerico('contesto', 'Contesto', 0, 1), numerico('carattere', 'Carattere', 0, 1),
      ]),
      el('div', { class: 'riga' }, [
        numerico('esclusione', 'Forza dei veti', 0, 3), numerico('confidenzaBassa', 'Penalità confidenza bassa', 0, 0.5),
        numerico('sogliaMinima', 'Soglia minima', -1, 1), numerico('esclusioneFuori', 'Veto che esclude', 0, 1, 0.05),
      ]),
      el('div', { class: 'riga' }, [
        numerico('maxPerSottofamiglia', 'Max per sottofamiglia', 1, 3, 1),
        numerico('maxPerFamiglia', 'Max per famiglia', 1, 3, 1),
        numerico('proposte', 'Quante proposte', 1, 5, 1),
      ]),
    ]));

    // pesi delle domande e domande gioco
    const righe = el('tbody');
    for (const domanda of elencoDomande(s.config)) {
      righe.append(el('tr', {}, [
        el('td', { testo: domanda.id }),
        el('td', { class: 'muted', testo: domanda.titolo }),
        el('td', { testo: domanda.gruppo || '' }),
        el('td', { class: 'num' }, [el('input', {
          type: 'number', value: String(domanda.peso ?? 1), min: '0', max: '2', step: '0.05',
          style: 'max-width:7rem', onchange: (e) => { domanda.peso = Number(e.target.value); salva(); },
        })]),
        el('td', {}, [el('input', {
          type: 'checkbox', checked: domanda.attiva !== false,
          onchange: (e) => { domanda.attiva = e.target.checked; salva(); },
        })]),
      ]));
    }
    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Domande' }),
      el('p', { class: 'muted piccolo-testo' }, 'Il peso moltiplica i contributi della domanda. Le domande “gioco” ruotano: a ogni percorso ne compare una.'),
      el('div', { class: 'tabella-wrap' }, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [el('th', { testo: 'Id' }), el('th', { testo: 'Domanda' }), el('th', { testo: 'Gruppo' }), el('th', { class: 'num', testo: 'Peso' }), el('th', { testo: 'Attiva' })])]),
        righe,
      ])]),
    ]));

    sezione.append(cardProvaRapida());

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Valori di fabbrica' }),
      el('p', { class: 'muted' }, 'Rimette pesi, domande, frasi e testi come sono nei file di configurazione. Catalogo, profili e statistiche non si toccano.'),
      el('div', { class: 'azioni' }, [
        el('button', {
          class: 'pericolo', type: 'button',
          onclick: () => {
            if (!confirm('Ripristinare pesi, domande, frasi e testi consigliati?')) return;
            store.creaPuntoRipristino(s, 'prima del ripristino configurazione');
            s.config = structuredClone(predefiniti.config);
            salvaEDisegna('Configurazione riportata ai valori consigliati.');
          },
        }, 'Ripristina i valori consigliati'),
      ]),
    ]));
  }

  function cardProvaRapida() {
    const esitoNodo = el('div');

    function ricalcola() {
      const esito = provaMotore(risposteProva);
      svuota(esitoNodo).append(
        el('p', { class: 'muted piccolo-testo', testo: `${esito.candidati} candidati dopo i filtri${esito.allargato ? ' · cercato più in largo' : ''}` }),
        el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('thead', {}, [el('tr', {}, [el('th', { testo: 'Codice' }), el('th', { testo: 'Famiglia' }), el('th', { class: 'num', testo: 'Punteggio' }), el('th', { testo: 'Accordi in comune' })])]),
          el('tbody', {}, [
            ...esito.proposte.map((p) => el('tr', {}, [
              el('td', { class: 'cod', testo: p.codice }),
              el('td', { testo: `${p.famiglia} · ${p.sottofamiglia}` }),
              el('td', { class: 'num', testo: p.punteggio.toFixed(3) }),
              el('td', { class: 'muted', testo: (p.accordiComuni || []).map((a) => a.etichetta).join(', ') }),
            ])),
            esito.riserva ? el('tr', {}, [
              el('td', { class: 'cod', testo: esito.riserva.codice }),
              el('td', { testo: `riserva · ${esito.riserva.sottofamiglia}` }),
              el('td', { class: 'num', testo: esito.riserva.punteggio.toFixed(3) }),
              el('td', { class: 'muted', testo: (esito.riserva.accordiComuni || []).map((a) => a.etichetta).join(', ') }),
            ]) : null,
          ]),
        ])]),
      );
    }

    const comandi = el('div');
    for (const domanda of elencoDomande(s.config)) {
      if (domanda.attiva === false) continue;
      let comando;
      if (domanda.tipo === 'scala') {
        comando = el('input', {
          type: 'number', min: String(domanda.min || 1), max: String(domanda.max || 5), step: '1',
          value: risposteProva[domanda.id] ? String(risposteProva[domanda.id]) : '',
          onchange: (e) => { risposteProva[domanda.id] = e.target.value ? Number(e.target.value) : undefined; ricalcola(); },
        });
      } else {
        const multipla = domanda.tipo === 'multipla' || domanda.tipo === 'esclusioni';
        const pulsanti = new Map();
        const rinfresca = () => {
          const scelte = [].concat(risposteProva[domanda.id] || []);
          for (const [id, pulsante] of pulsanti) pulsante.classList.toggle('scelto', scelte.includes(id));
        };
        comando = el('div', { class: 'chips' }, (domanda.opzioni || []).map((o) => {
          const pulsante = el('button', {
            type: 'button',
            onclick: () => {
              const dentro = [].concat(risposteProva[domanda.id] || []);
              if (multipla) {
                risposteProva[domanda.id] = dentro.includes(o.id) ? dentro.filter((x) => x !== o.id) : [...dentro, o.id];
              } else {
                risposteProva[domanda.id] = dentro[0] === o.id ? undefined : o.id;
              }
              rinfresca();
              ricalcola();
            },
          }, o.etichetta);
          pulsanti.set(o.id, pulsante);
          return pulsante;
        }));
        rinfresca();
      }
      comandi.append(el('label', { class: 'campo', style: 'margin-bottom:14px' }, [domanda.titolo, comando]));
    }

    ricalcola();
    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Prova rapida' }),
      el('p', { class: 'muted piccolo-testo' }, 'Tutte le domande in una schermata: i risultati si aggiornano mentre scegli. È il modo più veloce per capire se una taratura funziona.'),
      comandi,
      el('div', { class: 'azioni' }, [
        el('button', { type: 'button', onclick: () => { risposteProva = { per_chi: 'me', genere: 'libero' }; disegna(); } }, 'Azzera le risposte'),
      ]),
      esitoNodo,
    ]);
  }

  // ============================================================ statistiche

  function disegnaStatistiche(sezione) {
    const dati = riepilogoStatistiche();
    const maiProposti = s.catalogo
      .filter((c) => c.attivo && !(s.statistiche.codici || {})[c.codice])
      .map((c) => c.codice);

    sezione.append(el('div', { class: 'kpi' }, [
      riquadro(String(dati.iniziati), 'Percorsi iniziati'),
      riquadro(String(dati.completati), 'Completati', 'teal'),
      riquadro(dati.mediano ? `${dati.mediano}s` : '—', 'Tempo mediano'),
      riquadro(dati.abbandoni.length ? dati.abbandoni[0][0] : '—', 'Si abbandona su', dati.abbandoni.length ? 'warn' : ''),
    ]));

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Codici proposti più spesso' }),
      dati.codici.length
        ? el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('thead', {}, [el('tr', {}, [el('th', { testo: 'Codice' }), el('th', { class: 'num', testo: 'Volte' })])]),
          el('tbody', {}, dati.codici.slice(0, 40).map(([codice, n]) => el('tr', {}, [
            el('td', { class: 'cod', testo: codice }), el('td', { class: 'num', testo: String(n) }),
          ]))),
        ])])
        : el('p', { class: 'vuoto', testo: 'Ancora nessun percorso completato.' }),
    ]));

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Mai proposti' }),
      el('p', { class: 'muted piccolo-testo' }, 'Referenze attive che non sono mai finite in una rosa: o il profilo è tarato male, o il catalogo ha un buco su quel gusto.'),
      el('p', { class: 'mono', testo: maiProposti.length ? maiProposti.join(' · ') : 'Nessuna: tutte sono state proposte almeno una volta.' }),
    ]));

    const perDomanda = el('div');
    for (const [idDomanda, conteggi] of Object.entries(s.statistiche.opzioni || {})) {
      const domanda = elencoDomande(s.config).find((d) => d.id === idDomanda);
      const voci = Object.entries(conteggi).sort((a, b) => b[1] - a[1]);
      perDomanda.append(el('div', {}, [
        el('h3', { testo: domanda ? domanda.titolo : idDomanda }),
        el('ul', { class: 'pulita' }, voci.map(([id, n]) => {
          const opzione = domanda && (domanda.opzioni || []).find((o) => o.id === id);
          return el('li', { testo: `${opzione ? opzione.etichetta : id} — ${n}` });
        })),
      ]));
    }
    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Risposte date' }),
      Object.keys(s.statistiche.opzioni || {}).length ? perDomanda : el('p', { class: 'vuoto', testo: 'Ancora niente.' }),
    ]));

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Per giorno' }),
      el('div', { class: 'tabella-wrap' }, [el('table', {}, [
        el('thead', {}, [el('tr', {}, [el('th', { testo: 'Giorno' }), el('th', { class: 'num', testo: 'Iniziati' }), el('th', { class: 'num', testo: 'Completati' })])]),
        el('tbody', {}, dati.giorni.map(([giorno, g]) => el('tr', {}, [
          el('td', { testo: dataItaliana(giorno) }),
          el('td', { class: 'num', testo: String(g.iniziati || 0) }),
          el('td', { class: 'num', testo: String(g.completati || 0) }),
        ]))),
      ])]),
      el('p', { class: 'muted piccolo-testo' }, 'Nessun dato personale: solo conteggi per giorno.'),
    ]));
  }

  function riepilogoStatistiche() {
    const giorni = Object.entries(s.statistiche.giorni || {}).sort((a, b) => b[0].localeCompare(a[0]));
    let iniziati = 0, completati = 0;
    const tempi = [];
    for (const [, g] of giorni) {
      iniziati += g.iniziati || 0;
      completati += g.completati || 0;
      for (const t of g.secondi || []) tempi.push(t);
    }
    tempi.sort((a, b) => a - b);
    return {
      giorni, iniziati, completati,
      mediano: tempi.length ? tempi[Math.floor(tempi.length / 2)] : null,
      codici: Object.entries(s.statistiche.codici || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      abbandoni: Object.entries(s.statistiche.abbandoni || {}).sort((a, b) => b[1] - a[1]),
    };
  }

  // ================================================================= backup

  function disegnaBackup(sezione) {
    const file = el('input', { type: 'file', accept: '.json,application/json' });
    file.addEventListener('change', async () => {
      const scelto = file.files && file.files[0];
      if (!scelto) return;
      try {
        const nuovo = store.importa(await scelto.text());
        if (!confirm(`Sostituire i dati di questo dispositivo con il file?\n${nuovo.catalogo.length} referenze, ${nuovo.profili.length} profili.`)) return;
        store.creaPuntoRipristino(s, 'prima di un import');
        sostituisciStato(nuovo);
        toast('Dati importati.');
        disegna();
      } catch (errore) {
        toast(`Import non riuscito: ${errore.message}`);
      }
    });

    const punti = store.puntiRipristino();

    sezione.append(
      el('section', { class: 'card' }, [
        el('h2', { testo: 'Esporta' }),
        el('p', { class: 'muted' }, 'Catalogo, profili, configurazione e statistiche in un file solo. Da tenere da parte prima di una revisione importante.'),
        el('div', { class: 'azioni' }, [
          el('button', {
            class: 'primario', type: 'button',
            onclick: () => scarica(`consulente-${oggi()}.json`, store.esporta(s)),
          }, 'Scarica il backup'),
          el('button', {
            type: 'button',
            onclick: () => { store.creaPuntoRipristino(s, 'manuale'); toast('Punto di ripristino creato.'); disegna(); },
          }, 'Crea punto di ripristino'),
        ]),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { testo: 'Importa' }),
        el('p', { class: 'muted' }, 'Sostituisce tutto quello che c\'è su questo dispositivo. Prima viene creato un punto di ripristino.'),
        el('label', { class: 'campo' }, ['File di backup', file]),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { testo: 'Punti di ripristino' }),
        punti.length
          ? el('ul', { class: 'pulita' }, punti.map((p) => el('li', {}, [
            `${dataItaliana(p.quando)} ${String(p.quando).slice(11, 16)} — ${p.motivo} `,
            el('button', {
              class: 'piccolo', type: 'button',
              onclick: () => {
                if (!confirm('Tornare a questo punto? I dati attuali vengono sostituiti.')) return;
                store.creaPuntoRipristino(s, 'prima di un ripristino');
                sostituisciStato(store.ripristina(p.id));
                toast('Ripristinato.');
                disegna();
              },
            }, 'Ripristina'),
          ])))
          : el('p', { class: 'vuoto', testo: 'Ancora nessun punto di ripristino.' }),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { testo: 'Codice del banco' }),
        el('div', { class: 'azioni' }, [
          el('button', {
            class: 'pericolo', type: 'button',
            onclick: () => {
              if (!confirm('Dimenticare il codice? Al prossimo accesso ne verrà chiesto uno nuovo.')) return;
              s.pin = null;
              salvaEDisegna('Codice azzerato.');
            },
          }, 'Cambia il codice'),
        ]),
      ]),
    );
  }

  // ================================================================ telaio

  function vaiA(nome) {
    scheda = nome;
    disegna();
  }

  function disegna() {
    for (const pulsante of $$('#bo-tabs button')) {
      pulsante.classList.toggle('attivo', pulsante.dataset.tab === scheda);
    }
    for (const nome of ['catalogo', 'profili', 'taratura', 'statistiche', 'backup']) {
      const sezione = $(`#tab-${nome}`);
      sezione.classList.toggle('attivo', nome === scheda);
      if (nome !== scheda) { svuota(sezione); continue; }
      svuota(sezione);
      ({ catalogo: disegnaCatalogo, profili: disegnaProfili, taratura: disegnaTaratura, statistiche: disegnaStatistiche, backup: disegnaBackup })[nome](sezione);
    }
    const attivi = profiliInGioco().length;
    $('#bo-stato').textContent = `${attivi} fragranze nel percorso`;
  }

  for (const pulsante of $$('#bo-tabs button')) {
    pulsante.addEventListener('click', () => {
      if (pulsante.dataset.tab === 'profili' && scheda === 'profili') codiceAperto = null;
      vaiA(pulsante.dataset.tab);
    });
  }
  $('#bo-esci').addEventListener('click', () => { store.salvaSubito(s); esci(); });

  return {
    disegna,
    aggiornaStato(nuovo) { s = nuovo; },
  };
}

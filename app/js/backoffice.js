// Area del personale (docs/06-backoffice.md): catalogo, profili, taratura,
// statistiche, backup. Stessa impostazione visiva del gestionale.
// Nessun nome commerciale entra qui: dall'import teniamo solo codice, categoria, attivo.

import { $, $$, el, svuota, toast, scarica, oggi, dataItaliana, chiediConferma } from './ui.js';
import { leggiCatalogo, categoriaDaCodice, ripristinaConfig, domandeProprie, aggiornaConfig } from './dati.js';
import { store } from './store-locale.js';
import { SCENARI, RICERCHE, FRASI, controllaAttese } from './scenari.js';
import { preparaLessico, interpreta, haSostanza } from './interpreta.js';
import { consiglia, pesiConsulente } from './consulente.js';
import { indiceNote, cerca, impostazioni } from './ricerca.js';
import { riepilogo, nuoveStatistiche } from './statistiche.js';
import { creaEditorDomande } from './editor-domande.js';
import {
  elencoAccordi, elencoFamiglie, elencoDomande, ATTRIBUTI, STAGIONI, MOMENTI,
} from './motore.js';

const OCCASIONI = ['quotidiano', 'ufficio', 'serata', 'sport', 'speciale', 'romantico'];
const CARATTERE = ['energico', 'calmo', 'sensuale', 'elegante', 'audace', 'coccola', 'misterioso', 'allegro', 'romantico', 'sicuro', 'fresco'];
const GENERI = ['uomo', 'donna', 'unisex'];
const CONFIDENZE = ['alta', 'media', 'bassa'];
const BADGE_CONFIDENZA = { alta: 'ok', media: 'sotto', bassa: 'esaurito' };
const ETICHETTA_ATTRIBUTI = { intensita: 'Intensità', persistenza: 'Persistenza', dolcezza: 'Dolcezza', freschezza: 'Freschezza' };

export function creaBackoffice({ stato, predefiniti, salva, provaMotore, profiliInGioco, esci, sostituisciStato, lessico }) {
  let s = stato;
  let scheda = 'catalogo';
  let filtriCatalogo = { senzaProfilo: false, bassa: false, inattivi: false, cerca: '' };
  let cercaProfili = '';
  let codiceAperto = null;
  let risposteProva = { per_chi: 'me', genere: 'libero' };
  let criteriProva = { accordi: [], note: [], escludi: [], escludiNote: [] };
  let esitoImport = null; // sopravvive al ridisegno della scheda dopo il salvataggio
  let fraseProva = "fresco, come un bosco d'inverno";
  let esitoFrasi = null;   // la passata sulle frasi tipiche, finché non si rifà

  const editorDomande = creaEditorDomande({
    salva,
    disegna: () => disegna(),
    predefinite: () => elencoDomande(predefiniti.config),
  });

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

  const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;

  /** Il resoconto dell'ultimo import: si ridisegna insieme alla scheda. */
  function riquadroEsito(esito) {
    if (esito.errore) {
      return el('div', { class: 'card errore' }, [
        el('h3', { testo: 'Import non riuscito' }),
        el('p', { class: 'errore-testo', testo: esito.errore }),
      ]);
    }
    const { letto, rapporto } = esito;
    return el('div', { class: 'card info' }, [
      el('h3', { testo: 'Import completato' }),
      el('p', { testo: `Riconosciuto: ${letto.origine} — ${letto.referenze} referenze lette dal file.` }),
      el('p', { testo: `Nuove ${rapporto.nuove} · disattivate ${rapporto.disattivate} · riattivate ${rapporto.riattivate} · invariate ${rapporto.invariate}` }),
      el('p', { testo: `In catalogo adesso: ${rapporto.totale} referenze, ${rapporto.attive} attive nel percorso.` }),
      letto.scartate
        ? el('p', { class: 'muted', testo: `${plurale(letto.scartate, 'voce saltata', 'voci saltate')} perché senza un codice a tre cifre: le essenze singole, per esempio.` })
        : null,
      rapporto.sparite
        ? el('p', { class: 'muted', testo: rapporto.sparite === 1
          ? 'Una referenza non c\'era più nel file: resta in archivio col suo profilo, ma disattivata.'
          : `${rapporto.sparite} referenze non c'erano più nel file: restano in archivio col loro profilo, ma disattivate.` })
        : null,
      el('p', { class: 'muted piccolo-testo', testo: 'Di ogni referenza sono stati tenuti solo codice, categoria e stato. Nome, brand, fornitori, costi e giacenze sono stati scartati senza mai essere salvati.' }),
      rapporto.senzaProfilo.length
        ? el('p', { class: 'errore-testo', testo: `Attive senza profilo (${rapporto.senzaProfilo.length}): ${rapporto.senzaProfilo.join(', ')}` })
        : el('p', { class: 'muted', testo: 'Ogni referenza attiva ha il suo profilo.' }),
    ]);
  }

  function cardImport() {
    const area = el('textarea', { placeholder: 'Incolla qui il contenuto del backup del gestionale…', rows: 4 });
    const file = el('input', { type: 'file', accept: '.json,application/json' });
    const esito = el('div', {}, esitoImport ? [riquadroEsito(esitoImport)] : []);

    const applica = (testo) => {
      let letto;
      try {
        letto = leggiCatalogo(JSON.parse(testo));
      } catch (errore) {
        esitoImport = {
          errore: errore instanceof SyntaxError
            ? 'il file non è JSON valido. Dal gestionale serve quello di «Storico e backup» → «Scarica backup».'
            : errore.message,
        };
        svuota(esito).append(riquadroEsito(esitoImport));
        return;
      }
      const rapporto = importaCatalogo(letto.referenze);
      esitoImport = {
        letto: { origine: letto.origine, referenze: letto.referenze.length, scartate: letto.scartate },
        rapporto,
      };
      area.value = '';
      salvaEDisegna('Catalogo aggiornato.');
    };

    file.addEventListener('change', async () => {
      const scelto = file.files && file.files[0];
      if (scelto) applica(await scelto.text());
    });

    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Import del catalogo' }),
      el('p', { class: 'muted' }, 'Va bene il backup del gestionale («Storico e backup» → «Scarica backup») oppure un export del solo catalogo. Di ogni referenza si tengono solo codice, categoria e stato: nome, brand, fornitori, costi e giacenze vengono scartati prima del salvataggio, qui dentro non esistono.'),
      el('label', { class: 'campo' }, ['File JSON', file]),
      el('label', { class: 'campo' }, ['Oppure incolla il testo', area]),
      el('div', { class: 'azioni' }, [
        el('button', { class: 'primario', type: 'button', onclick: () => area.value.trim() ? applica(area.value) : toast('Scegli un file o incolla il testo.') }, 'Importa dal testo'),
      ]),
      esito,
    ]);
  }

  function importaCatalogo(letteDalFile) {
    const nuovo = letteDalFile.map((voce) => ({ ...voce }));
    const vecchio = new Map(s.catalogo.map((c) => [c.codice, c]));
    const rapporto = { nuove: 0, disattivate: 0, riattivate: 0, invariate: 0, attive: 0, totale: 0, sparite: 0, senzaProfilo: [] };
    const conProfilo = new Set(s.profili.map((p) => p.codice));
    for (const voce of nuovo) {
      const prima = vecchio.get(voce.codice);
      if (!prima) rapporto.nuove++;
      else if (prima.attivo && !voce.attivo) rapporto.disattivate++;
      else if (!prima.attivo && voce.attivo) rapporto.riattivate++;
      else rapporto.invariate++;
      if (voce.attivo && !conProfilo.has(voce.codice)) rapporto.senzaProfilo.push(voce.codice);
    }
    // Le referenze sparite dall'export restano in archivio con il loro profilo,
    // ma disattivate: nel motore non entrano più (docs/01-brief.md, regola 3).
    for (const [codice, voce] of vecchio) {
      if (!nuovo.some((n) => n.codice === codice)) {
        nuovo.push({ ...voce, attivo: false });
        if (voce.attivo) { rapporto.disattivate++; rapporto.sparite++; }
      }
    }
    nuovo.sort((a, b) => a.codice.localeCompare(b.codice));
    rapporto.attive = nuovo.filter((c) => c.attivo).length;
    rapporto.totale = nuovo.length;
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
            onclick: () => {
              profilo.confidenza = 'alta';
              profilo.rivisto = oggi();
              salvaEDisegna(`${codice} confermato: da ora gli aggiornamenti non lo sostituiscono.`);
            },
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

    sezione.append(...editorDomande.sezione(s));

    sezione.append(cardProvaRapida());

    sezione.append(cardRicercaNote());
    if (lessico && lessico()) sezione.append(cardConsulente());

    sezione.append(el('section', { class: 'card' }, [
      el('h2', { testo: 'Valori di fabbrica' }),
      el('p', { class: 'muted' }, 'Rimette pesi, domande, frasi, testi e le soglie della ricerca per note come sono nei file di configurazione. Catalogo, profili e statistiche non si toccano.'),
      el('div', { class: 'azioni' }, [
        el('button', {
          class: 'pericolo', type: 'button',
          onclick: async () => {
            const mie = domandeProprie(s.config, predefiniti.config);
            const scelte = await chiediConferma({
              titolo: 'Rimetti i valori consigliati',
              righe: [
                { cosa: 'cambia', testo: 'Pesi, coefficienti, frasi, testi e la taratura della ricerca per note tornano come li abbiamo consegnati.' },
                { cosa: 'cambia', testo: 'Le domande arrivate con l\'app tornano alla versione originale, comprese quelle eliminate.' },
                { cosa: 'resta', testo: 'Catalogo, profili e statistiche non si toccano.' },
                { cosa: 'resta', testo: 'Prima viene creato un punto di ripristino.' },
              ],
              opzioni: mie.length
                ? [{
                  id: 'tieniMie',
                  etichetta: mie.length === 1 ? 'Tieni la domanda che hai scritto tu' : `Tieni le ${mie.length} domande che hai scritto tu`,
                  valore: true,
                }]
                : [],
              conferma: 'Rimetti i consigliati',
              pericolo: true,
            });
            if (!scelte) return;
            store.creaPuntoRipristino(s, 'prima del ripristino configurazione');
            const esito = ripristinaConfig(s.config, predefiniti.config, { tieniDomandeMie: scelte.tieniMie !== false });
            s.config = esito.config;
            editorDomande.chiudi();
            salvaEDisegna(esito.tenute
              ? `Valori consigliati rimessi, ${esito.tenute} domande tue tenute.`
              : 'Configurazione riportata ai valori consigliati.');
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

  /**
   * Taratura del secondo percorso (docs/12-ricerca-note.md): le soglie della
   * ricerca per note, la sua prova sul catalogo vero e i controlli di salute
   * della tavolozza — quello che dopo un import può essere diventato un buco.
   */
  function cardRicercaNote() {
    const ricerca = s.config.ricerca || (s.config.ricerca = {});
    const opzioni = impostazioni(s.config);
    const configConNote = () => ({ ...s.config, note: predefiniti.note });
    const profili = profiliInGioco();
    const indice = indiceNote(profili, configConNote());

    const numerico = (chiave, etichetta, min, max, passo = 0.05) => el('label', { class: 'campo' }, [
      etichetta,
      el('input', {
        type: 'number', value: String(ricerca[chiave] ?? opzioni[chiave]), min: String(min), max: String(max), step: String(passo),
        onchange: (e) => { ricerca[chiave] = Number(e.target.value); salvaEDisegna(); },
      }),
    ]);

    // Prova: si scelgono note e famiglie e si vede cosa uscirebbe al cliente.
    const esitoNodo = el('div');
    function ricalcola() {
      const esito = cerca(criteriProva, profili, configConNote());
      const conQualcosa = esito.risultati.filter((r) => r.presi > 0).length;
      svuota(esitoNodo).append(
        el('p', { class: 'muted piccolo-testo', testo: `${esito.pieni} con tutto, ${conQualcosa - esito.pieni} con una parte, `
          + `${esito.risultati.length - conQualcosa} solo somiglianti`
          + `${esito.fuoriPerVeto ? ` · ${esito.fuoriPerVeto} tolte dai veti` : ''}`
          + ` · ogni criterio da solo: ${esito.daSoli.map((d) => `${d.tipo === 'nota' ? d.chiave : `famiglia ${d.chiave}`} ${d.quante}`).join(', ') || '—'}` }),
        el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { testo: 'Codice' }), el('th', { testo: 'Famiglia' }),
            el('th', { class: 'num', testo: 'Punteggio' }), el('th', { testo: 'Trovato per' }),
          ])]),
          el('tbody', {}, esito.risultati.slice(0, 12).map((r) => el('tr', {}, [
            el('td', { class: 'cod', testo: r.codice }),
            el('td', { testo: `${r.profilo.famiglia} · ${r.profilo.sottofamiglia}` }),
            el('td', { class: 'num', testo: r.punteggio.toFixed(3) }),
            el('td', { class: 'muted', testo: r.trovate.map((x) => (x.tipo === 'nota' ? `${x.nome} (${x.fila})` : x.chiave)).join(', ') || 'somiglianza' }),
          ]))),
        ])]),
      );
    }

    const chipsGruppi = el('div', { class: 'chips' });
    for (const gruppo of indice.gruppi) {
      for (const famiglia of gruppo.famiglie) {
        chipsGruppi.append(el('button', {
          type: 'button',
          class: criteriProva.accordi.includes(famiglia.chiave) ? 'scelto' : '',
          onclick: () => {
            criteriProva.accordi = criteriProva.accordi.includes(famiglia.chiave)
              ? criteriProva.accordi.filter((c) => c !== famiglia.chiave)
              : [...criteriProva.accordi, famiglia.chiave];
            disegna();
          },
        }, [famiglia.etichetta, el('span', { class: 'livello', testo: String(famiglia.quante) })]));
      }
    }

    const chipsNote = el('div', { class: 'chips' });
    for (const nota of indice.note.slice(0, 24)) {
      chipsNote.append(el('button', {
        type: 'button',
        class: criteriProva.note.includes(nota.chiave) ? 'scelto' : '',
        onclick: () => {
          criteriProva.note = criteriProva.note.includes(nota.chiave)
            ? criteriProva.note.filter((c) => c !== nota.chiave)
            : [...criteriProva.note, nota.chiave];
          disegna();
        },
      }, [nota.nome, el('span', { class: 'livello', testo: String(nota.quante) })]));
    }

    // Salute della tavolozza: quello che un import del catalogo può aver rotto.
    const povere = indice.famiglie.filter((f) => f.quante > 0 && f.quante < 8).map((f) => `${f.etichetta} (${f.quante})`);
    const vuote = indice.famiglie.filter((f) => !f.note.length).map((f) => f.etichetta);

    ricalcola();
    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Ricerca per note' }),
      el('p', { class: 'muted piccolo-testo' },
        'Il secondo percorso: il cliente sceglie gli ingredienti e sfoglia il catalogo. '
        + 'Qui si tarano le soglie; i gruppi della tavolozza, i sinonimi e le spiegazioni delle note stanno in app/config/ricerca.json.'),
      el('div', { class: 'riga' }, [
        numerico('sogliaAccordo', 'Quando una famiglia c\'è', 0, 1),
        numerico('sogliaVeto', 'Quando un veto colpisce', 0, 1),
        numerico('affinita', 'Quanto vale una somiglianza', 0, 1),
        numerico('forzaNota', 'Peso della nota protagonista', 0, 1),
      ]),
      el('div', { class: 'riga' }, [
        numerico('massimoScelte', 'Quante cose può mettere insieme', 1, 8, 1),
        numerico('minimoOccorrenze', 'Nota mostrata da', 1, 10, 1),
        numerico('quanteNotePerGruppo', 'Note per cassetto', 4, 20, 1),
        numerico('quantiRisultati', 'Risultati per volta', 4, 40, 1),
      ]),
      el('p', { class: 'piccolo-testo muted', testo: `${indice.gruppi.length} gruppi, ${indice.note.length} note distinte nel catalogo attivo`
        + `${indice.senzaFamiglia ? `, ${indice.senzaFamiglia} senza famiglia in note.json` : ''}.` }),
      indice.senzaFamiglia || vuote.length
        ? el('p', { class: 'avviso', testo: vuote.length
          ? `Famiglie rimaste senza note da mostrare: ${vuote.join(', ')}. Dopo un import può succedere: controlla il catalogo.`
          : 'Qualche nota del catalogo non ha una riga in note.json: non si può cercare per quella nota.' })
        : null,
      povere.length
        ? el('p', { class: 'piccolo-testo muted', testo: `Famiglie con poche referenze attive: ${povere.join(' · ')}. Da sole vanno bene, incrociate con altro danno pochi risultati.` })
        : null,
      el('h3', { testo: 'Prova la ricerca' }),
      el('p', { class: 'muted piccolo-testo' }, 'Le famiglie e le venti note più presenti. I risultati sono quelli veri, sul catalogo attivo.'),
      chipsGruppi,
      el('p', { class: 'piccolo-testo muted', testo: 'Note' }),
      chipsNote,
      el('div', { class: 'azioni' }, [
        el('button', { type: 'button', onclick: () => { criteriProva = { accordi: [], note: [], escludi: [], escludiNote: [] }; disegna(); } }, 'Azzera la prova'),
        ...RICERCHE.slice(0, 4).map((r) => el('button', {
          type: 'button', class: 'piccolo',
          onclick: () => { criteriProva = { accordi: [], note: [], escludi: [], escludiNote: [], ...r.criteri }; disegna(); },
        }, r.titolo)),
      ]),
      esitoNodo,
    ]);
  }

  /**
   * Il consulente a parole: si scrive una frase e si vede cosa ha capito, perché
   * propone quello che propone, e come vanno le frasi tipiche di scenari.js.
   * Il lessico non si modifica qui: si scrive in dati/lessico/ e si ricompila.
   */
  function cardConsulente() {
    const consulente = s.config.consulente || (s.config.consulente = {});
    const pesi = consulente.pesi || (consulente.pesi = {});
    const attuali = pesiConsulente(s.config);
    const configConNote = () => ({ ...s.config, note: predefiniti.note });
    const profili = profiliInGioco();
    const pronto = preparaLessico(lessico(), configConNote(), profili);

    const numerico = (chiave, etichetta, min, max, passo = 0.01) => el('label', { class: 'campo' }, [
      etichetta,
      el('input', {
        type: 'number', value: String(pesi[chiave] ?? attuali[chiave]), min: String(min), max: String(max), step: String(passo),
        onchange: (e) => { pesi[chiave] = Number(e.target.value); esitoFrasi = null; salvaEDisegna(); },
      }),
    ]);

    const numero = (v) => (typeof v === 'number' ? v.toFixed(3) : '—');
    const esitoNodo = el('div');
    function ricalcola() {
      const desiderio = interpreta(fraseProva, pronto);
      const capite = desiderio.capito.map((c) => `${c.chiave}${c.modo === 'si' ? '' : ` (${c.modo})`}`);
      const accordi = Object.entries(desiderio.accordi).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([k, v]) => `${k} ${v.toFixed(2)}`);
      const note = Object.entries(desiderio.note).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
      const misure = Object.entries(desiderio.attributi).map(([k, v]) => `${k} ${v}`);
      const veti = [...Object.keys(desiderio.esclusioni), ...desiderio.noteEscluse,
        ...Object.keys(desiderio.esclusioniAttributi).map((a) => `${a} alta`)];
      const righe = [
        `Capito: ${capite.join(', ') || 'niente'}`,
        `Accordi: ${accordi.join(', ') || '—'}`,
        `Note: ${note.join(', ') || '—'}`,
        misure.length ? `Misure: ${misure.join(', ')}` : null,
        veti.length ? `Veti: ${veti.join(', ')}` : null,
        desiderio.filtri.genere ? `Solo ${desiderio.filtri.genere} e unisex` : null,
        desiderio.ignorate.length ? `Parole che il lessico non conosce: ${desiderio.ignorate.join(', ')}` : null,
      ].filter(Boolean);
      svuota(esitoNodo).append(...righe.map((r) => el('p', { class: 'piccolo-testo muted', testo: r })));
      if (!haSostanza(desiderio)) {
        esitoNodo.append(el('p', { class: 'avviso', testo: 'Con questa frase il cliente vedrebbe "non ho capito abbastanza".' }));
        return;
      }
      const esito = consiglia(desiderio, profili, configConNote(), pronto);
      const proposti = new Set(esito.proposte.map((p) => p.codice));
      esitoNodo.append(
        el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { testo: 'Codice' }), el('th', { testo: 'Famiglia' }),
            el('th', { class: 'num', testo: 'Punteggio' }), el('th', { class: 'num', testo: 'Accordi' }),
            el('th', { class: 'num', testo: 'Note' }),
          ])]),
          el('tbody', {}, esito.classifica.map((c) => {
            const profilo = profiloDi(c.codice) || {};
            return el('tr', { class: proposti.has(c.codice) ? 'evidenza' : '' }, [
              el('td', { class: 'cod', testo: `${c.codice}${proposti.has(c.codice) ? ' ●' : ''}` }),
              el('td', { testo: `${profilo.famiglia || ''} · ${profilo.sottofamiglia || ''}` }),
              el('td', { class: 'num', testo: numero(c.totale) }),
              el('td', { class: 'num', testo: numero(c.accordi) }),
              el('td', { class: 'num', testo: numero(c.note) }),
            ]);
          })),
        ])]),
        ...esito.proposte.map((p) => el('p', { class: 'piccolo-testo', testo: `${p.codice}: ${p.motivi.join(' ')}` })),
      );
    }

    const campo = el('input', {
      type: 'text', value: fraseProva, placeholder: 'Scrivi una frase come la direbbe un cliente',
      onchange: (e) => { fraseProva = e.target.value; ricalcola(); },
      onkeydown: (e) => { if (e.key === 'Enter') { fraseProva = e.target.value; ricalcola(); } },
    });

    const frasiNodo = el('div');
    function disegnaFrasi() {
      svuota(frasiNodo);
      if (!esitoFrasi) return;
      const buone = esitoFrasi.filter((f) => !f.problemi.length).length;
      frasiNodo.append(
        el('p', { class: buone === esitoFrasi.length ? 'piccolo-testo' : 'avviso', testo: `${buone} frasi su ${esitoFrasi.length} danno quello che ci si aspetta.` }),
        el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('tbody', {}, esitoFrasi.map((f) => el('tr', {}, [
            el('td', { testo: f.problemi.length ? 'no' : 'ok' }),
            el('td', {}, [el('button', { type: 'button', class: 'link', onclick: () => { fraseProva = f.frase; disegna(); } }, f.frase)]),
            el('td', { class: 'mono', testo: f.codici.join(' ') }),
            el('td', { class: 'muted piccolo-testo', testo: f.problemi.join('; ') }),
          ]))),
        ])]),
      );
    }

    const perTipo = {};
    for (const scena of lessico().scene || []) perTipo[scena.tipo] = (perTipo[scena.tipo] || 0) + 1;

    ricalcola();
    disegnaFrasi();
    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Consulente a parole' }),
      el('p', { class: 'muted piccolo-testo' },
        'Il terzo percorso: il cliente racconta un posto, un sapore, un momento, e il lessico lo traduce in accordi e note. '
        + 'Qui si tarano i pesi e si prova una frase; le scene si scrivono in dati/lessico/ e si compilano con node scripts/costruisci_lessico.mjs.'),
      el('p', { class: 'piccolo-testo muted', testo: `${(lessico().scene || []).length} scene · ${pronto.note} note del catalogo riconosciute per nome · `
        + Object.entries(perTipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ') }),
      el('div', { class: 'riga' }, [
        numerico('accordi', 'Accordi', 0, 1), numerico('note', 'Note', 0, 1),
        numerico('attributi', 'Misure', 0, 1), numerico('contesto', 'Contesto', 0, 1),
      ]),
      el('div', { class: 'riga' }, [
        numerico('carattere', 'Carattere', 0, 1), numerico('affinitaNota', 'Nota assente, famiglia forte', 0, 1),
        numerico('esclusione', 'Forza dei veti', 0, 3), numerico('esclusioneFuori', 'Veto che esclude', 0, 1, 0.05),
      ]),
      el('h3', { testo: 'Prova una frase' }),
      el('label', { class: 'campo' }, ['Frase', campo]),
      esitoNodo,
      el('h3', { testo: 'Le frasi tipiche' }),
      el('div', { class: 'azioni' }, [
        el('button', {
          type: 'button',
          onclick: () => {
            esitoFrasi = FRASI.map(({ frase, attese }) => {
              const desiderio = interpreta(frase, pronto);
              const esito = consiglia(desiderio, profili, configConNote(), pronto);
              return { frase, codici: esito.proposte.map((p) => p.codice), problemi: controllaAttese(esito, attese) };
            });
            disegnaFrasi();
          },
        }, `Prova le ${FRASI.length} frasi tipiche`),
      ]),
      frasiNodo,
    ]);
  }

  // ============================================================ statistiche

  /** Cosa racconta chi entra dalla porta delle parole: solo le scene capite, mai le frasi. */
  function cardConsulti(dati) {
    const c = dati.consulti || {};
    const voci = new Map(((lessico && lessico()) || { scene: [] }).scene.map((sc) => [sc.chiave, sc]));
    const etichetta = (chiave) => {
      const voce = voci.get(chiave);
      if (voce) return `${voce.evoca} (${voce.tipo})`;
      return chiave.replace(/^nota:/, '').replace(/^famiglia:/, 'famiglia ');
    };
    const scene = Object.entries(c.scene || {}).sort((a, b) => b[1] - a[1]);
    const veti = Object.entries(c.veti || {}).sort((a, b) => b[1] - a[1]);
    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Consulente a parole' }),
      el('p', { class: 'muted piccolo-testo' },
        `${c.fatti === 1 ? 'Un racconto' : `${c.fatti || 0} racconti`}`
        + `${c.vuoti ? `, ${c.vuoti} senza abbastanza da proporre` : ''}`
        + `${c.conParoleIgnote ? `, ${c.conParoleIgnote} con parole che il lessico non conosce` : ''}`
        + '. Le frasi non si salvano mai: si contano solo le scene riconosciute.'),
      scene.length
        ? el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('thead', {}, [el('tr', {}, [el('th', { testo: 'Raccontato' }), el('th', { class: 'num', testo: 'Volte' })])]),
          el('tbody', {}, scene.slice(0, 40).map(([chiave, n]) => el('tr', {}, [
            el('td', { testo: etichetta(chiave) }), el('td', { class: 'num', testo: String(n) }),
          ]))),
        ])])
        : el('p', { class: 'vuoto', testo: 'Ancora nessun racconto.' }),
      veti.length ? el('p', { class: 'piccolo-testo muted', testo: `Non lo voglio: ${veti.slice(0, 20).map(([k, n]) => `${etichetta(k)} ${n}`).join(' · ')}` }) : null,
    ]);
  }

  /** Cosa cerca chi entra dalla porta delle note: famiglie, note precise, veti. */
  function cardNoteCercate(dati) {
    const etichetta = (chiave) => {
      const accordo = elencoAccordi(s.config).find((a) => a.chiave === chiave);
      return accordo ? `${accordo.etichetta} (famiglia)` : chiave;
    };
    const veti = Object.entries((dati.ricerche && dati.ricerche.veti) || {}).sort((a, b) => b[1] - a[1]);
    const schede = Object.entries((dati.ricerche && dati.ricerche.schede) || {}).sort((a, b) => b[1] - a[1]);

    return el('section', { class: 'card' }, [
      el('h2', { testo: 'Ricerca per note' }),
      el('p', { class: 'muted piccolo-testo' },
        `${dati.ricerche.fatte === 1 ? 'Una ricerca fatta' : `${dati.ricerche.fatte || 0} ricerche fatte`}`
        + `${dati.ricerche.vuote ? `, ${dati.ricerche.vuote} senza nessun risultato` : ''}`
        + `${dati.ricerche.soloSomiglianti ? `, ${dati.ricerche.soloSomiglianti} con sole somiglianze` : ''}`
        + '. Dice quali ingredienti chiede la clientela: è la traccia più diretta per capire dove il catalogo ha un buco.'),
      dati.note.length
        ? el('div', { class: 'tabella-wrap' }, [el('table', {}, [
          el('thead', {}, [el('tr', {}, [el('th', { testo: 'Cercata' }), el('th', { class: 'num', testo: 'Volte' })])]),
          el('tbody', {}, dati.note.slice(0, 40).map(([chiave, n]) => el('tr', {}, [
            el('td', { testo: etichetta(chiave) }), el('td', { class: 'num', testo: String(n) }),
          ]))),
        ])])
        : el('p', { class: 'vuoto', testo: 'Ancora nessuna ricerca per note.' }),
      veti.length ? el('p', { class: 'piccolo-testo muted', testo: `Non lo voglio: ${veti.map(([k, n]) => `${etichetta(k)} ${n}`).join(' · ')}` }) : null,
      schede.length ? el('p', { class: 'piccolo-testo muted', testo: `Schede aperte per leggerne la piramide: ${schede.slice(0, 12).map(([k, n]) => `${k} (${n})`).join(' · ')}` }) : null,
    ]);
  }

  function disegnaStatistiche(sezione) {
    const dati = riepilogo(s.statistiche);
    const maiProposti = s.catalogo
      .filter((c) => c.attivo && !(s.statistiche.codici || {})[c.codice])
      .map((c) => c.codice);

    sezione.append(el('div', { class: 'kpi' }, [
      riquadro(String(dati.iniziati), 'Percorsi iniziati'),
      riquadro(String(dati.completati), 'Domande completate', 'teal'),
      riquadro(dati.mediano ? `${dati.mediano}s` : '—', 'Tempo mediano (domande)'),
      riquadro(dati.abbandoni.length ? dati.abbandoni[0][0] : '—', 'Si abbandona su', dati.abbandoni.length ? 'warn' : ''),
      riquadro(String(dati.percorsi.guidato || 0), 'Scelgono le domande'),
      riquadro(String(dati.percorsi.note || 0), 'Scelgono le note', 'teal'),
      riquadro(String(dati.percorsi.parole || 0), 'Raccontano a parole', 'teal'),
    ]));

    sezione.append(cardNoteCercate(dati));
    sezione.append(cardConsulti(dati));

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
      el('h2', { testo: 'Azzera' }),
      el('p', { class: 'muted piccolo-testo' }, 'Da fare quando il collaudo finisce, o quando si porta il banco in un altro negozio: i conteggi ripartono da zero.'),
      el('div', { class: 'azioni' }, [
        el('button', {
          class: 'pericolo', type: 'button',
          onclick: async () => {
            const scelte = await chiediConferma({
              titolo: 'Azzera le statistiche',
              righe: [
                { cosa: 'cambia', testo: `Percorsi (${dati.iniziati}), tempi, codici proposti, risposte, ricerche per note e racconti tornano a zero.` },
                { cosa: 'resta', testo: 'Catalogo, profili, domande e tarature non si toccano.' },
                { cosa: 'resta', testo: 'Prima viene creato un punto di ripristino.' },
              ],
              conferma: 'Azzera',
              pericolo: true,
            });
            if (!scelte) return;
            store.creaPuntoRipristino(s, 'prima di azzerare le statistiche');
            s.statistiche = nuoveStatistiche();
            salvaEDisegna('Statistiche azzerate.');
          },
        }, 'Azzera le statistiche'),
      ]),
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

  // ================================================================= backup

  function disegnaBackup(sezione) {
    const fileConfig = el('input', { type: 'file', accept: '.json,application/json' });
    fileConfig.addEventListener('change', async () => {
      const scelto = fileConfig.files && fileConfig.files[0];
      if (!scelto) return;
      try {
        const config = store.importaConfig(await scelto.text());
        const quante = elencoDomande(config).length;
        const scelte = await chiediConferma({
          titolo: 'Prendi la configurazione dal file',
          righe: [
            { cosa: 'cambia', testo: `Domande (${quante}), pesi, frasi, testi e taratura della ricerca diventano quelli del file.` },
            { cosa: 'resta', testo: 'Catalogo, profili e statistiche di questo dispositivo restano come sono.' },
            { cosa: 'resta', testo: 'Prima viene creato un punto di ripristino.' },
          ],
          conferma: 'Prendi la configurazione',
        });
        if (!scelte) return;
        store.creaPuntoRipristino(s, 'prima di un import della configurazione');
        s.config = aggiornaConfig(config, predefiniti.config).config;
        editorDomande.chiudi();
        salvaEDisegna('Configurazione importata.');
      } catch (errore) {
        toast(`Import non riuscito: ${errore.message}`);
      } finally {
        fileConfig.value = '';
      }
    });

    const file = el('input', { type: 'file', accept: '.json,application/json' });
    file.addEventListener('change', async () => {
      const scelto = file.files && file.files[0];
      if (!scelto) return;
      try {
        const nuovo = store.importa(await scelto.text());
        const scelte = await chiediConferma({
          titolo: 'Importa il backup',
          righe: [
            { cosa: 'cambia', testo: `Catalogo (${nuovo.catalogo.length} referenze), profili (${nuovo.profili.length}) e configurazione di questo dispositivo vengono sostituiti.` },
            { cosa: 'resta', testo: 'Il codice del banco di questo dispositivo non cambia.' },
            { cosa: 'resta', testo: 'Prima viene creato un punto di ripristino.' },
          ],
          opzioni: [{ id: 'tieniStatistiche', etichetta: 'Tieni le statistiche di questo dispositivo', valore: true }],
          conferma: 'Importa',
        });
        if (!scelte) return;
        store.creaPuntoRipristino(s, 'prima di un import');
        if (scelte.tieniStatistiche) nuovo.statistiche = s.statistiche;
        if (s.pin) nuovo.pin = s.pin;
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
            onclick: () => scarica(`consulente-configurazione-${oggi()}.json`, store.esportaConfig(s.config)),
          }, 'Scarica solo la configurazione'),
          el('button', {
            type: 'button',
            onclick: () => { store.creaPuntoRipristino(s, 'manuale'); toast('Punto di ripristino creato.'); disegna(); },
          }, 'Crea punto di ripristino'),
        ]),
        el('p', { class: 'muted piccolo-testo' },
          'Il backup intero serve a clonare un banco o a tornare indietro. La sola configurazione — domande, pesi, frasi, testi e ricerca per note — '
          + 'serve a portare la messa a punto su un altro negozio senza toccarne profili e statistiche.'),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { testo: 'Importa' }),
        el('p', { class: 'muted' }, 'Il backup intero sostituisce catalogo, profili e configurazione di questo dispositivo; prima di procedere una finestra dice cosa cambia e cosa resta.'),
        el('label', { class: 'campo' }, ['Backup intero', file]),
        el('label', { class: 'campo' }, ['Solo la configurazione (domande, pesi, frasi, testi, ricerca)', fileConfig]),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { testo: 'Punti di ripristino' }),
        punti.length
          ? el('ul', { class: 'pulita' }, punti.map((p) => el('li', {}, [
            `${dataItaliana(p.quando)} ${String(p.quando).slice(11, 16)} — ${p.motivo} `,
            el('button', {
              class: 'piccolo', type: 'button',
              onclick: async () => {
                const scelte = await chiediConferma({
                  titolo: `Torna al ${dataItaliana(p.quando)} ${String(p.quando).slice(11, 16)}`,
                  righe: [
                    { cosa: 'cambia', testo: 'Catalogo, profili e configurazione tornano a com\'erano in quel momento.' },
                    { cosa: 'resta', testo: 'Lo stato di adesso viene messo da parte come nuovo punto di ripristino.' },
                  ],
                  opzioni: [{ id: 'tieniStatistiche', etichetta: 'Tieni le statistiche di adesso', valore: true }],
                  conferma: 'Torna a questo punto',
                });
                if (!scelte) return;
                store.creaPuntoRipristino(s, 'prima di un ripristino');
                const tornato = store.ripristina(p.id);
                if (scelte.tieniStatistiche) tornato.statistiche = s.statistiche;
                sostituisciStato(tornato);
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
            onclick: async () => {
              const scelte = await chiediConferma({
                titolo: 'Dimentica il codice del banco',
                righe: [
                  { cosa: 'cambia', testo: 'Al prossimo accesso al banco ne viene chiesto uno nuovo.' },
                  { cosa: 'resta', testo: 'Catalogo, profili, domande e statistiche non cambiano.' },
                ],
                conferma: 'Dimentica il codice',
                pericolo: true,
              });
              if (!scelte) return;
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
    if (nome !== scheda) { esitoImport = null; editorDomande.chiudi(); }
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

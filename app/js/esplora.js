// Il secondo percorso del chiosco (docs/12-ricerca-note.md): il banco delle note
// e i profumi che ne escono. Non conosce il motore della ricerca più di quanto
// percorso.js conosca motore.js: chiede a ricerca.js e disegna quello che torna.
//
// Due schermate: #ricerca (si scelgono le note) e #trovati (si sfogliano i profumi).

import { $, el, svuota, toast, toccoLungo } from './ui.js';
import { icona, tintaIcona } from './icone.js';
import {
  indiceNote, cerca, piramide, impostazioni, etichettaCriterio, chiaveDiNota, normalizzaNota,
} from './ricerca.js';
import { etichettaFamiglia, ATTRIBUTI } from './motore.js';

const FILE = { testa: 'Testa', cuore: 'Cuore', fondo: 'Fondo' };
const PAROLE = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto'];

/** "Ne hanno una su tre" si legge meglio di "1 su 3": i numeri piccoli si scrivono. */
const aParole = (n) => PAROLE[n] || String(n);

/** "un profumo" o "33 profumi": nel chiosco non si scrive mai "1 profumi". */
const quantiProfumi = (n) => (n === 1 ? 'un profumo' : `${n} profumi`);

export function creaEsplora({
  dammiConfig, dammiTesti, dammiProfili, vaiA, allUscita, allaRicerca, allaScheda,
}) {
  const config = () => dammiConfig();
  const testi = () => dammiTesti();
  const T = () => testi().ricerca || {};
  const cesto = () => T().cesto || {};
  const esiti = () => T().risultati || {};
  const parole = () => T().filtri || {};
  const schedaTesti = () => T().scheda || {};

  const riferimenti = {
    banco: $('#banco'),
    chip: $('#cesto-chip'),
    conto: $('#cesto-conto'),
    tolgo: $('#cesto-tolgo'),
    vedi: $('#cesto-vedi'),
    titolo: $('#trovati-titolo'),
    sotto: $('#trovati-sotto'),
    scelte: $('#trovati-scelte'),
    filtri: $('#trovati-filtri'),
    avviso: $('#trovati-avviso'),
    elenco: $('#trovati-elenco'),
    invito: $('#trovati-banco'),
    dialogo: $('#dlg-scheda'),
    dialogoCorpo: $('#dlg-scheda-corpo'),
  };

  let criteri = vuoti();
  let gruppoAperto = null;
  let modoTolgo = false;
  let indiceCache = null;
  let spiegazioniCache = null;
  let mostrati = new Map();
  let firmaSegnata = null;   // l'ultima ricerca contata nelle statistiche
  const chiaviSegnate = new Set();   // quello che questo cliente ha già chiesto
  let vistaDisegnata = null; // che cosa c'era sul banco: serve a non far saltare la lista
  let tutteLeNote = false;   // il cassetto mostra anche le note oltre la dozzina

  function vuoti() {
    return { accordi: [], note: [], escludi: [], escludiNote: [], genere: null, intensita: null };
  }

  function indice() {
    if (!indiceCache) indiceCache = indiceNote(dammiProfili(), config());
    return indiceCache;
  }

  /**
   * Le spiegazioni sono scritte in ricerca.json come si leggono ("tè", "caffè",
   * "fiore d'arancio"); le note viaggiano normalizzate. Senza questa tabella sei
   * righe non comparirebbero mai, e nessuno se ne accorgerebbe dal file.
   */
  function spiegazioni() {
    if (spiegazioniCache) return spiegazioniCache;
    spiegazioniCache = new Map();
    for (const [chiave, testo] of Object.entries((config().ricerca || {}).spiegazioni || {})) {
      if (chiave.startsWith('_')) continue;
      spiegazioniCache.set(normalizzaNota(chiave), testo);
    }
    return spiegazioniCache;
  }

  const quanteScelte = () => criteri.accordi.length + criteri.note.length
    + criteri.escludi.length + criteri.escludiNote.length;

  /** Le scelte viaggiano con la chiave normalizzata ("te"); al cliente si mostra "tè". */
  const nomeNota = (chiave) => {
    const voce = indice().perNota.get(chiave);
    return (voce && voce.nome) || chiave;
  };

  const conModello = (testo, valori) => Object.entries(valori)
    .reduce((fuori, [chiave, valore]) => fuori.replaceAll(`{${chiave}}`, valore), String(testo || ''));

  // ------------------------------------------------------------- le scelte

  /** Aggiunge o toglie una scelta. In modo "non lo voglio" finisce fra i veti. */
  function tocca(tipo, chiave) {
    const dove = modoTolgo
      ? (tipo === 'accordo' ? 'escludi' : 'escludiNote')
      : (tipo === 'accordo' ? 'accordi' : 'note');
    const altro = modoTolgo
      ? (tipo === 'accordo' ? 'accordi' : 'note')
      : (tipo === 'accordo' ? 'escludi' : 'escludiNote');

    if (criteri[dove].includes(chiave)) {
      criteri[dove] = criteri[dove].filter((c) => c !== chiave);
    } else {
      const massimo = impostazioni(config()).massimoScelte;
      if (!modoTolgo && criteri.accordi.length + criteri.note.length >= massimo) {
        toast(conModello(cesto().massimo || 'Puoi metterne insieme al massimo {max}.', { max: massimo }));
        return;
      }
      // La stessa cosa non può essere voluta e non voluta insieme.
      criteri[altro] = criteri[altro].filter((c) => c !== chiave);
      criteri[dove] = [...criteri[dove], chiave];
    }
    // Si ridisegna la schermata su cui siamo: le note si toccano sia nel cassetto
    // sia dentro la piramide di un risultato.
    if (schermoTrovati()) mostraTrovati(); else disegnaBanco();
  }

  function scelto(tipo, chiave) {
    if (tipo === 'accordo') {
      if (criteri.accordi.includes(chiave)) return 'scelto';
      if (criteri.escludi.includes(chiave)) return 'tolto';
    } else {
      if (criteri.note.includes(chiave)) return 'scelto';
      if (criteri.escludiNote.includes(chiave)) return 'tolto';
    }
    return '';
  }

  // ------------------------------------------------------ il banco (schermo 1)

  /** Una delle nove schede della tavolozza: un gruppo di famiglie, con un assaggio vero. */
  function schedaGruppo(gruppo) {
    const cerchio = el('span', { class: `cerchio ${gruppo.tinta || tintaIcona(gruppo.icona)}` });
    cerchio.append(icona(gruppo.icona));
    return el('button', {
      type: 'button',
      class: 'scaffale',
      onclick: () => { gruppoAperto = gruppo.chiave; tutteLeNote = false; disegnaBanco(); },
    }, [
      cerchio,
      el('span', { class: 'testo' }, [
        el('span', { class: 'etichetta', testo: gruppo.etichetta }),
        // L'assaggio è calcolato sul catalogo di adesso: non promette note che non ci sono.
        el('span', { class: 'quante', testo: gruppo.assaggio.join(', ') }),
      ]),
    ]);
  }

  /**
   * "Tutta la famiglia": più larga della nota singola, perché prende anche chi
   * quella nota non ce l'ha scritta ma di quella famiglia sa lo stesso. Sta sotto
   * le note e sotto un titolo suo, altrimenti la famiglia «ambra» e la nota
   * «ambra» sembrano la stessa scheda scritta due volte.
   */
  function schedaFamiglia(famiglia) {
    const stato = scelto('accordo', famiglia.chiave);
    return el('button', {
      type: 'button',
      class: `chip grande${stato ? ` ${stato === 'scelto' ? 'scelto' : 'tolto'}` : ''}`,
      'aria-pressed': stato ? 'true' : 'false',
      onclick: () => tocca('accordo', famiglia.chiave),
    }, [
      famiglia.etichetta,
      el('span', { class: 'livello', testo: conModello(T().quante || '{n}', { n: famiglia.quante }) }),
    ]);
  }

  function schedaNota(nota) {
    const stato = scelto('nota', nota.chiave);
    const spiegazione = spiegazioni().get(nota.chiave);
    return el('button', {
      type: 'button',
      class: `nota${stato ? ` ${stato}` : ''}`,
      'aria-pressed': stato ? 'true' : 'false',
      onclick: () => tocca('nota', nota.chiave),
    }, [
      el('span', { class: 'nome', testo: nota.nome }),
      spiegazione ? el('span', { class: 'spiegazione', testo: spiegazione }) : null,
      el('span', { class: 'quante', testo: conModello(T().quante || '{n} profumi', { n: nota.quante }) }),
    ]);
  }

  function vistaGruppo(chiave) {
    const gruppo = indice().gruppi.find((g) => g.chiave === chiave);
    if (!gruppo) { gruppoAperto = null; return [el('p', { class: 'vuoto', testo: 'Questo gruppo non c\'è più.' })]; }

    return [
      el('div', { class: 'dentro-famiglia' }, [
        el('div', { class: 'occhiello' }, [
          el('button', {
            type: 'button', class: 'torna',
            onclick: () => { gruppoAperto = null; tutteLeNote = false; disegnaBanco(); },
          }, `← ${T().torna || 'Tutte le famiglie'}`),
          el('span', { testo: gruppo.etichetta }),
        ]),
        el('h2', { testo: T().dentro || 'Quale ti piace di più?' }),
        el('div', { class: 'note-scelte' }, (tutteLeNote ? gruppo.tutte : gruppo.note).map(schedaNota)),
        // Le note oltre la dozzina non sono irraggiungibili: sono un tocco più in là.
        gruppo.altre && !tutteLeNote
          ? el('div', { class: 'azioni' }, [el('button', {
            type: 'button', class: 'grande',
            onclick: () => { tutteLeNote = true; disegnaBanco(); },
          }, conModello(T().vediTutte || 'Vedi tutte le {n} note', { n: gruppo.tutte.length }))])
          : null,
        gruppo.rare
          ? el('p', { class: 'nota-rara', testo: conModello(T().altre || 'Altre {n} note più rare.', { n: gruppo.rare }) })
          : null,
        el('p', { class: 'occhiello largo', testo: T().tutta || 'Oppure prendi tutta una famiglia' }),
        el('div', { class: 'chips famiglie-intere' }, gruppo.famiglie.map(schedaFamiglia)),
      ]),
    ];
  }

  function disegnaBanco() {
    const corpo = svuota(riferimenti.banco);
    if (gruppoAperto) {
      corpo.append(...vistaGruppo(gruppoAperto));
    } else {
      const massimo = impostazioni(config()).massimoScelte;
      corpo.append(el('h2', { testo: modoTolgo ? (T().titoloTolgo || 'C\'è qualcosa che non sopporti?') : (T().titolo || 'Che odore ti piace?') }));
      corpo.append(el('p', { class: 'sottotitolo', testo: modoTolgo
        ? (T().sottoTolgo || '')
        : conModello(T().sotto || '', { max: massimo }) }));
      corpo.append(el('div', { class: 'scaffali' }, indice().gruppi.map(schedaGruppo)));
    }
    aggiornaCesto();
    // Scegliere una nota non deve far saltare la lista in cima: si torna su solo
    // quando si passa da una schermata all'altra.
    const vista = `${gruppoAperto || 'tavolozza'}|${tutteLeNote}`;
    if (vista !== vistaDisegnata) {
      corpo.scrollTop = 0;
      corpo.focus({ preventScroll: true });
      vistaDisegnata = vista;
    }
  }

  // ----------------------------------------------------------------- il cesto

  function chipScelta(tipo, chiave, etichetta, tolto) {
    return el('button', {
      type: 'button',
      class: `chip${tolto ? ' tolto' : ''}`,
      title: 'Tocca per toglierlo',
      onclick: () => {
        const dove = tolto ? (tipo === 'accordo' ? 'escludi' : 'escludiNote') : (tipo === 'accordo' ? 'accordi' : 'note');
        criteri[dove] = criteri[dove].filter((c) => c !== chiave);
        // Tolta l'ultima scelta non si resta davanti a una lista vuota: si torna
        // al banco, che è il posto dove si sceglie.
        if (schermoTrovati() && !quanteScelte()) { gruppoAperto = null; vaiA('ricerca'); disegnaBanco(); return; }
        if (schermoTrovati()) mostraTrovati(); else disegnaBanco();
      },
    }, etichetta);
  }

  const schermoTrovati = () => !$('#trovati').hidden;

  /** L'etichetta di un filtro acceso, per la chip e per le frasi. */
  function etichettaFiltro(gruppo) {
    const p = parole();
    if (gruppo === 'genere') return { uomo: p.lui, donna: p.lei }[criteri.genere] || criteri.genere;
    return { leggera: p.leggera, media: p.media, decisa: p.decisa }[criteri.intensita] || criteri.intensita;
  }

  function chipFiltroScelto(gruppo) {
    return el('button', {
      type: 'button', class: 'chip filtro-scelto', title: 'Tocca per toglierlo',
      onclick: () => {
        criteri[gruppo] = null;
        if (schermoTrovati()) mostraTrovati(); else disegnaBanco();
      },
    }, etichettaFiltro(gruppo));
  }

  /**
   * Le chip di quello che si è scelto, in ordine: prima i voluti, poi i veti.
   * Sul banco entrano anche i filtri accesi sui risultati: lì non si vedono da
   * nessuna parte, e un filtro invisibile che azzera la lista è un vicolo cieco.
   */
  function chipDelleScelte({ conFiltri = false } = {}) {
    const fuori = [];
    for (const chiave of criteri.accordi) {
      fuori.push(chipScelta('accordo', chiave, etichettaCriterio({ tipo: 'accordo', chiave }, config()), false));
    }
    for (const chiave of criteri.note) fuori.push(chipScelta('nota', chiave, nomeNota(chiave), false));
    for (const chiave of criteri.escludi) {
      fuori.push(chipScelta('accordo', chiave, etichettaCriterio({ tipo: 'accordo', chiave }, config()), true));
    }
    for (const chiave of criteri.escludiNote) fuori.push(chipScelta('nota', chiave, nomeNota(chiave), true));
    if (conFiltri) {
      if (criteri.genere) fuori.push(chipFiltroScelto('genere'));
      if (criteri.intensita) fuori.push(chipFiltroScelto('intensita'));
    }
    return fuori;
  }

  function aggiornaCesto() {
    svuota(riferimenti.chip).append(...chipDelleScelte({ conFiltri: true }));
    riferimenti.tolgo.textContent = modoTolgo ? (cesto().tolgoAttivo || 'Sto togliendo') : (cesto().tolgo || 'Non lo voglio');
    riferimenti.tolgo.setAttribute('aria-pressed', modoTolgo ? 'true' : 'false');

    const cerca_ = quanteScelte() ? cerca(criteri, dammiProfili(), config()) : null;
    const quanti = cerca_ ? cerca_.risultati.length : 0;
    riferimenti.vedi.disabled = !cerca_ || !quanti;
    
    riferimenti.vedi.textContent = cesto().vedi || 'Vedi i profumi';

    if (!quanteScelte()) {
      riferimenti.conto.textContent = modoTolgo
        ? (cesto().tolgoAvviso || '')
        : (cesto().vuoto || 'Tocca una famiglia per cominciare.');
      return;
    }
    // Ha detto solo quello che non vuole: da solo non basta a cercare, e va detto
    // con una frase che indica la mossa successiva, non con un "niente risultati".
    if (!cerca_.criteri) {
      riferimenti.conto.textContent = cesto().soloVeti || '';
      return;
    }
    if (!quanti) {
      // Se sono i filtri a chiudere la lista, si dice quale: "prova a togliere
      // qualcosa" davanti a un filtro invisibile non è un aiuto.
      const senzaFiltri = (criteri.genere || criteri.intensita)
        && cerca({ ...criteri, genere: null, intensita: null }, dammiProfili(), config()).risultati.length;
      const colpevole = senzaFiltri
        ? etichettaFiltro(criteri.intensita ? 'intensita' : 'genere')
        : null;
      riferimenti.conto.textContent = colpevole
        ? conModello(cesto().filtroChiude || '', { filtro: colpevole })
        : (cesto().niente || 'Con queste scelte non resta niente.');
      return;
    }
    // Si contano quelle che hanno almeno una delle cose chieste: le altre stanno in
    // lista solo per somiglianza di famiglia, e prometterle qui sarebbe gonfiare il numero.
    const conQualcosa = cerca_.risultati.filter((r) => r.presi > 0).length;
    const somiglianti = quanti - conQualcosa;
    // Con un criterio solo "chi ne ha una parte" non esiste: o ce l'hanno o ci
    // somigliano, ed è quella la seconda metà della frase.
    const altri = cerca_.criteri <= 1 ? somiglianti : conQualcosa - cerca_.pieni;
    let modello;
    if (!cerca_.pieni) modello = cesto().tantiNiente || '';
    else if (cerca_.criteri <= 1) modello = altri ? (cesto().unoParziale || '') : (cesto().uno || '');
    else modello = altri ? (cesto().tanti || '') : (cesto().uno || '');
    riferimenti.conto.textContent = conModello(modello, {
      profumi: quantiProfumi(cerca_.pieni || conQualcosa),
      tutti: conQualcosa,
      pieni: cerca_.pieni,
      altri,
    });
  }

  // ------------------------------------------------- i profumi trovati (schermo 2)

  function pastigliaNota(nome, classe, aggiungibile) {
    if (!aggiungibile) return el('span', { class: `pastiglia-nota${classe}`, testo: nome });
    return el('button', {
      type: 'button',
      class: `pastiglia-nota${classe}`,
      title: esiti().aggiungi || 'Tocca per cercare chi ce l\'ha',
      onclick: (e) => {
        e.stopPropagation();
        // La piramide scrive la nota come sta sulla card ("rosa bulgara", "tè"),
        // il cassetto la manda già risolta ("rosa", "te"): senza passare dalla
        // stessa identità la stessa nota diventerebbe due criteri, e il tocco su
        // una pastiglia già accesa la aggiungerebbe invece di toglierla.
        tocca('nota', chiaveDiNota(nome, config()));
      },
    }, nome);
  }

  function disegnaPiramide(profilo, { aggiungibile = true } = {}) {
    const righe = piramide(profilo, criteri, config());
    return el('div', { class: 'piramide' }, righe.map((riga) => el('div', { class: 'fila' }, [
      el('span', { class: 'nome', testo: FILE[riga.fila] || riga.fila }),
      ...riga.note.map((n) => pastigliaNota(
        n.nome,
        n.voluta ? ' voluta' : (n.accordo ? ' affine' : ''),
        aggiungibile,
      )),
    ])));
  }

  function misura(nome, valore) {
    const punti = el('span', { class: 'punti' });
    for (let i = 1; i <= 5; i++) punti.append(el('i', { class: i <= Math.round(valore || 0) ? 'acceso' : '' }));
    return el('div', { class: 'misura' }, [el('span', { class: 'nome', testo: nome }), punti]);
  }

  function apriScheda(profilo) {
    const famiglia = etichettaFamiglia(profilo.famiglia, config());
    const s = schedaTesti();
    const righe = piramide(profilo, criteri, config());
    svuota(riferimenti.dialogoCorpo).append(el('div', { class: 'scheda-piena' }, [
      el('div', { class: 'codice', testo: profilo.codice }),
      el('p', { class: 'muted piccolo-testo', testo: `${famiglia.etichetta}${famiglia.semplice ? ` · ${famiglia.semplice}` : ''}` }),
      el('div', { class: 'piramide-piena' }, righe.map((riga) => el('div', { class: 'fila-piena' }, [
        el('span', { class: 'nome', testo: s[riga.fila] || FILE[riga.fila] || riga.fila }),
        el('div', { class: 'fila' }, riga.note.map((n) => pastigliaNota(
          n.nome, n.voluta ? ' voluta' : (n.accordo ? ' affine' : ''), false,
        ))),
      ]))),
      el('div', { class: 'misure' }, ATTRIBUTI.map((a) => misura(s[a] || a, profilo[a]))),
      profilo.descrizione ? el('p', { class: 'descrizione', testo: profilo.descrizione }) : null,
      el('p', { class: 'banco-invito', testo: conModello(s.chiedi || 'Al banco chiedi il codice {codice}.', { codice: profilo.codice }) }),
    ]));
    if (typeof riferimenti.dialogo.showModal === 'function') riferimenti.dialogo.showModal();
    if (allaScheda) allaScheda(profilo.codice);
  }

  /** Il dettaglio tecnico, solo per chi sta al banco: tocco lungo sulla scheda. */
  function dettaglioBanco(risultato, quantiCriteri) {
    const p = risultato.profilo;
    const trovate = risultato.trovate
      .map((t) => (t.tipo === 'nota' ? `${t.nome} (${t.fila})` : etichettaCriterio(t, config())))
      .join(', ');
    svuota(riferimenti.dialogoCorpo).append(
      el('h2', { testo: `Codice ${p.codice}` }),
      el('p', { class: 'muted piccolo-testo', testo: `${p.famiglia} · ${p.sottofamiglia} · confidenza ${p.confidenza}` }),
      el('p', { class: 'piccolo-testo', testo: `Punteggio ${risultato.punteggio.toFixed(3)} · ${risultato.presi} criteri presi su ${quantiCriteri}${risultato.pieno ? ' (tutti)' : ''}` }),
      el('p', { class: 'piccolo-testo muted', testo: `Trovato per: ${trovate || 'somiglianza di famiglia'}` }),
    );
    if (typeof riferimenti.dialogo.showModal === 'function') riferimenti.dialogo.showModal();
  }

  function schedaTrovato(risultato, quantiCriteri) {
    const p = risultato.profilo;
    const famiglia = etichettaFamiglia(p.famiglia, config());
    const scheda = el('article', { class: `scheda-trovato${risultato.pieno ? '' : ' parziale'}` }, [
      el('div', { class: 'colonna-codice' }, [
        el('div', { class: 'codice', testo: p.codice }),
        el('div', { class: 'famiglia', testo: famiglia.etichetta }),
      ]),
      disegnaPiramide(p),
      p.descrizione ? el('p', { class: 'descrizione', testo: p.descrizione }) : null,
      el('button', {
        type: 'button', class: 'apri',
        onclick: () => apriScheda(p),
      }, 'Guarda la scheda'),
    ]);
    toccoLungo(scheda, 900, () => dettaglioBanco(risultato, quantiCriteri));
    return scheda;
  }

  function fascia(chiave, titolo, elenco, esito) {
    const quanti = mostrati.get(chiave) || impostazioni(config()).quantiRisultati;
    const visibili = elenco.slice(0, quanti);
    const nodo = el('section', { class: 'fascia' }, [
      el('h3', {}, [titolo, el('b', { testo: String(elenco.length) })]),
      el('div', { class: 'schede-trovate' }, visibili.map((r) => schedaTrovato(r, esito.criteri))),
    ]);
    if (elenco.length > visibili.length) {
      nodo.append(el('div', { class: 'azioni mostra-altri' }, [
        el('button', {
          type: 'button',
          onclick: () => {
            mostrati.set(chiave, quanti + impostazioni(config()).quantiRisultati);
            mostraTrovati({ tieniMostrati: true });
          },
        }, `${esiti().altri || 'Mostrane altri'} (${elenco.length - visibili.length})`),
      ]));
    }
    return nodo;
  }

  function chipFiltro(gruppo, valore, etichetta, quante) {
    const attivo = criteri[gruppo] === valore;
    return el('button', {
      type: 'button',
      class: attivo ? 'scelto' : '',
      disabled: !attivo && quante === 0,
      onclick: () => { criteri[gruppo] = valore; mostraTrovati(); },
    }, [etichetta, el('span', { class: 'quante', testo: String(quante) })]);
  }

  /**
   * Quante ne resterebbero con quel filtro. Si contano solo quelle che hanno
   * almeno una delle cose chieste: le "ci somigliano" la schermata le nasconde
   * quando sopra c'è abbastanza roba, e un numero che promette più di quello che
   * si vede è peggio di nessun numero.
   */
  function quanteCon(cambio) {
    return cerca({ ...criteri, ...cambio }, dammiProfili(), config())
      .risultati.filter((r) => r.presi > 0).length;
  }

  function disegnaFiltri() {
    const p = parole();
    const contenitore = svuota(riferimenti.filtri);
    contenitore.append(el('div', { class: 'filtro' }, [
      el('span', { class: 'nome', testo: p.genere || 'Per chi' }),
      chipFiltro('genere', null, p.tutti || 'Per chiunque', quanteCon({ genere: null })),
      chipFiltro('genere', 'uomo', p.lui || 'Per lui', quanteCon({ genere: 'uomo' })),
      chipFiltro('genere', 'donna', p.lei || 'Per lei', quanteCon({ genere: 'donna' })),
    ]));
    contenitore.append(el('div', { class: 'filtro' }, [
      el('span', { class: 'nome', testo: p.intensita || 'Quanto si fa sentire' }),
      chipFiltro('intensita', null, p.qualsiasi || 'Come viene', quanteCon({ intensita: null })),
      chipFiltro('intensita', 'leggera', p.leggera || 'Discreto', quanteCon({ intensita: 'leggera' })),
      chipFiltro('intensita', 'media', p.media || 'Medio', quanteCon({ intensita: 'media' })),
      chipFiltro('intensita', 'decisa', p.decisa || 'Deciso', quanteCon({ intensita: 'decisa' })),
    ]));
  }

  /** Le scelte vere, in una stringa: i filtri non entrano, non sono una domanda nuova. */
  function firmaCriteri() {
    return [
      [...criteri.accordi].sort().join(','), [...criteri.note].sort().join(','),
      [...criteri.escludi].sort().join(','), [...criteri.escludiNote].sort().join(','),
    ].join('|');
  }

  /**
   * La statistica si segna quando cambia la domanda del cliente, non a ogni
   * ridisegno: toccare tre filtri di fila non è cercare tre volte la stessa nota,
   * e il backoffice legge quella tabella come "cosa chiede la clientela".
   */
  function segnaSeNuova(esito) {
    const firma = firmaCriteri();
    if (!allaRicerca || firma === firmaSegnata || !esito.criteri) return;
    firmaSegnata = firma;
    // Chi affina la ricerca aggiungendo una nota non deve far contare due volte
    // quelle che aveva già chiesto: una persona, una volta per ogni cosa chiesta.
    const nuove = (elenco) => elenco.filter((chiave) => {
      if (chiaviSegnate.has(chiave)) return false;
      chiaviSegnate.add(chiave);
      return true;
    });
    allaRicerca({
      accordi: nuove(criteri.accordi),
      note: nuove(criteri.note),
      escludi: nuove(criteri.escludi),
      escludiNote: nuove(criteri.escludiNote),
    }, { quanti: esito.risultati.length, pieni: esito.pieni });
  }

  function mostraTrovati({ tieniMostrati = false } = {}) {
    if (!tieniMostrati) mostrati = new Map();
    // Senza più nessuna scelta non c'è niente da mostrare: si torna al banco.
    if (!quanteScelte()) { gruppoAperto = null; vaiA('ricerca'); disegnaBanco(); return; }
    const esito = cerca(criteri, dammiProfili(), config());
    const e = esiti();

    riferimenti.titolo.textContent = e.titolo || 'I profumi con le tue note';
    riferimenti.sotto.textContent = e.sotto || '';
    riferimenti.invito.textContent = e.banco || '';
    svuota(riferimenti.scelte).append(...chipDelleScelte());
    disegnaFiltri();
    segnaSeNuova(esito);

    const elenco = svuota(riferimenti.elenco);
    if (!esito.risultati.length) {
      riferimenti.avviso.hidden = true;
      const senzaFiltri = (criteri.genere || criteri.intensita)
        && cerca({ ...criteri, genere: null, intensita: null }, dammiProfili(), config()).risultati.length;
      elenco.append(el('div', { class: 'vuoto' }, [
        el('h3', { testo: e.vuoto || 'Con queste scelte non resta niente.' }),
        el('p', { testo: senzaFiltri
          ? conModello(cesto().filtroChiude || '', { filtro: etichettaFiltro(criteri.intensita ? 'intensita' : 'genere') })
          : (cesto().niente || '') }),
      ]));
      return;
    }

    // Se nessuno ha tutto quello che è stato chiesto, lo si dice prima dell'elenco,
    // con il numero che spiega perché: è l'onestà che il percorso guidato ha già.
    const piuRaro = [...esito.daSoli].sort((a, b) => a.quante - b.quante)[0];
    const serveAvviso = esito.criteri > 1 && esito.pieni === 0 && piuRaro;
    riferimenti.avviso.hidden = !serveAvviso;
    if (serveAvviso) {
      const suo = piuRaro.tipo === 'nota'
        ? nomeNota(piuRaro.chiave)
        : etichettaCriterio({ tipo: 'accordo', chiave: piuRaro.chiave }, config());
      riferimenti.avviso.textContent = conModello(e.consiglio || '', {
        chiave: suo, profumi: quantiProfumi(piuRaro.quante), quante: piuRaro.quante,
      });
    }

    // Fasce: prima chi ha tutto, poi chi ne ha una parte, in ordine decrescente.
    const perPresi = new Map();
    for (const risultato of esito.risultati) {
      const chiave = risultato.presi;
      if (!perPresi.has(chiave)) perPresi.set(chiave, []);
      perPresi.get(chiave).push(risultato);
    }
    // Chi non ha niente di quello che è stato chiesto entra solo se sopra non c'è
    // abbastanza: centoventi "ci somigliano" dietro a quattro risposte giuste sono
    // rumore, ma quando le risposte giuste sono due servono davvero.
    const conQualcosa = [...perPresi.entries()]
      .filter(([presi]) => presi > 0)
      .reduce((somma, [, dentro]) => somma + dentro.length, 0);
    if (conQualcosa >= impostazioni(config()).quantiRisultati) perPresi.delete(0);

    for (const presi of [...perPresi.keys()].sort((a, b) => b - a)) {
      const dentro = perPresi.get(presi);
      let titolo;
      if (presi === esito.criteri) {
        titolo = esito.criteri === 1 ? (e.tutteUno || 'Hanno quello che hai chiesto') : (e.tutte || 'Hanno tutto quello che hai chiesto');
      } else if (presi === 0) {
        titolo = e.somiglianti || 'Ci somigliano';
      } else {
        titolo = conModello(e.parziale || 'Ne hanno {presi} su {tot}', {
          presi: aParole(presi), tot: aParole(esito.criteri),
        });
      }
      elenco.append(fascia(`p${presi}`, titolo, dentro, esito));
    }

  }

  // ------------------------------------------------------------------ eventi

  riferimenti.tolgo.addEventListener('click', () => {
    modoTolgo = !modoTolgo;
    if (modoTolgo) toast(cesto().tolgoAvviso || 'Adesso quello che tocchi lo togliamo dalla ricerca.');
    disegnaBanco();
  });
  riferimenti.vedi.addEventListener('click', () => {
    if (!quanteScelte()) return;
    vaiA('trovati');
    mostraTrovati();
  });
  $('#trovati-cambia').addEventListener('click', () => {
    // Si torna alla tavolozza, non dentro l'ultimo cassetto: quello che si è già
    // scelto è nel cesto, e da qui si riparte per aggiungere un'altra cosa.
    gruppoAperto = null;
    vaiA('ricerca');
    disegnaBanco();
  });
  $('#trovati-ricomincia').addEventListener('click', () => allUscita && allUscita());
  $('#esci-ricerca').addEventListener('click', () => allUscita && allUscita());
  $('#esci-trovati').addEventListener('click', () => allUscita && allUscita());
  // Il dialogo della scheda è lo stesso dei risultati del percorso guidato: la
  // chiusura è già collegata lì, ma questo modulo deve reggere anche da solo.
  $('#dlg-scheda-chiudi').addEventListener('click', () => riferimenti.dialogo.close());

  return {
    /** Si riparte sempre puliti: le note del cliente prima non le vede il dopo. */
    avvia() {
      criteri = vuoti();
      gruppoAperto = null;
      modoTolgo = false;
      mostrati = new Map();
      indiceCache = null;
      spiegazioniCache = null;
      firmaSegnata = null;
      chiaviSegnate.clear();
      disegnaBanco();
    },
    criteri: () => ({ ...criteri }),
    ferma() { if (riferimenti.dialogo.open) riferimenti.dialogo.close(); },
  };
}

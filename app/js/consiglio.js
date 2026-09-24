// Il terzo percorso del chiosco (docs/13-consulente.md): il cliente racconta a
// parole — scrivendo, a voce, o toccando gli spunti — e riceve tre codici con il
// perché scritto sulla piramide. Come esplora.js con ricerca.js, questo modulo non
// conosce il motore: chiede a interpreta.js e consulente.js e disegna quello che torna.
//
// Due schermate: #racconto (si racconta) e #consigli (i tre codici).
// Niente di quello che il cliente scrive o dice viene salvato: alle statistiche
// arrivano solo le chiavi delle scene capite (regola 4, e regola 1: una frase
// libera potrebbe contenere un nome commerciale).

import { $, el, svuota, toast, toccoLungo } from './ui.js';
import { icona } from './icone.js';
import { interpreta, haSostanza } from './interpreta.js';
import { consiglia } from './consulente.js';

const FILE = { testa: 'Testa', cuore: 'Cuore', fondo: 'Fondo' };

/** "il bosco d'inverno" → "bosco d'inverno": sulle chip l'articolo è rumore. */
function senzaArticolo(testo) {
  return String(testo || '').replace(/^(il|lo|la|i|gli|le|un|uno|una)\s+|^(l|un)['’]\s*/i, '');
}

function conModello(testo, valori) {
  return String(testo || '').replace(/\{(\w+)\}/g, (_, k) => (k in valori ? valori[k] : `{${k}}`));
}

/** Il riconoscimento vocale del browser, se c'è (Safari lo chiama webkitSpeechRecognition). */
function riconoscitore() {
  const Classe = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

export function creaConsiglio({
  dammiConfig, dammiTesti, dammiProfili, dammiPronto, vaiA, allUscita, alConsulto, allaGuida,
}) {
  const config = () => dammiConfig();
  const T = () => dammiTesti().consulente || {};
  const R = () => T().risultati || {};

  const riferimenti = {
    titolo: $('#racconto-titolo'),
    sotto: $('#racconto-sotto'),
    frase: $('#frase'),
    microfono: $('#microfono'),
    microfonoTesto: $('#microfono-testo'),
    messaggio: $('#racconto-messaggio'),
    guida: $('#racconto-guida'),
    guidaTesto: $('#racconto-guida-testo'),
    guidaVai: $('#racconto-guida-vai'),
    spuntiTitolo: $('#spunti-titolo'),
    spunti: $('#spunti'),
    cancella: $('#frase-cancella'),
    vai: $('#frase-vai'),
    esitoTitolo: $('#consigli-titolo'),
    esitoSotto: $('#consigli-sotto'),
    capito: $('#consigli-capito'),
    avviso: $('#consigli-avviso'),
    schede: $('#consigli-schede'),
    banco: $('#consigli-banco'),
    riserva: $('#consigli-riserva'),
    cambia: $('#consigli-cambia'),
    ricomincia: $('#consigli-ricomincia'),
    dialogo: $('#dlg-scheda'),
    dialogoCorpo: $('#dlg-scheda-corpo'),
  };

  let tolte = new Set();       // le scene che il cliente ha tolto toccandone la chip
  let esito = null;
  let riservaMostrata = false;
  let ascolto = null;          // il riconoscimento in corso, se c'è
  let testoPrimaDellaVoce = '';
  let fraseContata = null;     // l'ultima frase finita nelle statistiche

  // -------------------------------------------------------------- racconto

  function mostraMessaggio(testo, { guida = false } = {}) {
    riferimenti.messaggio.textContent = testo || '';
    riferimenti.messaggio.hidden = !testo;
    // Chi non sa da dove partire ("sorprendimi", "non saprei") non va lasciato
    // davanti a un riquadro vuoto: la porta delle domande è fatta apposta per lui.
    riferimenti.guida.hidden = !guida || !allaGuida;
    riferimenti.guidaTesto.textContent = T().guida || '';
    riferimenti.guidaVai.textContent = T().guidaPulsante || 'Rispondi a qualche domanda';
  }

  function aggiungi(pezzo) {
    const attuale = riferimenti.frase.value.trim().replace(/[,.]\s*$/, '');
    riferimenti.frase.value = attuale ? `${attuale}, ${pezzo}` : pezzo;
    mostraMessaggio('');
  }

  function disegnaSpunti() {
    const spunti = ((config().consulente || {}).spunti) || [];
    riferimenti.spuntiTitolo.textContent = T().spunti || 'Oppure componi toccando';
    const contenitore = svuota(riferimenti.spunti);
    for (const gruppo of spunti) {
      contenitore.append(el('div', { class: 'gruppo-spunti' }, [
        el('span', { class: 'titolo-spunti', testo: gruppo.titolo }),
        el('div', { class: 'chips' }, (gruppo.voci || []).map((voce) => el('button', {
          type: 'button', class: 'chip spunto', onclick: () => aggiungi(voce),
        }, voce))),
      ]));
    }
  }

  function scriviTesti() {
    riferimenti.titolo.textContent = T().titolo || 'Raccontami che profumo cerchi';
    riferimenti.sotto.textContent = T().sotto || '';
    riferimenti.frase.placeholder = T().segnaposto || '';
    riferimenti.cancella.textContent = T().cancella || 'Cancella';
    riferimenti.vai.textContent = T().vai || 'Trova i profumi';
    riferimenti.microfonoTesto.textContent = T().parla || 'Parla';
    const cerchio = riferimenti.microfono.querySelector('[data-icona]');
    if (cerchio && !cerchio.firstChild) cerchio.append(icona(cerchio.dataset.icona));
  }

  // ------------------------------------------------------------------ voce

  function fermaAscolto() {
    if (ascolto) {
      try { ascolto.stop(); } catch { /* già fermo */ }
    }
  }

  function statoMicrofono(acceso) {
    riferimenti.microfono.classList.toggle('acceso', acceso);
    riferimenti.microfono.setAttribute('aria-pressed', acceso ? 'true' : 'false');
    riferimenti.microfonoTesto.textContent = acceso ? (T().fermaAscolto || 'Ho finito') : (T().parla || 'Parla');
  }

  function avviaAscolto() {
    if (ascolto) { fermaAscolto(); return; }
    const r = riconoscitore();
    if (!r) return;
    ascolto = r;
    r.lang = 'it-IT';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    testoPrimaDellaVoce = riferimenti.frase.value.trim().replace(/[,.]\s*$/, '');
    // Quello che si sente si scrive nel riquadro mentre si parla: il cliente vede
    // subito cosa è stato capito e può correggerlo con la tastiera.
    r.onresult = (evento) => {
      let detto = '';
      for (let i = 0; i < evento.results.length; i++) detto += evento.results[i][0].transcript;
      detto = detto.trim();
      riferimenti.frase.value = testoPrimaDellaVoce && detto ? `${testoPrimaDellaVoce}, ${detto}` : (testoPrimaDellaVoce || detto);
    };
    r.onerror = (evento) => {
      if (evento.error !== 'aborted' && evento.error !== 'no-speech') mostraMessaggio(T().erroreVoce || '');
    };
    r.onend = () => { ascolto = null; statoMicrofono(false); };
    try {
      r.start();
      statoMicrofono(true);
      mostraMessaggio(T().ascolto || '');
    } catch {
      ascolto = null;
      mostraMessaggio(T().erroreVoce || '');
    }
  }

  // ------------------------------------------------------------- consigli

  function etichettaCapita(c) {
    const nome = senzaArticolo(c.nome || c.evoca);
    const modelli = T().modi || {};
    if (c.modo === 'si') return nome;
    return conModello(modelli[c.modo] || '{x}', { x: nome });
  }

  function calcola() {
    const testo = riferimenti.frase.value;
    const desiderio = interpreta(testo, dammiPronto(), { salta: tolte });
    const trovato = haSostanza(desiderio)
      ? consiglia(desiderio, dammiProfili(), config(), dammiPronto())
      : null;
    return { desiderio, trovato };
  }

  function vai() {
    fermaAscolto();
    const testo = riferimenti.frase.value.trim();
    if (!testo) { mostraMessaggio(T().vuota || ''); riferimenti.frase.focus(); return; }
    tolte = new Set();
    const { desiderio, trovato } = calcola();
    if (!trovato || !trovato.proposte.length) {
      const ignote = desiderio.ignorate.length
        ? ` ${conModello(T().ignote || '', { parole: desiderio.ignorate.map((p) => `«${p}»`).join(', ') })}` : '';
      const soloVeti = desiderio.capito.length > 0 && desiderio.capito.every((c) => c.modo === 'no' || c.modo === 'attenuato' || c.tipo === 'persona');
      if (soloVeti) mostraMessaggio(T().soloVeti || T().nonCapito || '');
      else mostraMessaggio(`${T().nonCapito || ''}${ignote}`, { guida: true });
      if (alConsulto && fraseContata !== testo) { fraseContata = testo; alConsulto(desiderio, null); }
      return;
    }
    if (alConsulto && fraseContata !== testo) { fraseContata = testo; alConsulto(desiderio, trovato); }
    mostraEsito(desiderio, trovato);
    vaiA('consigli');
  }

  function ricalcola() {
    const { desiderio, trovato } = calcola();
    mostraEsito(desiderio, trovato);
  }

  function disegnaCapito(desiderio) {
    const contenitore = svuota(riferimenti.capito);
    contenitore.append(el('span', { class: 'chip etichetta', testo: R().capito || 'Ho capito' }));
    for (const c of desiderio.capito) {
      contenitore.append(el('button', {
        type: 'button',
        class: `chip${c.modo === 'no' ? ' tolto' : ''}`,
        title: R().tocca || '',
        onclick: () => { tolte.add(c.chiave); ricalcola(); },
      }, etichettaCapita(c)));
    }
    // Quelle tolte restano, spente: toccandole tornano. Un cliente che toglie per
    // sbaglio non deve riscrivere la frase.
    for (const chiave of tolte) {
      const voce = dammiPronto().voci.get(chiave);
      if (!voce) continue;
      contenitore.append(el('button', {
        type: 'button', class: 'chip spenta',
        onclick: () => { tolte.delete(chiave); ricalcola(); },
      }, senzaArticolo((voce.forme && voce.forme[0]) || voce.evoca)));
    }
  }

  function disegnaPiramide(proposta) {
    return el('div', { class: 'piramide' }, proposta.piramide.map((riga) => el('div', { class: 'fila' }, [
      el('span', { class: 'nome', testo: FILE[riga.fila] || riga.fila }),
      ...riga.note.map((n) => el('span', {
        class: `pastiglia-nota${n.voluta ? ' voluta' : (n.accordo ? ' affine' : '')}`,
        testo: n.nome,
      })),
    ])));
  }

  function schedaProposta(proposta, { riserva = false } = {}) {
    const scheda = el('article', { class: `scheda-esito scheda-consiglio${riserva ? ' riserva' : ''}` }, [
      el('div', { class: 'codice', testo: proposta.codice }),
      el('div', { class: 'famiglia' }, [
        proposta.famigliaEtichetta || proposta.famiglia,
        proposta.famigliaSemplice ? el('span', { testo: proposta.famigliaSemplice }) : null,
      ]),
      el('ul', {}, proposta.motivi.map((m) => el('li', { testo: m }))),
      disegnaPiramide(proposta),
      proposta.descrizione ? el('p', { class: 'descrizione', testo: proposta.descrizione }) : null,
    ]);
    // Tocco lungo: il dettaglio per chi sta al banco, mai davanti al cliente.
    toccoLungo(scheda, 900, () => dettaglioBanco(proposta));
    return scheda;
  }

  function dettaglioBanco(proposta) {
    const d = proposta.dettaglio || {};
    const numero = (v) => (typeof v === 'number' ? v.toFixed(3) : '—');
    const riga = (etichetta, valore) => el('tr', {}, [el('td', { testo: etichetta }), el('td', { class: 'num', testo: valore })]);
    const desiderio = esito && esito.desiderio;
    svuota(riferimenti.dialogoCorpo).append(
      el('h2', { testo: `Codice ${proposta.codice}` }),
      el('p', { class: 'muted piccolo-testo', testo: `${proposta.famiglia} · ${proposta.sottofamiglia} · confidenza ${proposta.confidenza}` }),
      el('table', {}, [el('tbody', {}, [
        riga('Punteggio', numero(proposta.punteggio)),
        riga('Accordi', numero(d.accordi)),
        riga('Note', numero(d.note)),
        riga('Misure', numero(d.attributi)),
        riga('Contesto', numero(d.contesto)),
        riga('Carattere', numero(d.carattere)),
        riga('Veti colpiti', numero(d.esclusione)),
      ])]),
      desiderio ? el('p', { class: 'piccolo-testo muted', testo: `Scene: ${desiderio.capito.map((c) => `${c.chiave}${c.modo === 'si' ? '' : ` (${c.modo})`}`).join(', ')}` }) : null,
    );
    if (typeof riferimenti.dialogo.showModal === 'function') riferimenti.dialogo.showModal();
  }

  function mostraEsito(desiderio, trovato) {
    esito = trovato ? { ...trovato, desiderio } : { desiderio, proposte: [], riserva: null };
    riservaMostrata = false;
    const modo = desiderio.modo === 'regalo' ? 'regalo' : 'me';
    const testi = R()[modo] || {};
    riferimenti.esitoTitolo.textContent = testi.titolo || 'Tre profumi per quello che racconti';
    riferimenti.esitoSotto.textContent = testi.sotto || '';
    riferimenti.banco.textContent = R().banco || '';
    disegnaCapito(desiderio);

    const avvisi = [];
    const mancano = [...new Set(desiderio.capito.flatMap((c) => (c.modo === 'no' ? [] : c.manca || [])))];
    if (mancano.length) {
      const cose = mancano.length > 1 ? `${mancano.slice(0, -1).join(', ')} e ${mancano[mancano.length - 1]}` : mancano[0];
      avvisi.push(conModello(R().manca || '', { cose }));
    }
    if (desiderio.ignorate.length) {
      avvisi.push(conModello(T().ignote || '', { parole: desiderio.ignorate.map((p) => `«${p}»`).join(', ') }));
    }
    if (esito.allargato) avvisi.push(R().allargato || '');
    if (!esito.proposte.length) avvisi.push(R().tutteTolte || '');
    riferimenti.avviso.textContent = avvisi.filter(Boolean).join(' ');
    riferimenti.avviso.hidden = !riferimenti.avviso.textContent;

    const schede = svuota(riferimenti.schede);
    for (const proposta of esito.proposte) schede.append(schedaProposta(proposta));
    riferimenti.riserva.disabled = !esito.riserva;
  }

  function mostraRiserva() {
    if (!esito) return;
    if (!esito.riserva) { toast(R().riservaVuota || ''); return; }
    if (riservaMostrata) return;
    riservaMostrata = true;
    riferimenti.schede.append(schedaProposta(esito.riserva, { riserva: true }));
    riferimenti.riserva.disabled = true;
    riferimenti.schede.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ------------------------------------------------------------ collegamenti

  // Il microfono si mostra solo se il browser sa ascoltare: un pulsante che non
  // fa niente è peggio di nessun pulsante. Sull'iPad resta comunque la dettatura
  // della tastiera, che è dentro il riquadro.
  riferimenti.microfono.hidden = !(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
  riferimenti.microfono.addEventListener('click', avviaAscolto);
  riferimenti.cancella.addEventListener('click', () => {
    fermaAscolto();
    riferimenti.frase.value = '';
    mostraMessaggio('');
    riferimenti.frase.focus();
  });
  riferimenti.vai.addEventListener('click', vai);
  riferimenti.frase.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); vai(); }
  });
  riferimenti.frase.addEventListener('input', () => mostraMessaggio(''));
  riferimenti.riserva.addEventListener('click', mostraRiserva);
  riferimenti.guidaVai.addEventListener('click', () => { fermaAscolto(); if (allaGuida) allaGuida(); });
  riferimenti.cambia.addEventListener('click', () => { vaiA('racconto'); riferimenti.frase.focus(); });
  riferimenti.ricomincia.addEventListener('click', () => allUscita && allUscita());
  $('#esci-racconto').addEventListener('click', () => allUscita && allUscita());
  $('#esci-consigli').addEventListener('click', () => allUscita && allUscita());

  return {
    avvia() {
      scriviTesti();
      disegnaSpunti();
      riferimenti.frase.value = '';
      tolte = new Set();
      esito = null;
      fraseContata = null;
      mostraMessaggio('');
      riferimenti.riserva.textContent = R().riserva || 'Nessuno mi convince';
      riferimenti.cambia.textContent = R().cambia || 'Cambia la frase';
      riferimenti.ricomincia.textContent = R().ricomincia || 'Ricomincia';
      vaiA('racconto');
    },
    ferma() {
      fermaAscolto();
      // Il cliente dopo non deve trovare la frase di quello prima.
      riferimenti.frase.value = '';
      tolte = new Set();
    },
  };
}

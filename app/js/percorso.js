// Il percorso guidato del cliente (docs/05-percorso.md): una domanda per schermata,
// schede grandi, barra di avanzamento, tasto indietro sempre disponibile.
// Non conosce il motore: raccoglie risposte e, alla fine, le consegna a chi l'ha creato.

import { $, el, svuota, toast } from './ui.js';
import { icona, tintaIcona } from './icone.js';
import { elencoDomande } from './motore.js';

const ATTESA_AVANZAMENTO = 260; // il tempo di vedere la spunta prima di cambiare schermata

export function creaPercorso({ dammiConfig, dammiTesti, alTermine, allUscita, allaRisposta }) {
  const config = () => dammiConfig();
  const testi = () => dammiTesti();

  const riferimenti = {
    domanda: $('#domanda'),
    barra: $('#barra-piena'),
    passo: $('#passo'),
    indietro: $('#indietro'),
    avanti: $('#avanti'),
    salta: $('#salta'),
  };

  let risposte = {};
  let indice = 0;
  let indiceGioco = 0;
  let iniziatoIl = 0;
  let timerAvanzamento = null;

  // ------------------------------------------------------------- sequenza

  function domandeAttive() {
    return elencoDomande(config()).filter((d) => d.attiva !== false);
  }

  /** L'elenco delle domande da mostrare adesso: dipende dalle risposte già date. */
  function sequenza() {
    const tutte = domandeAttive();
    const giochi = tutte.filter((d) => d.gruppo === 'gioco');
    const gioco = giochi.length ? giochi[((indiceGioco % giochi.length) + giochi.length) % giochi.length] : null;
    const elenco = [];
    let giocoInserito = false;
    for (const domanda of tutte) {
      if (domanda.gruppo === 'gioco') {
        if (gioco && !giocoInserito) { elenco.push(gioco); giocoInserito = true; }
        continue;
      }
      if (domanda.soloSe) {
        const data = risposte[domanda.soloSe.domanda];
        const scelto = Array.isArray(data) ? data.includes(domanda.soloSe.valore) : data === domanda.soloSe.valore;
        if (!scelto) continue;
      }
      elenco.push(domanda);
    }
    return elenco;
  }

  const modoRegalo = () => risposte.per_chi === 'regalo';
  const pulsante = (id, difetto) => ((testi().pulsanti || {})[id]) || difetto;

  function titoloDi(domanda) {
    return (modoRegalo() && domanda.titoloRegalo) || domanda.titolo || '';
  }

  // ------------------------------------------------------------- risposte

  function valore(domanda) {
    return risposte[domanda.id];
  }

  function haRisposta(domanda) {
    const v = valore(domanda);
    if (v === undefined || v === null || v === '') return false;
    return Array.isArray(v) ? v.length > 0 : true;
  }

  function imposta(domanda, nuovo) {
    risposte[domanda.id] = nuovo;
    if (allaRisposta) allaRisposta(domanda.id, nuovo);
    // Cambiare "per me / regalo" cambia la sequenza: le risposte ormai fuori strada si buttano.
    if (domanda.tipo === 'filtro') {
      for (const altra of domandeAttive()) {
        if (!altra.soloSe || altra.soloSe.domanda !== domanda.id) continue;
        const ancoraValida = Array.isArray(nuovo) ? nuovo.includes(altra.soloSe.valore) : nuovo === altra.soloSe.valore;
        if (!ancoraValida) delete risposte[altra.id];
      }
    }
  }

  // ------------------------------------------------------------ disegno

  function schedaOpzione(domanda, opzione, scelta) {
    const cerchio = opzione.tinta
      ? el('span', { class: 'pastiglia', style: `background:${opzione.tinta}` })
      : el('span', { class: `cerchio ${tintaIcona(opzione.icona)}` }, [icona(opzione.icona)]);

    const spunta = el('span', { class: 'spunta' });
    spunta.append(icona('spunta'));

    return el('button', {
      type: 'button',
      class: `scheda-opzione${scelta ? ' scelta' : ''}`,
      'aria-pressed': scelta ? 'true' : 'false',
      dati: { opzione: opzione.id },
      onclick: () => scegli(domanda, opzione),
    }, [
      cerchio,
      el('span', { class: 'testo' }, [
        el('span', { class: 'etichetta', testo: opzione.etichetta }),
        opzione.dettaglio ? el('span', { class: 'dettaglio', testo: opzione.dettaglio }) : null,
      ]),
      spunta,
    ]);
  }

  function scegli(domanda, opzione) {
    if (domanda.tipo === 'singola' || domanda.tipo === 'filtro') {
      imposta(domanda, opzione.id);
      disegna();
      programmaAvanzamento();
      return;
    }
    // multipla ed esclusioni
    const attuali = [].concat(valore(domanda) || []);
    const dentro = attuali.includes(opzione.id);
    let nuovi;
    if (dentro) {
      nuovi = attuali.filter((id) => id !== opzione.id);
    } else if (opzione.esclusiva) {
      nuovi = [opzione.id];
    } else {
      const senzaEsclusive = attuali.filter((id) => {
        const o = domanda.opzioni.find((x) => x.id === id);
        return !(o && o.esclusiva);
      });
      const massimo = domanda.max || domanda.opzioni.length;
      if (senzaEsclusive.length >= massimo) {
        toast(massimo === 1 ? 'Puoi sceglierne una sola: tocca quella scelta per cambiarla.'
          : `Puoi sceglierne al massimo ${massimo === 2 ? 'due' : massimo}: tocca una scelta per toglierla.`);
        return;
      }
      nuovi = [...senzaEsclusive, opzione.id];
    }
    imposta(domanda, nuovi);
    disegna();
  }

  function corpoScala(domanda) {
    const scelto = valore(domanda);
    const tacche = domanda.tacche || [];
    const scala = el('div', { class: 'scala', role: 'radiogroup', 'aria-label': titoloDi(domanda) });
    for (const tacca of tacche) {
      scala.append(el('button', {
        type: 'button',
        class: `tacca${scelto === tacca.valore ? ' scelta' : ''}${scelto && tacca.valore < scelto ? ' sotto' : ''}`,
        role: 'radio',
        'aria-checked': scelto === tacca.valore ? 'true' : 'false',
        'aria-label': tacca.etichetta,
        onclick: () => { imposta(domanda, tacca.valore); disegna(); },
      }, [el('span', { class: 'punto' })]));
    }
    const corrente = tacche.find((t) => t.valore === scelto);
    return el('div', {}, [
      scala,
      el('div', { class: 'scala-estremi' }, [
        el('span', { testo: tacche.length ? tacche[0].etichetta : '' }),
        el('span', { testo: tacche.length ? tacche[tacche.length - 1].etichetta : '' }),
      ]),
      el('p', { class: 'scala-etichetta', testo: corrente ? corrente.etichetta : 'Tocca una tacca' }),
    ]);
  }

  function disegna() {
    const elenco = sequenza();
    if (indice >= elenco.length) { concludi(); return; }
    const domanda = elenco[indice];
    const corpo = svuota(riferimenti.domanda);

    corpo.append(el('h2', { testo: titoloDi(domanda) }));
    if (domanda.sottotitolo) corpo.append(el('p', { class: 'sottotitolo', testo: domanda.sottotitolo }));

    if (domanda.tipo === 'scala') {
      corpo.append(corpoScala(domanda));
    } else {
      const scelte = [].concat(valore(domanda) || []);
      const griglia = el('div', { class: `griglia${(domanda.opzioni || []).length > 9 ? ' larga' : ''}` });
      for (const opzione of domanda.opzioni || []) {
        griglia.append(schedaOpzione(domanda, opzione, scelte.includes(opzione.id)));
      }
      corpo.append(griglia);
    }

    // avanzamento e pulsanti
    const passo = indice + 1;
    riferimenti.barra.style.width = `${Math.round((passo - 1) / elenco.length * 100)}%`;
    riferimenti.passo.textContent = (testi().avanzamento || '{n} di {tot}')
      .replace('{n}', passo).replace('{tot}', elenco.length);
    riferimenti.indietro.textContent = pulsante('indietro', 'Indietro');
    riferimenti.avanti.textContent = pulsante('avanti', 'Avanti');
    riferimenti.salta.textContent = pulsante('salta', 'Salta');
    riferimenti.salta.hidden = !domanda.saltabile;
    riferimenti.avanti.disabled = !haRisposta(domanda) && !domanda.saltabile;
    riferimenti.domanda.scrollTop = 0;
    riferimenti.domanda.focus({ preventScroll: true });
  }

  // ------------------------------------------------------- navigazione

  function programmaAvanzamento() {
    clearTimeout(timerAvanzamento);
    timerAvanzamento = setTimeout(avanti, ATTESA_AVANZAMENTO);
  }

  function avanti() {
    clearTimeout(timerAvanzamento);
    const elenco = sequenza();
    if (indice + 1 >= elenco.length) { concludi(); return; }
    indice++;
    disegna();
  }

  function indietro() {
    clearTimeout(timerAvanzamento);
    if (indice === 0) { if (allUscita) allUscita('indietro'); return; }
    indice--;
    disegna();
  }

  function concludi() {
    clearTimeout(timerAvanzamento);
    riferimenti.barra.style.width = '100%';
    const secondi = iniziatoIl ? (Date.now() - iniziatoIl) / 1000 : 0;
    if (alTermine) alTermine({ ...risposte }, { secondi });
  }

  riferimenti.indietro.addEventListener('click', indietro);
  riferimenti.avanti.addEventListener('click', avanti);
  riferimenti.salta.addEventListener('click', () => {
    const elenco = sequenza();
    const domanda = elenco[indice];
    if (domanda) delete risposte[domanda.id];
    avanti();
  });

  return {
    avvia(daCapo = true, indiceGiocoScelto = 0) {
      if (daCapo) risposte = {};
      indice = 0;
      indiceGioco = indiceGiocoScelto;
      iniziatoIl = Date.now();
      clearTimeout(timerAvanzamento);
      disegna();
    },
    /** Torna alla domanda indicata (dalle chip del riepilogo dei risultati). */
    tornaA(idDomanda) {
      const elenco = sequenza();
      const posizione = elenco.findIndex((d) => d.id === idDomanda);
      if (posizione < 0) return false;
      indice = posizione;
      iniziatoIl = iniziatoIl || Date.now();
      disegna();
      return true;
    },
    domandaCorrente() {
      const elenco = sequenza();
      return elenco[indice] ? elenco[indice].id : null;
    },
    risposte: () => ({ ...risposte }),
    sequenza,
    ferma() { clearTimeout(timerAvanzamento); },
  };
}

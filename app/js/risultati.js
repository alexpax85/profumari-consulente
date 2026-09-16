// Schermata dei risultati (docs/05-percorso.md, punto 11): tre codici grandi con
// la motivazione, l'invito a provarli al banco, la riserva su richiesta e — con un
// tocco lungo, per il personale — il dettaglio del punteggio.

import { $, el, svuota, toccoLungo } from './ui.js';
import { elencoDomande } from './motore.js';

export function creaRisultati({ dammiConfig, dammiTesti, onRicomincia, onTornaA }) {
  const config = () => dammiConfig();
  const testi = () => dammiTesti();

  const riferimenti = {
    titolo: $('#esito-titolo'),
    sotto: $('#esito-sotto'),
    allargato: $('#esito-allargato'),
    schede: $('#schede'),
    banco: $('#esito-banco'),
    riepilogo: $('#riepilogo'),
    riserva: $('#riserva'),
    ricomincia: $('#ricomincia'),
    dialogo: $('#dlg-scheda'),
    dialogoCorpo: $('#dlg-scheda-corpo'),
  };

  let esitoCorrente = null;
  let riservaMostrata = false;

  function schedaProposta(proposta, { riserva = false } = {}) {
    const scheda = el('article', { class: `scheda-esito${riserva ? ' riserva' : ''}` }, [
      el('div', { class: 'codice', testo: proposta.codice }),
      el('div', { class: 'famiglia' }, [
        proposta.famigliaEtichetta || proposta.famiglia,
        proposta.famigliaSemplice ? el('span', { testo: proposta.famigliaSemplice }) : null,
      ]),
      el('ul', {}, (proposta.motivi || []).map((m) => el('li', { testo: m }))),
      proposta.descrizione ? el('p', { class: 'descrizione', testo: proposta.descrizione }) : null,
    ]);
    // Tocco lungo: dettaglio tecnico per chi sta al banco, mai visibile al cliente.
    toccoLungo(scheda, 900, () => mostraDettaglio(proposta));
    return scheda;
  }

  function mostraDettaglio(proposta) {
    const d = proposta.dettaglio || {};
    const riga = (etichetta, valore) => el('tr', {}, [
      el('td', { testo: etichetta }),
      el('td', { class: 'num', testo: valore }),
    ]);
    const numero = (v) => (typeof v === 'number' ? v.toFixed(3) : '—');
    svuota(riferimenti.dialogoCorpo).append(
      el('h2', { testo: `Codice ${proposta.codice}` }),
      el('p', { class: 'muted piccolo-testo', testo: `${proposta.famiglia} · ${proposta.sottofamiglia} · confidenza ${proposta.confidenza}` }),
      el('table', {}, [el('tbody', {}, [
        riga('Punteggio', numero(proposta.punteggio)),
        riga('Somiglianza degli accordi', numero(d.coseno)),
        riga('Attributi', numero(d.attributi)),
        riga('Contesto', numero(d.contesto)),
        riga('Carattere', numero(d.carattere)),
        riga('Veti colpiti', numero(d.esclusione)),
        riga('Penalità confidenza', numero(d.penalitaConfidenza)),
      ])]),
      el('p', { class: 'piccolo-testo muted', testo: `Accordi in comune: ${(proposta.accordiComuni || []).map((a) => a.etichetta).join(', ') || 'nessuno'}` }),
    );
    if (typeof riferimenti.dialogo.showModal === 'function') riferimenti.dialogo.showModal();
  }

  /** Le risposte date, come chip: toccarle riporta a quella domanda. */
  function disegnaRiepilogo(risposte) {
    const contenitore = svuota(riferimenti.riepilogo);
    const domande = elencoDomande(config());
    contenitore.append(el('span', { class: 'chip etichetta', testo: 'Hai scelto' }));
    for (const domanda of domande) {
      const valore = risposte[domanda.id];
      if (valore === undefined || valore === null || valore === '') continue;
      if (Array.isArray(valore) && !valore.length) continue;
      let etichetta;
      if (domanda.tipo === 'scala') {
        const tacca = (domanda.tacche || []).find((t) => t.valore === valore);
        etichetta = tacca ? tacca.etichetta : null;
      } else {
        etichetta = [].concat(valore)
          .map((id) => (domanda.opzioni || []).find((o) => o.id === id))
          .filter(Boolean).map((o) => o.etichetta).join(', ');
      }
      if (!etichetta) continue;
      contenitore.append(el('button', {
        type: 'button', class: 'chip',
        title: `Torna a: ${domanda.titolo}`,
        onclick: () => onTornaA && onTornaA(domanda.id),
      }, etichetta));
    }
  }

  function mostraRiserva() {
    if (!esitoCorrente) return;
    if (!esitoCorrente.riserva) {
      riferimenti.banco.textContent = (testi().riserva && testi().riserva.vuota) || 'Non abbiamo una quarta proposta.';
      return;
    }
    if (riservaMostrata) return;
    riservaMostrata = true;
    riferimenti.schede.append(schedaProposta(esitoCorrente.riserva, { riserva: true }));
    riferimenti.riserva.disabled = true;
    riferimenti.schede.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  riferimenti.riserva.addEventListener('click', mostraRiserva);
  riferimenti.ricomincia.addEventListener('click', () => onRicomincia && onRicomincia());
  $('#dlg-scheda-chiudi').addEventListener('click', () => riferimenti.dialogo.close());

  return {
    mostra(esito, risposte) {
      esitoCorrente = esito;
      riservaMostrata = false;

      const modo = esito.desiderato && esito.desiderato.modo === 'regalo' ? 'regalo' : 'me';
      const t = (testi().risultati && testi().risultati[modo]) || {};
      riferimenti.titolo.textContent = t.titolo || 'Tre profumi da provare';
      riferimenti.sotto.textContent = t.sottotitolo || '';
      riferimenti.banco.textContent = t.banco || '';

      const frasiAllargato = config().frasi && config().frasi.allargato;
      riferimenti.allargato.hidden = !esito.allargato;
      riferimenti.allargato.textContent = frasiAllargato || '';

      const schede = svuota(riferimenti.schede);
      if (!esito.proposte.length) {
        schede.append(el('div', { class: 'vuoto' }, [
          el('h3', { testo: (testi().vuoto && testi().vuoto.titolo) || 'Ci serve qualche risposta in più' }),
          el('p', { testo: (testi().vuoto && testi().vuoto.testo) || '' }),
        ]));
      } else {
        for (const proposta of esito.proposte) schede.append(schedaProposta(proposta));
      }

      riferimenti.riserva.disabled = !esito.riserva;
      riferimenti.riserva.textContent = (testi().pulsanti && testi().pulsanti.nessuno) || 'Nessuno mi convince';
      riferimenti.ricomincia.textContent = (testi().pulsanti && testi().pulsanti.ricomincia) || 'Ricomincia';
      disegnaRiepilogo(risposte || {});
    },
  };
}

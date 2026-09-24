// Avvio, router delle schermate, ripartenza automatica, accesso al banco.
// Tutto il resto sta nei moduli: motore.js (puro), percorso.js, risultati.js,
// backoffice.js, store-locale.js.

import { $, $$, toast, toccoLungo, mostra } from './ui.js';
import { caricaPredefiniti, aggiornaProfili, aggiornaConfig, VERSIONE_DATI } from './dati.js';
import { store, VERSIONE_STATO } from './store-locale.js';
import { creaPercorso } from './percorso.js';
import { creaEsplora } from './esplora.js';
import { creaConsiglio } from './consiglio.js';
import { preparaLessico } from './interpreta.js';
import { creaRisultati } from './risultati.js';
import { creaBackoffice } from './backoffice.js';
import { raccomanda, profiliAttivi } from './motore.js';
import { icona } from './icone.js';
import {
  nuoveStatistiche, segnaInizio, segnaCompletato, segnaAbbandono, segnaRisposta,
  segnaPercorso, segnaRicerca, segnaSchedaAperta, segnaConsulto,
} from './statistiche.js';

// La ricerca per note si legge: ci vuole più tempo di una domanda a schede.
// E chi racconta a parole ha bisogno del tempo di scrivere, o di pensarci.
const INATTIVITA = {
  scelta: 45_000, percorso: 60_000, risultati: 90_000, ricerca: 120_000, trovati: 120_000,
  racconto: 120_000, consigli: 120_000,
};

let stato = null;
let predefiniti = null;
let percorso = null;
let esplora = null;
let consiglio = null;
let lessicoPronto = null;   // il lessico preparato sul catalogo di adesso
let risultati = null;
let backoffice = null;
let schermo = 'attesa';
let timerInattivita = null;
let percorsoContato = false;

// ------------------------------------------------------------------ stato

const config = () => stato.config;
const testi = () => stato.config.testi;

/**
 * La ricerca per note ha bisogno anche di note.json, che di proposito non sta
 * dentro stato.config: sono 19 KB che finirebbero in localStorage a ogni
 * salvataggio e dentro ognuno dei dieci punti di ripristino (vedi dati.js).
 */
const configRicerca = () => ({ ...stato.config, note: predefiniti.note });

/**
 * Il lessico del consulente, pronto da usare: si prepara la prima volta che serve
 * e si rifà quando il catalogo cambia (all'uscita dal banco), perché riconosce
 * solo le note che le referenze attive hanno davvero.
 */
function lessico() {
  if (!lessicoPronto) lessicoPronto = preparaLessico(predefiniti.lessico, configRicerca(), profiliInGioco());
  return lessicoPronto;
}

function salva() {
  if (store.disponibile()) store.salva(stato);
}

async function preparaStato() {
  predefiniti = await caricaPredefiniti();
  const salvato = store.disponibile() ? store.carica() : null;

  if (salvato && Array.isArray(salvato.catalogo) && Array.isArray(salvato.profili)) {
    stato = salvato;
    // La configurazione si riallinea a ogni avvio: domande, frasi e accordi nuovi
    // arrivano anche su un chiosco già in uso, la taratura del negozio resta.
    const esitoConfig = aggiornaConfig(salvato.config || {}, predefiniti.config);
    stato.config = esitoConfig.config;
    if (esitoConfig.novita) {
      console.info(`Configurazione aggiornata: ${esitoConfig.domandeNuove} domande nuove, `
        + `${esitoConfig.domandeRiallineate} riallineate, ${esitoConfig.vociAggiunte} voci aggiunte.`);
    }
    stato.statistiche = salvato.statistiche || nuoveStatistiche();
    stato.indiceGioco = Number.isInteger(salvato.indiceGioco) ? salvato.indiceGioco : 0;
    // Profili di fabbrica più recenti di quelli sul dispositivo: la base avanza.
    // Il catalogo no: quello lo decide il negozio con l'import dal gestionale.
    if (!(Number(salvato.versioneDati) >= VERSIONE_DATI)) {
      if (store.disponibile()) store.creaPuntoRipristino(structuredClone(salvato), 'prima dei profili nuovi');
      const esito = aggiornaProfili(salvato.profili, predefiniti.profili);
      stato.profili = esito.profili;
      stato.versioneDati = VERSIONE_DATI;
      if (store.disponibile()) store.salvaSubito(stato);
      console.info(`Profili portati alla base ${VERSIONE_DATI}: ${esito.sostituiti} aggiornati, `
        + `${esito.nuovi} nuovi, ${esito.confermati} confermati dal personale lasciati com'erano.`);
    }
    return;
  }

  // Copia, non riferimento: quello che il negozio modifica non deve sporcare i
  // dati di fabbrica, che servono al confronto e al "ripristina i consigliati".
  stato = {
    versione: VERSIONE_STATO,
    versioneDati: VERSIONE_DATI,
    catalogo: structuredClone(predefiniti.catalogo),
    profili: structuredClone(predefiniti.profili),
    config: structuredClone(predefiniti.config),
    statistiche: nuoveStatistiche(),
    pin: null,
    indiceGioco: 0,
  };
  if (store.disponibile()) store.salvaSubito(stato);
}

/** Solo le referenze attive, con la categoria di listino attaccata. */
function profiliInGioco() {
  return profiliAttivi(stato.catalogo, stato.profili);
}

// ----------------------------------------------------------------- router

function vaiA(nuovo) {
  schermo = nuovo;
  // Chi non è in questo elenco non viene mai nascosto: resterebbe sopra a tutto.
  for (const nome of ['attesa', 'scelta', 'percorso', 'risultati', 'ricerca', 'trovati', 'racconto', 'consigli', 'backoffice']) {
    mostra($(`#${nome}`), nome === nuovo);
  }
  riavviaInattivita();
}

function riavviaInattivita() {
  clearTimeout(timerInattivita);
  const durata = INATTIVITA[schermo];
  if (!durata) return;
  timerInattivita = setTimeout(() => {
    if (schermo === 'percorso' && percorso) {
      segnaAbbandono(stato.statistiche, percorso.domandaCorrente());
      salva();
    }
    tornaInAttesa();
  }, durata);
}

function tornaInAttesa() {
  if (percorso) percorso.ferma();
  if (esplora) esplora.ferma();
  if (consiglio) consiglio.ferma();
  vaiA('attesa');
}

/** Il bivio: da qui si sceglie come farsi aiutare (docs/12-ricerca-note.md). */
function vaiAllaScelta() {
  if (percorso) percorso.ferma();
  if (esplora) esplora.ferma();
  if (consiglio) consiglio.ferma();
  vaiA('scelta');
}

// ---------------------------------------------------------------- percorso

function avviaPercorso() {
  segnaInizio(stato.statistiche);
  segnaPercorso(stato.statistiche, 'guidato');
  percorsoContato = false;
  salva();
  vaiA('percorso');
  percorso.avvia(true, stato.indiceGioco);
}

// ---------------------------------------------------------------- ricerca

function avviaRicerca() {
  segnaInizio(stato.statistiche);
  segnaPercorso(stato.statistiche, 'note');
  salva();
  vaiA('ricerca');
  esplora.avvia();
}

// ------------------------------------------------------------ a parole

function avviaRacconto() {
  segnaInizio(stato.statistiche);
  segnaPercorso(stato.statistiche, 'parole');
  salva();
  consiglio.avvia();
}

function concludiPercorso(risposte, { secondi }) {
  const esito = raccomanda(risposte, profiliInGioco(), config());
  // Tornando indietro dai risultati si passa di qui più volte: il percorso conta una volta sola.
  if (!percorsoContato) {
    percorsoContato = true;
    segnaCompletato(stato.statistiche, { secondi, codici: esito.proposte.map((p) => p.codice) });
    stato.indiceGioco = (stato.indiceGioco + 1) % 1000; // la domanda gioco ruota a ogni percorso
  }
  salva();
  risultati.mostra(esito, risposte);
  vaiA('risultati');
}

// -------------------------------------------------------------- backoffice

async function impronta(testo) {
  const dati = new TextEncoder().encode(`profumari-consulente:${testo}`);
  if (globalThis.crypto && crypto.subtle && crypto.subtle.digest) {
    const somma = await crypto.subtle.digest('SHA-256', dati);
    return [...new Uint8Array(somma)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; // ripiego senza crypto: non è sicurezza, è solo "non in chiaro"
  for (const b of dati) h = ((h * 33) ^ b) >>> 0;
  return `d${h.toString(16)}`;
}

function chiediPin() {
  const dialogo = $('#dlg-pin');
  const campo = $('#pin');
  const errore = $('#pin-errore');
  const primoAccesso = !stato.pin;

  $('#dlg-pin-titolo').textContent = primoAccesso ? 'Scegli il codice del banco' : 'Accesso al banco';
  $('#dlg-pin-testo').textContent = primoAccesso
    ? 'Da quattro a otto cifre. Serve a chi lavora in negozio per aprire questa area.'
    : 'Inserisci il codice del personale.';
  campo.value = '';
  errore.hidden = true;
  dialogo.showModal();
  setTimeout(() => campo.focus(), 50);

  const conferma = async () => {
    const valore = campo.value.trim();
    if (!/^\d{4,8}$/.test(valore)) {
      errore.textContent = 'Servono da quattro a otto cifre.';
      errore.hidden = false;
      return;
    }
    if (primoAccesso) {
      stato.pin = await impronta(valore);
      if (store.disponibile()) store.salvaSubito(stato);
      chiudi();
      apriBackoffice();
      toast('Codice impostato. Annotalo: senza, questa area non si apre.');
      return;
    }
    if (await impronta(valore) !== stato.pin) {
      errore.textContent = 'Codice non valido.';
      errore.hidden = false;
      campo.value = '';
      return;
    }
    chiudi();
    apriBackoffice();
  };

  const chiudi = () => {
    dialogo.close();
    $('#pin-ok').removeEventListener('click', conferma);
    campo.removeEventListener('keydown', suInvio);
  };
  const suInvio = (e) => { if (e.key === 'Enter') { e.preventDefault(); conferma(); } };

  $('#pin-ok').addEventListener('click', conferma);
  campo.addEventListener('keydown', suInvio);
  $('#pin-annulla').onclick = chiudi;
}

function apriBackoffice() {
  if (!backoffice) {
    backoffice = creaBackoffice({
      stato,
      predefiniti,
      salva,
      provaMotore: (risposte) => raccomanda(risposte, profiliInGioco(), config()),
      profiliInGioco,
      lessico: () => predefiniti.lessico,
      // Il catalogo o i profili possono essere cambiati: il lessico si riprepara.
      esci: () => { backoffice.aggiornaStato(stato); lessicoPronto = null; tornaInAttesa(); },
      sostituisciStato: (nuovo) => {
        stato = nuovo;
        stato.config = aggiornaConfig(stato.config || {}, predefiniti.config).config;
        // Un backup importato o un punto di ripristino sono una scelta esplicita del
        // personale: restano come sono, il riavvio non li riporta alla base di fabbrica.
        stato.versioneDati = VERSIONE_DATI;
        if (store.disponibile()) store.salvaSubito(stato);
        backoffice.aggiornaStato(stato);
      },
    });
  }
  vaiA('backoffice');
  backoffice.disegna();
}

// ------------------------------------------------------------------ avvio

function scriviTestiAttesa() {
  const t = testi().attesa || {};
  $('#attesa-titolo').textContent = t.titolo || 'Trova il tuo profumo';
  $('#attesa-sotto').textContent = t.sotto || '';
  $('#avvia').textContent = t.invito || 'Tocca per cominciare';
}

/** Il bivio fra i due percorsi: testi dal file, icone disegnate in icone.js. */
function scriviTestiScelta() {
  const t = testi().scelta || {};
  const domande = t.domande || {};
  const note = t.note || {};
  const parole = t.parole || {};
  $('#scelta-titolo').textContent = t.titolo || 'Da dove vuoi partire?';
  $('#scelta-sotto').textContent = t.sotto || '';
  $('#scelta-aiuto').textContent = t.aiuto || '';
  $('#porta-domande-titolo').textContent = domande.titolo || 'Rispondi a qualche domanda';
  $('#porta-domande-detto').textContent = domande.dettaglio || '';
  $('#porta-domande-durata').textContent = domande.durata || '';
  $('#porta-note-titolo').textContent = note.titolo || 'Parti dalle note che ti piacciono';
  $('#porta-note-detto').textContent = note.dettaglio || '';
  $('#porta-note-durata').textContent = note.durata || '';
  $('#porta-parole-titolo').textContent = parole.titolo || 'Raccontami cosa cerchi';
  $('#porta-parole-detto').textContent = parole.dettaglio || '';
  $('#porta-parole-durata').textContent = parole.durata || '';
  for (const cerchio of $$('#scelta [data-icona]')) {
    if (cerchio.firstChild) continue;
    cerchio.append(icona(cerchio.dataset.icona));
  }
}

function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch((errore) => console.warn('Service worker non registrato', errore));
}

async function avvia() {
  const stampaStato = $('#attesa-stato');
  try {
    await preparaStato();
  } catch (errore) {
    console.error(errore);
    stampaStato.textContent = 'Non riesco a caricare i dati. Controlla la connessione e ricarica la pagina.';
    return;
  }

  if (!store.disponibile()) {
    stampaStato.textContent = 'Attenzione: questo browser non salva i dati. Le modifiche andranno perse alla chiusura.';
  }

  scriviTestiAttesa();
  scriviTestiScelta();

  percorso = creaPercorso({
    dammiConfig: config,
    dammiTesti: testi,
    alTermine: concludiPercorso,
    allUscita: tornaInAttesa,
    allaRisposta: (idDomanda, valore) => {
      segnaRisposta(stato.statistiche, idDomanda, valore);
      riavviaInattivita();
    },
  });

  esplora = creaEsplora({
    dammiConfig: configRicerca,
    dammiTesti: testi,
    dammiProfili: profiliInGioco,
    vaiA,
    allUscita: tornaInAttesa,
    allaRicerca: (criteri, esito) => {
      segnaRicerca(stato.statistiche, criteri, esito);
      salva();
      riavviaInattivita();
    },
    allaScheda: (codice) => {
      segnaSchedaAperta(stato.statistiche, codice);
      riavviaInattivita();
    },
  });

  consiglio = creaConsiglio({
    dammiConfig: configRicerca,
    dammiTesti: testi,
    dammiProfili: profiliInGioco,
    dammiPronto: lessico,
    vaiA,
    allUscita: tornaInAttesa,
    // Da una frase che non dice abbastanza si passa alle domande, senza ripartire dall'attesa.
    allaGuida: () => { consiglio.ferma(); avviaPercorso(); },
    alConsulto: (desiderio, esito) => {
      segnaConsulto(stato.statistiche, desiderio, esito);
      salva();
      riavviaInattivita();
    },
  });

  risultati = creaRisultati({
    dammiConfig: config,
    dammiTesti: testi,
    // Con due porte, "Ricomincia" riporta al bivio: da lì si può anche cambiare strada.
    onRicomincia: vaiAllaScelta,
    onTornaA: (idDomanda) => {
      vaiA('percorso');
      if (!percorso.tornaA(idDomanda)) avviaPercorso();
    },
  });

  // Nell'attesa si tocca dove si vuole: il logo no, perché è la maniglia del banco.
  $('#attesa').addEventListener('click', (e) => {
    if (e.target.closest('#logo-attesa')) return;
    vaiAllaScelta();
  });
  $('#porta-domande').addEventListener('click', avviaPercorso);
  $('#porta-note').addEventListener('click', avviaRicerca);
  $('#porta-parole').addEventListener('click', avviaRacconto);

  // Senza note.json la tavolozza sarebbe vuota: meglio non offrire una porta che
  // non porta da nessuna parte. Succede solo se il file manca davvero.
  if (!predefiniti.note || !predefiniti.note.note) {
    mostra($('#porta-note'), false);
    console.warn('note.json non disponibile: la ricerca per note resta chiusa.');
  }
  // Senza lessico il consulente a parole non capirebbe niente: la porta non si offre.
  if (!predefiniti.lessico || !Array.isArray(predefiniti.lessico.scene)) {
    mostra($('#porta-parole'), false);
    console.warn('lessico.json non disponibile: il consulente a parole resta chiuso.');
  }
  $('#esci-scelta').addEventListener('click', tornaInAttesa);
  $('#esci-percorso').addEventListener('click', () => {
    segnaAbbandono(stato.statistiche, percorso.domandaCorrente());
    salva();
    tornaInAttesa();
  });
  $('#esci-risultati').addEventListener('click', tornaInAttesa);

  // Tocco lungo di tre secondi sul logo: area del personale.
  toccoLungo($('#logo-attesa'), 3000, chiediPin);

  for (const evento of ['pointerdown', 'keydown', 'wheel']) {
    document.addEventListener(evento, riavviaInattivita, { passive: true });
  }
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  vaiA('attesa');
  registraServiceWorker();

  const attivi = profiliInGioco().length;
  stampaStato.textContent = store.disponibile() ? `${attivi} fragranze in catalogo` : stampaStato.textContent;
}

avvia();

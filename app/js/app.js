// Avvio, router delle schermate, ripartenza automatica, accesso al banco.
// Tutto il resto sta nei moduli: motore.js (puro), percorso.js, risultati.js,
// backoffice.js, store-locale.js.

import { $, toast, toccoLungo, mostra } from './ui.js';
import { caricaPredefiniti, aggiornaProfili, VERSIONE_DATI } from './dati.js';
import { store, VERSIONE_STATO } from './store-locale.js';
import { creaPercorso } from './percorso.js';
import { creaRisultati } from './risultati.js';
import { creaBackoffice } from './backoffice.js';
import { raccomanda, profiliAttivi } from './motore.js';
import { nuoveStatistiche, segnaInizio, segnaCompletato, segnaAbbandono, segnaRisposta } from './statistiche.js';

const INATTIVITA = { percorso: 60_000, risultati: 90_000 };

let stato = null;
let predefiniti = null;
let percorso = null;
let risultati = null;
let backoffice = null;
let schermo = 'attesa';
let timerInattivita = null;
let percorsoContato = false;

// ------------------------------------------------------------------ stato

const config = () => stato.config;
const testi = () => stato.config.testi;

function salva() {
  if (store.disponibile()) store.salva(stato);
}

/** Riempie solo le chiavi mancanti: le tarature del personale non si toccano. */
function unisciConfig(salvata, difetto) {
  const unito = { ...difetto, ...salvata };
  for (const chiave of Object.keys(difetto)) {
    if (unito[chiave] === undefined || unito[chiave] === null) unito[chiave] = difetto[chiave];
  }
  return unito;
}

async function preparaStato() {
  predefiniti = await caricaPredefiniti();
  const salvato = store.disponibile() ? store.carica() : null;

  if (salvato && Array.isArray(salvato.catalogo) && Array.isArray(salvato.profili)) {
    stato = salvato;
    stato.config = unisciConfig(salvato.config || {}, predefiniti.config);
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

  stato = {
    versione: VERSIONE_STATO,
    versioneDati: VERSIONE_DATI,
    catalogo: predefiniti.catalogo,
    profili: predefiniti.profili,
    config: predefiniti.config,
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
  for (const nome of ['attesa', 'percorso', 'risultati', 'backoffice']) {
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
  vaiA('attesa');
}

// ---------------------------------------------------------------- percorso

function avviaPercorso() {
  segnaInizio(stato.statistiche);
  percorsoContato = false;
  salva();
  vaiA('percorso');
  percorso.avvia(true, stato.indiceGioco);
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
      esci: () => { backoffice.aggiornaStato(stato); tornaInAttesa(); },
      sostituisciStato: (nuovo) => {
        stato = nuovo;
        stato.config = unisciConfig(stato.config || {}, predefiniti.config);
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

  risultati = creaRisultati({
    dammiConfig: config,
    dammiTesti: testi,
    onRicomincia: avviaPercorso,
    onTornaA: (idDomanda) => {
      vaiA('percorso');
      if (!percorso.tornaA(idDomanda)) avviaPercorso();
    },
  });

  // Nell'attesa si tocca dove si vuole: il logo no, perché è la maniglia del banco.
  $('#attesa').addEventListener('click', (e) => {
    if (e.target.closest('#logo-attesa')) return;
    avviaPercorso();
  });
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

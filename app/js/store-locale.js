// Persistenza dell'MVP: un oggetto solo in localStorage, con punti di ripristino
// ed export/import JSON (docs/06-backoffice.md). L'interfaccia è quella che in
// fase 5 verrà reimplementata da store-firebase.js senza toccare il resto.
//
//   store.carica() · store.salva(stato) · store.esporta() · store.importa(json)
//   store.puntiRipristino() · store.ripristina(id)

const CHIAVE = 'profumari.consulente.stato';
const CHIAVE_RIPRISTINI = 'profumari.consulente.ripristini';
const MAX_RIPRISTINI = 10;
const ATTESA_SALVATAGGIO = 500;

export const VERSIONE_STATO = 1;

function leggi(chiave) {
  try {
    const grezzo = localStorage.getItem(chiave);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch (errore) {
    console.warn('Lettura non riuscita', chiave, errore);
    return null;
  }
}

function scrivi(chiave, valore) {
  const testo = JSON.stringify(valore);
  try {
    localStorage.setItem(chiave, testo);
    return true;
  } catch (errore) {
    // Spazio finito: si buttano i punti di ripristino più vecchi e si riprova.
    const ripristini = leggi(CHIAVE_RIPRISTINI) || [];
    while (ripristini.length) {
      ripristini.shift();
      try {
        localStorage.setItem(CHIAVE_RIPRISTINI, JSON.stringify(ripristini));
        localStorage.setItem(chiave, testo);
        return true;
      } catch (ancora) { /* si continua a potare */ }
    }
    console.error('Salvataggio non riuscito', errore);
    return false;
  }
}

let timerSalvataggio = null;
let inAttesa = null;

export const store = {
  disponibile() {
    try {
      const prova = '__prova__';
      localStorage.setItem(prova, '1');
      localStorage.removeItem(prova);
      return true;
    } catch (errore) {
      return false;
    }
  },

  carica() {
    const stato = leggi(CHIAVE);
    if (!stato || typeof stato !== 'object') return null;
    return stato;
  },

  /** Salvataggio con attesa: molte modifiche di fila diventano una scrittura sola. */
  salva(stato) {
    inAttesa = stato;
    clearTimeout(timerSalvataggio);
    timerSalvataggio = setTimeout(() => this.salvaSubito(inAttesa), ATTESA_SALVATAGGIO);
  },

  salvaSubito(stato) {
    clearTimeout(timerSalvataggio);
    timerSalvataggio = null;
    if (!stato) return false;
    stato.versione = VERSIONE_STATO;
    stato.salvatoIl = new Date().toISOString();
    return scrivi(CHIAVE, stato);
  },

  esporta(stato) {
    const dati = stato || this.carica();
    return JSON.stringify({
      tipo: 'profumari-consulente',
      versione: VERSIONE_STATO,
      esportatoIl: new Date().toISOString(),
      stato: dati,
    }, null, 1);
  },

  /** Solo domande, pesi, frasi e testi: per portare la messa a punto su un altro banco. */
  esportaConfig(config) {
    return JSON.stringify({
      tipo: 'profumari-consulente-configurazione',
      versione: VERSIONE_STATO,
      esportatoIl: new Date().toISOString(),
      config,
    }, null, 1);
  },

  /** Accetta il file di sola configurazione o un backup intero: da lì prende la configurazione. */
  importaConfig(testo) {
    const letto = typeof testo === 'string' ? JSON.parse(testo) : testo;
    const config = (letto && letto.config)
      || (letto && letto.stato && letto.stato.config)
      || (letto && letto.domande ? letto : null);
    if (!config || typeof config !== 'object' || !config.domande) {
      throw new Error('Nel file non c\'è una configurazione.');
    }
    return config;
  },

  /** Accetta sia il file di export sia uno stato nudo. Non salva: restituisce. */
  importa(testo) {
    const letto = typeof testo === 'string' ? JSON.parse(testo) : testo;
    const stato = letto && letto.stato ? letto.stato : letto;
    if (!stato || typeof stato !== 'object') throw new Error('File non riconosciuto.');
    if (!Array.isArray(stato.catalogo) || !Array.isArray(stato.profili)) {
      throw new Error('Nel file mancano il catalogo o i profili.');
    }
    return stato;
  },

  puntiRipristino() {
    const elenco = leggi(CHIAVE_RIPRISTINI) || [];
    return elenco.map((p) => ({ id: p.id, quando: p.quando, motivo: p.motivo }))
      .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
  },

  creaPuntoRipristino(stato, motivo = 'salvataggio') {
    if (!stato) return null;
    const elenco = leggi(CHIAVE_RIPRISTINI) || [];
    const punto = {
      id: `r${Date.now().toString(36)}`,
      quando: new Date().toISOString(),
      motivo,
      stato,
    };
    elenco.push(punto);
    while (elenco.length > MAX_RIPRISTINI) elenco.shift();
    scrivi(CHIAVE_RIPRISTINI, elenco);
    return punto.id;
  },

  ripristina(id) {
    const elenco = leggi(CHIAVE_RIPRISTINI) || [];
    const punto = elenco.find((p) => p.id === id);
    if (!punto) throw new Error('Punto di ripristino non trovato.');
    return punto.stato;
  },

  azzera() {
    try {
      localStorage.removeItem(CHIAVE);
      localStorage.removeItem(CHIAVE_RIPRISTINI);
    } catch (errore) { /* niente da fare */ }
  },
};

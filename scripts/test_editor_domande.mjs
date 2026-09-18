// Prove dell'editor delle domande (app/js/editor-domande.js): la parte che non
// tocca il DOM — id, livelli dei contributi, controlli prima di pubblicare una
// domanda, e la garanzia che una domanda scritta dal negozio sia digeribile dal
// motore esattamente come quelle di fabbrica.
//
//   node scripts/test_editor_domande.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  LIVELLI, livelloDi, prossimoLivello, idDaTitolo, nuovaDomanda, duplicaDomanda, problemiDi,
} from '../app/js/editor-domande.js';
import { costruisciDesiderato, raccomanda } from '../app/js/motore.js';
import { aggiornaDomande } from '../app/js/dati.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  domande: leggi('app/config/domande.json'),
  pesi: leggi('app/config/pesi.json'),
  frasi: leggi('app/config/frasi.json'),
};

let passate = 0;
const fallite = [];

function prova(nome, fn) {
  try {
    fn();
    passate++;
    console.log(`  ok  ${nome}`);
  } catch (errore) {
    fallite.push({ nome, errore });
    console.log(`  NO  ${nome}\n      ${errore.message.split('\n')[0]}`);
  }
}

function profilo(codice, accordi) {
  return {
    codice, genere: 'unisex', famiglia: 'legnoso', sottofamiglia: `prova ${codice}`,
    testa: ['nota'], cuore: ['nota'], fondo: ['nota'], accordi,
    intensita: 3, persistenza: 3, dolcezza: 2, freschezza: 3,
    stagioni: {}, momento: {}, occasioni: [], carattere: ['elegante'],
    descrizione: 'profilo di prova', confidenza: 'alta',
  };
}

// ------------------------------------------------------------------ livelli

prova('i contributi si dicono a parole e girano in tondo', () => {
  assert.deepEqual(LIVELLI.map((l) => l.valore), [0, 0.3, 0.6, 1]);
  assert.equal(prossimoLivello(undefined), 0.3);
  assert.equal(prossimoLivello(0.3), 0.6);
  assert.equal(prossimoLivello(0.6), 1);
  assert.equal(prossimoLivello(1), 0);
});

prova('un valore scritto a mano nel file cade sul livello più vicino', () => {
  assert.equal(livelloDi(0.8).valore, 1);
  assert.equal(livelloDi(0.4).valore, 0.3);
  assert.equal(livelloDi(0).etichetta, '—');
});

// ----------------------------------------------------------------------- id

prova('l\'id nasce dal titolo, senza accenti e senza scontri', () => {
  assert.equal(idDaTitolo('Che musica metti in negozio?'), 'che_musica_metti');
  assert.equal(idDaTitolo('Città o mare?'), 'citta_mare', 'le parole di una lettera sola si saltano');
  assert.equal(idDaTitolo("Una hit d'estate"), 'una_hit_estate');
  assert.equal(idDaTitolo('Colore', ['colore']), 'colore_2');
  assert.equal(idDaTitolo('Colore', ['colore', 'colore_2']), 'colore_3');
  assert.equal(idDaTitolo('', [], 'gioco'), 'gioco');
});

prova('la copia di una domanda nasce spenta e con un id suo', () => {
  const originale = { id: 'luogo', titolo: 'Dove vorresti essere?', attiva: true, opzioni: [] };
  const copia = duplicaDomanda(originale, ['luogo']);
  assert.notEqual(copia.id, 'luogo');
  assert.equal(copia.attiva, false);
  assert.ok(copia.toccata, 'una copia è roba del negozio: gli aggiornamenti non la riscrivono');
  assert.equal(originale.titolo, 'Dove vorresti essere?', 'l\'originale non si tocca');
});

// ------------------------------------------------------------- cosa manca

prova('una domanda appena creata dice cosa le manca', () => {
  const problemi = problemiDi(nuovaDomanda([]));
  assert.ok(problemi.some((p) => /titolo/.test(p)), problemi.join('; '));
  assert.ok(problemi.some((p) => /sposta/.test(p)), problemi.join('; '));
});

prova('una domanda completa non ha problemi', () => {
  const domanda = {
    id: 'musica', tipo: 'singola', titolo: 'Che musica metti?', peso: 0.4,
    opzioni: [
      { id: 'jazz', etichetta: 'Jazz di sera', accordi: { ambrato: 0.6 } },
      { id: 'estate', etichetta: 'Qualcosa d\'estate', accordi: { agrumato: 1 } },
    ],
  };
  assert.deepEqual(problemiDi(domanda), []);
});

prova('una domanda con una sola risposta, o muta, non passa', () => {
  assert.ok(problemiDi({ titolo: 'Una sola', opzioni: [{ id: 'a', etichetta: 'A', accordi: { rosa: 1 } }] })
    .some((p) => /due risposte/.test(p)));
  assert.ok(problemiDi({
    titolo: 'Muta',
    opzioni: [{ id: 'a', etichetta: 'A', accordi: {} }, { id: 'b', etichetta: 'B', accordi: {} }],
  }).some((p) => /nessuna risposta sposta/.test(p)));
});

prova('una domanda a cursore chiede almeno un attributo da spostare', () => {
  assert.ok(problemiDi({ titolo: 'Quanto deve durare?', tipo: 'scala', attributiScala: [] })
    .some((p) => /attributo/.test(p)));
  assert.deepEqual(problemiDi({ titolo: 'Quanto deve durare?', tipo: 'scala', attributiScala: ['persistenza'] }), []);
});

// ------------------------------------- una domanda del negozio funziona davvero

prova('una domanda scritta dal negozio sposta il desiderato come le altre', () => {
  const domanda = {
    id: 'musica', tipo: 'singola', peso: 1, attiva: true, titolo: 'Che musica metti?',
    opzioni: [{ id: 'jazz', etichetta: 'Jazz di sera', accordi: { ambrato: 1, tabacco: 0.6 }, carattere: ['misterioso'] }],
    toccata: true,
  };
  const configConLaSua = { ...config, domande: { domande: [...config.domande.domande, domanda] } };
  const desiderato = costruisciDesiderato({ musica: 'jazz' }, configConLaSua);
  assert.equal(desiderato.accordi.ambrato, 1);
  assert.equal(desiderato.accordi.tabacco, 0.6);
  assert.ok(desiderato.carattere.includes('misterioso'));

  const catalogo = [
    profilo('900', { ambrato: 1, tabacco: 0.7 }),
    profilo('901', { agrumato: 1, acquatico: 0.6 }),
    profilo('902', { gourmand: 1, vaniglia: 0.8 }),
  ];
  const esito = raccomanda({ musica: 'jazz' }, catalogo, configConLaSua);
  assert.equal(esito.proposte[0].codice, '900', 'la sua domanda deve pesare sul risultato');
});

prova('la domanda del negozio sopravvive agli aggiornamenti dell\'app', () => {
  const sua = { id: 'musica', titolo: 'Che musica metti?', toccata: true, opzioni: [] };
  const esito = aggiornaDomande([...config.domande.domande, sua], config.domande.domande);
  const ritrovata = esito.domande.find((d) => d.id === 'musica');
  assert.ok(ritrovata, 'la domanda del negozio non deve sparire');
  assert.equal(ritrovata.titolo, 'Che musica metti?');
  assert.equal(esito.nuove, 0);
});

console.log(`\n${passate} passate, ${fallite.length} fallite\n`);
if (fallite.length) {
  for (const f of fallite) console.error(f.errore);
  process.exit(1);
}

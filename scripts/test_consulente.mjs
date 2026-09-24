// Prove del consulente a parole — docs/13-consulente.md.
// Profili sintetici per le regole del punteggio e del perché, poi le frasi tipiche
// di app/js/scenari.js sul catalogo vero, con le attese scritte lì.
//
//   node scripts/test_consulente.mjs

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { preparaLessico, interpreta } from '../app/js/interpreta.js';
import { consiglia, dettaglioConsulto } from '../app/js/consulente.js';
import { profiliAttivi } from '../app/js/motore.js';
import { FRASI, controllaAttese } from '../app/js/scenari.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  note: leggi('app/config/note.json'),
  ricerca: leggi('app/config/ricerca.json'),
  pesi: leggi('app/config/pesi.json'),
  frasi: leggi('app/config/frasi.json'),
  consulente: leggi('app/config/consulente.json'),
};
const grammatica = (() => { const { _nota, ...g } = leggi('dati/lessico/_grammatica.json'); return g; })();

// ------------------------------------------------------------- impalcatura

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

function profilo(codice, extra = {}) {
  return {
    codice, genere: 'unisex', famiglia: 'legnoso', sottofamiglia: `sottofamiglia ${codice}`,
    testa: [], cuore: [], fondo: [], accordi: {},
    intensita: 3, persistenza: 3, dolcezza: 2, freschezza: 3,
    stagioni: { primavera: 0.5, estate: 0.5, autunno: 0.5, inverno: 0.5 },
    momento: { giorno: 0.7, sera: 0.5 },
    occasioni: ['quotidiano'], carattere: ['fresco'],
    descrizione: 'Profilo di prova.', confidenza: 'alta',
    ...extra,
  };
}

const LESSICO = {
  grammatica,
  scene: [
    { chiave: 'bosco-inverno', tipo: 'luogo', forme: ["bosco d'inverno"], evoca: "il bosco d'inverno",
      accordi: { legnoso: 0.9, verde: 0.5 }, note: { abete: 1, vetiver: 0.6 }, misure: { freschezza: 4 } },
    { chiave: 'bev-caffe', tipo: 'bevanda', forme: ['caffè'], evoca: 'un caffè',
      accordi: { gourmand: 0.8 }, note: { 'caffè': 1, cacao: 0.5 } },
    { chiave: 'dolce', tipo: 'sensazione', forme: ['dolce'], evoca: 'il dolce',
      accordi: { gourmand: 0.8, vaniglia: 0.5 }, misure: { dolcezza: 5 } },
    { chiave: 'per-lei', tipo: 'persona', forme: ['per lei'], evoca: 'lei', filtro: { genere: 'donna' } },
  ],
};

const BOSCO = profilo('101', { famiglia: 'legnoso', testa: ['abete', 'limone'], fondo: ['vetiver'], accordi: { legnoso: 0.9, verde: 0.6 }, freschezza: 4 });
const LEGNI = profilo('102', { famiglia: 'legnoso', testa: ['bergamotto'], fondo: ['sandalo'], accordi: { legnoso: 0.9, verde: 0.5 }, freschezza: 4 });
const CAFFE = profilo('201', { famiglia: 'gourmand', cuore: ['caffè'], fondo: ['vaniglia'], accordi: { gourmand: 0.9, vaniglia: 0.6 }, dolcezza: 4 });
const DOLCE = profilo('202', { famiglia: 'gourmand', fondo: ['caramello', 'vaniglia'], accordi: { gourmand: 1, vaniglia: 0.7 }, dolcezza: 5 });
const MARE = profilo('301', { famiglia: 'acquatico', genere: 'uomo', testa: ['note marine'], accordi: { acquatico: 1, agrumato: 0.5 }, freschezza: 5 });
const FIORI = profilo('401', { famiglia: 'floreale', genere: 'donna', cuore: ['rosa', 'gelsomino'], accordi: { rosa: 0.9, 'floreale-bianco': 0.6 } });
const SINTETICI = [BOSCO, LEGNI, CAFFE, DOLCE, MARE, FIORI];

const pronto = preparaLessico(LESSICO, config, SINTETICI);
const chiedi = (frase, profili = SINTETICI) => consiglia(interpreta(frase, pronto), profili, config, pronto);

// ------------------------------------------------------------- il punteggio

prova('note: chi ha in piramide le note della scena passa davanti a chi ha solo la famiglia', () => {
  const esito = chiedi("un bosco d'inverno");
  assert.equal(esito.proposte[0].codice, '101');
  const d = interpreta("un bosco d'inverno", pronto);
  assert.ok(dettaglioConsulto(d, BOSCO, config).note > dettaglioConsulto(d, LEGNI, config).note);
});

prova('note: una nota chiesta e assente vale qualcosa se la sua famiglia è forte', () => {
  const d = interpreta('caffè', pronto);
  const senza = dettaglioConsulto(d, DOLCE, config).note;
  assert.ok(senza > 0 && senza < dettaglioConsulto(d, CAFFE, config).note);
});

prova('parti assenti: chi non parla di stagione non viene giudicato sulla stagione', () => {
  const d = interpreta('caffè', pronto);
  const det = dettaglioConsulto(d, CAFFE, config);
  assert.equal(det.contesto, null);
  assert.equal(det.carattere, null);
});

prova('veti: "caffè ma niente di dolce" toglie chi è dolce e basta', () => {
  const esito = chiedi('caffè ma niente di dolce');
  assert.ok(!esito.proposte.some((p) => p.codice === '202'), 'il caramello da dolcezza 5 resta fuori');
});

prova('veti: una nota rifiutata toglie chi ce l\'ha in piramide', () => {
  const esito = chiedi('caffè, senza vaniglia');
  assert.ok(!esito.proposte.some((p) => ['201', '202'].includes(p.codice)));
});

prova('filtro: "per lei" non propone profumi da uomo', () => {
  const esito = chiedi('per lei, dolce');
  assert.ok(!esito.proposte.some((p) => p.profilo.genere === 'uomo'));
});

prova('diversità: al massimo una per sottofamiglia, due per famiglia', () => {
  const tanti = [1, 2, 3, 4, 5].map((i) => profilo(`50${i}`, {
    famiglia: 'legnoso', sottofamiglia: i < 3 ? 'uguale' : `altra ${i}`, testa: ['abete'], accordi: { legnoso: 0.9 },
  }));
  const esito = chiedi("bosco d'inverno", [...tanti, CAFFE, MARE]);
  const sf = esito.proposte.map((p) => p.profilo.sottofamiglia);
  assert.equal(new Set(sf).size, sf.length);
  assert.ok(esito.proposte.filter((p) => p.famiglia === 'legnoso').length <= 2);
});

prova('stessa frase, stessi codici, nello stesso ordine', () => {
  const a = chiedi("un bosco d'inverno, dolce").proposte.map((p) => p.codice).join();
  const b = chiedi("un bosco d'inverno, dolce").proposte.map((p) => p.codice).join();
  assert.equal(a, b);
});

// ------------------------------------------------------------- il perché

prova('perché: nomina la scena e le note ritrovate, con il loro posto', () => {
  const esito = chiedi("un bosco d'inverno");
  assert.equal(esito.proposte[0].motivi[0], "Per il bosco d'inverno: abete in testa, vetiver sul fondo.");
});

prova('perché: una nota chiesta per nome si dice così', () => {
  const lessicoNote = preparaLessico({ grammatica, scene: [] }, config, SINTETICI);
  const d = interpreta('il sandalo', lessicoNote);
  const esito = consiglia(d, SINTETICI, config, lessicoNote);
  assert.equal(esito.proposte[0].codice, '102');
  assert.equal(esito.proposte[0].motivi[0], 'Sandalo sul fondo, come chiedevi.');
});

prova('perché: mai un numero, mai un punteggio', () => {
  for (const p of chiedi("bosco d'inverno, caffè, dolce").proposte) {
    for (const m of p.motivi) assert.doesNotMatch(m, /\d/);
  }
});

prova('la piramide del risultato accende le note chieste', () => {
  const esito = chiedi("un bosco d'inverno");
  const accese = esito.proposte[0].piramide.flatMap((r) => r.note).filter((n) => n.voluta).map((n) => n.nome);
  assert.deepEqual(accese.sort(), ['abete', 'vetiver']);
});

// ------------------------------------------------------ le frasi sul catalogo vero

if (existsSync(join(RADICE, 'app/config/lessico.json'))) {
  const lessico = leggi('app/config/lessico.json');
  const profili = profiliAttivi(leggi('dati/catalogo.json'), leggi('dati/profili.json'));
  const vero = preparaLessico(lessico, config, profili);

  for (const { frase, attese } of FRASI) {
    prova(`catalogo vero: «${frase}»`, () => {
      const desiderio = interpreta(frase, vero);
      assert.ok(desiderio.capito.length > 0, 'non ha capito niente');
      const esito = consiglia(desiderio, profili, config, vero);
      const problemi = controllaAttese(esito, attese);
      assert.equal(problemi.length, 0, `${problemi.join('; ')} · capito: ${desiderio.capito.map((c) => `${c.chiave}${c.modo === 'si' ? '' : `(${c.modo})`}`).join(', ')} · proposte ${esito.proposte.map((p) => p.codice).join(', ')}`);
    });
  }

  prova('catalogo vero: le proposte sono codici a tre cifre, i perché non hanno numeri', () => {
    for (const { frase } of FRASI) {
      const esito = consiglia(interpreta(frase, vero), profili, config, vero);
      for (const p of esito.proposte) {
        assert.match(String(p.codice), /^\d{3}$/);
        assert.equal(p.profilo.nome, undefined);
        for (const m of p.motivi) assert.doesNotMatch(m, /\d/, `${frase}: ${m}`);
      }
    }
  });

  // 220 frasi scritte da chi non aveva visto il lessico, come le direbbe un cliente
  // (anche sgrammaticate, in dialetto, vaghe). Il 24/09/2026 ne capiva 195: la
  // soglia sta un po' sotto, e un lessico nuovo non deve scendere di lì.
  prova('frasi libere: almeno l\'85% dà una proposta', () => {
    const libere = leggi('scripts/frasi_libere.json');
    const buone = libere.filter((f) => {
      const d = interpreta(f, vero);
      return d.capito.length && consiglia(d, profili, config, vero).proposte.length;
    }).length;
    assert.ok(buone / libere.length >= 0.85, `${buone} su ${libere.length}`);
  });

  prova('catalogo vero: solo referenze attive', () => {
    const attivi = new Set(profili.map((p) => p.codice));
    for (const { frase } of FRASI) {
      for (const p of consiglia(interpreta(frase, vero), profili, config, vero).proposte) assert.ok(attivi.has(p.codice));
    }
  });
}

// ------------------------------------------------------------------ esito

console.log(`\n${passate} prove passate, ${fallite.length} fallite.`);
if (fallite.length) process.exit(1);

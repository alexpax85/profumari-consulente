// Prove dell'interprete del consulente a parole — docs/13-consulente.md.
// Un lessico sintetico per le regole della lingua (restano stabili quando il
// lessico vero cresce) e una passata sul lessico vero per le cose che solo lui dice.
//
//   node scripts/test_interpreta.mjs

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parole, radice, formaNormale, preparaLessico, leggiFrase, interpreta, haSostanza,
} from '../app/js/interpreta.js';
import { profiliAttivi } from '../app/js/motore.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (percorso) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const config = {
  accordi: leggi('app/config/accordi.json'),
  note: leggi('app/config/note.json'),
  ricerca: leggi('app/config/ricerca.json'),
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

const LESSICO = {
  grammatica,
  scene: [
    { chiave: 'bosco', tipo: 'luogo', forme: ['bosco', 'foresta'], evoca: 'il bosco',
      accordi: { legnoso: 0.9, verde: 0.6 }, note: { vetiver: 0.7, cipresso: 0.8 }, misure: { freschezza: 4 } },
    { chiave: 'bosco-inverno', tipo: 'luogo', forme: ["bosco d'inverno", 'bosco innevato'], evoca: "il bosco d'inverno",
      accordi: { legnoso: 0.9, verde: 0.5, incenso: 0.2 }, note: { abete: 1, cipresso: 0.8 }, stagioni: { inverno: 0.8 }, manca: ['pino'] },
    { chiave: 'inverno', tipo: 'stagione', forme: ['inverno'], evoca: "l'inverno",
      accordi: { ambrato: 0.6 }, stagioni: { inverno: 1 }, misure: { freschezza: 2 } },
    { chiave: 'dolce', tipo: 'sensazione', forme: ['dolce', 'zuccherino'], evoca: 'il dolce',
      accordi: { gourmand: 0.8, vaniglia: 0.5 }, misure: { dolcezza: 5 } },
    { chiave: 'fresco', tipo: 'sensazione', forme: ['fresco', 'freschezza'], evoca: 'il fresco',
      accordi: { agrumato: 0.6, acquatico: 0.4 }, misure: { freschezza: 5 } },
    { chiave: 'leggero', tipo: 'sensazione', forme: ['leggero', 'delicato'], evoca: 'il leggero',
      misure: { intensita: 1 } },
    { chiave: 'mare', tipo: 'luogo', forme: ['mare', 'spiaggia'], evoca: 'il mare',
      accordi: { acquatico: 0.9, agrumato: 0.4 }, note: { 'note marine': 1 } },
    { chiave: 'bev-caffe', tipo: 'bevanda', forme: ['caffè', 'espresso'], evoca: 'un caffè',
      accordi: { gourmand: 0.7 }, note: { 'caffè': 1, cacao: 0.5 } },
    { chiave: 'bev-te-verde', tipo: 'bevanda', forme: ['tè verde'], evoca: 'un tè verde',
      accordi: { 'tè': 0.9, verde: 0.4 }, note: { 'tè verde': 1 } },
    { chiave: 'per-lui', tipo: 'persona', forme: ['per lui', 'mio marito', 'uomo'], evoca: 'lui', filtro: { genere: 'uomo' } },
    { chiave: 'regalo', tipo: 'persona', forme: ['regalo', 'da regalare'], evoca: 'un regalo', modo: 'regalo' },
    // Una scena che si chiama come una nota del catalogo: la scena vince.
    { chiave: 'cibo-vaniglia', tipo: 'cibo', forme: ['gelato alla vaniglia'], evoca: 'il gelato alla vaniglia',
      accordi: { vaniglia: 0.9, gourmand: 0.6 }, note: { vaniglia: 1 } },
  ],
};

// Profili minimi: servono solo a dire quali note esistono "oggi" nel catalogo.
const PROFILI = [
  { codice: '001', testa: ['bergamotto'], cuore: ['rosa bulgara'], fondo: ['vaniglia', 'cuoio'] },
  { codice: '002', testa: ['limone'], cuore: ['caffè'], fondo: ['fava tonka'] },
];

const pronto = preparaLessico(LESSICO, config, PROFILI);
const capite = (testo) => interpreta(testo, pronto).capito.map((c) => `${c.chiave}:${c.modo}`);

// ------------------------------------------------------------- le parole

prova('parole: minuscole, niente accenti né apostrofi, la punteggiatura resta a parte', () => {
  assert.deepEqual(parole("Un bosco d'inverno, però CALDO!"), ['un', 'bosco', 'd', 'inverno', ',', 'pero', 'caldo', ',']);
});

prova('parole: il tè non diventa il pronome "te"', () => {
  assert.deepEqual(parole('Vorrei un tè verde'), ['vorrei', 'un', 'the', 'verde']);
  assert.deepEqual(parole('un thè'), ['un', 'the']);
  assert.ok(!parole('per te').includes('the'));
});

prova('radice: singolare e plurale, maschile e femminile cadono insieme', () => {
  for (const [a, b] of [['bosco', 'boschi'], ['fresca', 'freschi'], ['arancia', 'arance'], ['ciliegia', 'ciliegie'], ['mare', 'mari'], ['fiore', 'fiori']]) {
    assert.equal(radice(a), radice(b), `${a} / ${b}`);
  }
});

prova('radice: le parole che dicono il genere non si accorciano (ragazzo/ragazza)', () => {
  assert.notEqual(formaNormale('ragazza', grammatica), formaNormale('ragazzo', grammatica));
  assert.equal(formaNormale('ragazze', grammatica), formaNormale('ragazza', grammatica));
  assert.equal(formaNormale('la mia fidanzata', grammatica), formaNormale('fidanzate', grammatica));
  assert.notEqual(formaNormale('nonna', grammatica), formaNormale('nonno', grammatica));
});

prova('forma normale: articoli e preposizioni non contano', () => {
  assert.equal(formaNormale("bosco d'inverno", grammatica), formaNormale('un bosco in inverno', grammatica));
  assert.equal(formaNormale('boschi d\'inverno', grammatica), formaNormale("bosco d'inverno", grammatica));
  assert.equal(formaNormale('il profumo del', grammatica), '');
});

// ------------------------------------------------------------- le scene

prova('vince la forma più lunga: "bosco d\'inverno" è una scena, non bosco + inverno', () => {
  assert.deepEqual(capite('un profumo che ricordi un bosco d\'inverno'), ['bosco-inverno:si']);
  assert.deepEqual(capite('un bosco, e poi l\'inverno'), ['bosco:si', 'inverno:si']);
});

prova('la virgola spezza le forme: "bosco, inverno" sono due cose', () => {
  assert.deepEqual(capite('bosco, inverno'), ['bosco:si', 'inverno:si']);
});

prova('scena, nota e famiglia: una nota del catalogo si riconosce anche senza scena', () => {
  const d = interpreta('mi piace il cuoio e la vaniglia', pronto);
  assert.deepEqual(d.capito.map((c) => c.tipo), ['nota', 'nota']);
  assert.ok(d.note.cuoio && d.note.vaniglia);
  const f = interpreta('vorrei qualcosa sui legni', pronto);
  assert.equal(f.capito[0].chiave, 'famiglia:legnoso');
});

prova('una scena scritta apposta vince sulla nota con lo stesso nome', () => {
  assert.deepEqual(capite('un gelato alla vaniglia'), ['cibo-vaniglia:si']);
});

prova('i sinonimi del catalogo portano alla stessa nota ("rosa bulgara" è rosa)', () => {
  const d = interpreta('rosa bulgara', pronto);
  assert.ok('rosa' in d.note, JSON.stringify(d.note));
});

prova('una nota che il catalogo di oggi non ha non si riconosce come nota', () => {
  // L'oud esiste come famiglia (tassonomia) ma nessun profilo di prova lo ha in piramide.
  const d = interpreta('legno di agar', pronto);
  assert.ok(!d.capito.some((c) => c.tipo === 'nota'));
});

prova('una lettera sbagliata si corregge, due candidati no', () => {
  assert.deepEqual(capite('un bosco innevatto'), ['bosco-inverno:si']);
  assert.deepEqual(capite('vanigla'), ['nota:vaniglia:si']);
});

prova('il tè verde è una bevanda, non il colore verde', () => {
  assert.deepEqual(capite('un tè verde'), ['bev-te-verde:si']);
});

// ------------------------------------------------------------- la grammatica

prova('negazione: "niente dolce" è un veto su gourmand e sulla dolcezza', () => {
  const d = interpreta('fresco ma niente di dolce', pronto);
  assert.deepEqual(d.capito.map((c) => `${c.chiave}:${c.modo}`), ['fresco:si', 'dolce:no']);
  assert.equal(d.esclusioni.gourmand, 1);
  assert.deepEqual(d.esclusioniAttributi.dolcezza, { da: 4, peso: 1 });
  assert.ok(!d.accordi.gourmand);
});

prova('negazione: si chiude alla virgola, al "ma" e a chi riapre il desiderio', () => {
  assert.deepEqual(capite('niente dolce, fresco'), ['dolce:no', 'fresco:si']);
  assert.deepEqual(capite('non dolce ma fresco'), ['dolce:no', 'fresco:si']);
  assert.deepEqual(capite('non mi piace il dolce vorrei il mare'), ['dolce:no', 'mare:si']);
});

prova('negazione: copre l\'elenco che segue ("senza dolce e senza mare", "niente mare e caffè")', () => {
  assert.deepEqual(capite('niente mare e caffè'), ['mare:no', 'bev-caffe:no']);
});

prova('negazione a voce o in dialetto: "nun", "nn"', () => {
  assert.deepEqual(capite('nun voglio il dolce'), ['dolce:no']);
  assert.deepEqual(capite('nn mi piace il mare, vorrei il bosco'), ['mare:no', 'bosco:si']);
});

prova('le parole della grammatica non diventano scene: "pero" resta un però', () => {
  const lessico = { ...LESSICO, scene: [...LESSICO.scene, { chiave: 'pera', tipo: 'cibo', forme: ['pera', 'pere'], evoca: 'la pera', accordi: { fruttato: 1 } }] };
  const p = preparaLessico(lessico, config, PROFILI);
  assert.deepEqual(interpreta('fresco pero non dolce', p).capito.map((c) => `${c.chiave}:${c.modo}`), ['fresco:si', 'dolce:no']);
});

prova('negazione dopo: "il dolce no"', () => {
  assert.deepEqual(capite('il mare sì, il dolce no'), ['mare:si', 'dolce:no']);
  assert.deepEqual(capite('dolce no grazie'), ['dolce:no']);
});

prova('attenuazione: "non troppo dolce" non toglie niente, abbassa e pesa un po\' contro', () => {
  const d = interpreta('non troppo dolce', pronto);
  assert.equal(d.capito[0].modo, 'attenuato');
  assert.equal(d.attributi.dolcezza, 2.5);
  assert.equal(d.esclusioni.gourmand, 0.35);
  assert.equal(d.esclusioniAttributi.dolcezza, undefined);
});

prova('"poco" e "molto" cambiano il peso della scena', () => {
  const poco = interpreta('poco dolce', pronto);
  const molto = interpreta('molto dolce', pronto);
  const normale = interpreta('dolce', pronto);
  assert.equal(poco.capito[0].modo, 'poco');
  assert.equal(molto.capito[0].modo, 'forte');
  assert.ok(poco.accordi.gourmand < normale.accordi.gourmand);
  assert.ok(molto.accordi.gourmand > normale.accordi.gourmand);
  assert.deepEqual(capite('un filo di dolce'), ['dolce:poco']);
});

prova('"niente di leggero" vuole chi si sente, non toglie tutto', () => {
  const d = interpreta('niente di leggero', pronto);
  assert.equal(d.attributi.intensita, 5);
});

prova('chi chiede per nome vince su un veto più largo: "vaniglia ma niente di dolce"', () => {
  const d = interpreta('gelato alla vaniglia ma niente di dolce', pronto);
  assert.equal(d.esclusioni.vaniglia, undefined, 'la vaniglia chiesta resta');
  assert.equal(d.esclusioni.gourmand, 1, 'il dolce rifiuta il gourmand più di quanto il gelato lo chieda');
  assert.deepEqual(d.esclusioniAttributi.dolcezza, { da: 4, peso: 1 }, 'lo zucchero se ne va');
});

prova('ma un veto preciso batte un desiderio largo: "fresco ma niente agrumi"', () => {
  const lessico = { ...LESSICO, scene: [...LESSICO.scene, { chiave: 'agrumi', tipo: 'sensazione', forme: ['agrumi'], evoca: 'gli agrumi', accordi: { agrumato: 1 } }] };
  const d = interpreta('fresco ma niente agrumi', preparaLessico(lessico, config, PROFILI));
  assert.equal(d.esclusioni.agrumato, 1);
});

prova('niente vaniglia: la nota rifiutata finisce fra le note escluse', () => {
  const d = interpreta('senza vaniglia', pronto);
  assert.deepEqual(d.noteEscluse, ['vaniglia']);
});

// ------------------------------------------------------------- persone e resto

prova('persone: "per mio marito" mette il filtro, "è un regalo" cambia il modo', () => {
  const d = interpreta('è un regalo per mio marito, ama il mare', pronto);
  assert.equal(d.filtri.genere, 'uomo');
  assert.equal(d.modo, 'regalo');
  assert.ok(d.accordi.acquatico > 0);
});

prova('l\'immagine guida, l\'aggettivo colora: "bosco d\'inverno, fresco"', () => {
  const lessico = { ...LESSICO, grammatica: { ...grammatica, pesiTipo: { luogo: 1, sensazione: 0.5 } } };
  const p = preparaLessico(lessico, config, PROFILI);
  const insieme = interpreta("bosco d'inverno, fresco", p);
  assert.ok(insieme.accordi.legnoso > insieme.accordi.agrumato * 2, JSON.stringify(insieme.accordi));
  assert.equal(insieme.attributi.freschezza, 5, 'la misura del fresco conta per intero');
  const solo = interpreta('fresco', p);
  assert.equal(solo.accordi.agrumato, 0.6, 'da solo l\'aggettivo non si riduce');
});

prova('sulle chip va la parola del cliente, non la frase della motivazione', () => {
  const d = interpreta('un bosco innevato', pronto);
  assert.equal(d.capito[0].nome, "bosco d'inverno");
});

prova('le misure si mediano, le stagioni prendono il massimo', () => {
  const d = interpreta('fresco, bosco d\'inverno', pronto);
  assert.equal(d.attributi.freschezza, 5);
  assert.equal(d.stagioni.inverno, 0.8);
});

prova('quello che manca in catalogo arriva fino alla risposta', () => {
  const d = interpreta('bosco innevato', pronto);
  assert.deepEqual(d.capito[0].manca, ['pino']);
});

prova('le parole non capite si dicono, le parole vuote no', () => {
  const d = interpreta('vorrei un profumo di astronave e di mare', pronto);
  assert.deepEqual(d.ignorate, ['astronave']);
});

prova('sostanza: un veto o un "per lui" da soli non bastano a proporre', () => {
  assert.equal(haSostanza(interpreta('niente dolce', pronto)), false);
  assert.equal(haSostanza(interpreta('per lui', pronto)), false);
  assert.equal(haSostanza(interpreta('per lui, fresco', pronto)), true);
});

prova('una scena tolta dal cliente non conta più, la frase resta quella', () => {
  const d = interpreta('mare, niente dolce', pronto, { salta: new Set(['dolce']) });
  assert.deepEqual(d.capito.map((c) => c.chiave), ['mare']);
  assert.deepEqual(d.esclusioni, {});
});

prova('stessa frase, stesso desiderio', () => {
  const a = JSON.stringify(interpreta('un bosco d\'inverno, fresco, non troppo dolce, per lui', pronto));
  const b = JSON.stringify(interpreta('un bosco d\'inverno, fresco, non troppo dolce, per lui', pronto));
  assert.equal(a, b);
});

prova('frase vuota o strana: nessun errore, nessuna scena', () => {
  for (const testo of ['', '   ', '!!!', '123', null, undefined]) {
    const d = interpreta(testo, pronto);
    assert.equal(d.capito.length, 0);
  }
});

// ------------------------------------------------------ il lessico vero

const PERCORSO = join(RADICE, 'app/config/lessico.json');
if (existsSync(PERCORSO)) {
  const lessico = leggi('app/config/lessico.json');
  const profili = profiliAttivi(leggi('dati/catalogo.json'), leggi('dati/profili.json'));
  const vero = preparaLessico(lessico, config, profili);

  prova('lessico vero: ogni forma di ogni scena riporta alla sua scena', () => {
    const sbagliate = [];
    for (const scena of lessico.scene) {
      for (const forma of scena.forme) {
        const d = interpreta(forma, vero);
        if (d.capito.length !== 1 || d.capito[0].chiave !== scena.chiave) {
          sbagliate.push(`"${forma}" (${scena.chiave}) → ${d.capito.map((c) => c.chiave).join(' + ') || 'niente'}`);
        }
      }
    }
    assert.equal(sbagliate.length, 0, `${sbagliate.length} forme non tornano: ${sbagliate.slice(0, 8).join('; ')}`);
  });

  prova('lessico vero: la grammatica del file è quella di dati/lessico/_grammatica.json', () => {
    assert.deepEqual(lessico.grammatica, grammatica, 'ricompila con node scripts/costruisci_lessico.mjs');
  });

  prova('lessico vero: nessuna parola della grammatica è anche una scena', () => {
    // Si confrontano le parole come si scrivono: "perù" e "però" hanno la stessa
    // radice, ma la grammatica guarda la parola intera, quindi non si pestano i piedi.
    const g = new Set([...grammatica.negazioni, ...grammatica.separatori].map((p) => parole(p).join(' ')));
    for (const scena of lessico.scene) {
      for (const forma of scena.forme) assert.ok(!g.has(parole(forma).join(' ')), `${scena.chiave}: "${forma}"`);
    }
  });
}

// ------------------------------------------------------------------ esito

console.log(`\n${passate} prove passate, ${fallite.length} fallite.`);
if (fallite.length) process.exit(1);

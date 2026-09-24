// Scenari tipici di taratura: gli stessi per lo strumento da riga di comando
// (scripts/prova_catalogo.mjs) e per l'anteprima "con che risposte esce questo
// profumo?" del backoffice. Modificarli qui li cambia in tutti e due i posti.

export const SCENARI = [
  { nome: 'mare-ufficio-lui', titolo: 'Mare, ufficio, per lui, niente dolce',
    risposte: { per_chi: 'me', genere: 'lui', luogo: ['mare'], esclusioni: ['dolce'], occasione: ['ufficio'], intensita: 2, stagione: 'estate' } },
  { nome: 'regalo-partner-sera', titolo: 'Regalo al partner, città di notte, sera',
    risposte: { per_chi: 'regalo', destinatario: 'partner', genere: 'lei', luogo: ['citta'], occasione: ['serata', 'romantico'], intensita: 4, stagione: 'inverno', carattere: ['sensuale'] } },
  { nome: 'pasticceria-coccola', titolo: 'Pasticceria, coccola, inverno',
    risposte: { per_chi: 'me', genere: 'lei', luogo: ['pasticceria'], carattere: ['coccola'], intensita: 3, stagione: 'inverno' } },
  { nome: 'niente-fiori', titolo: 'Giardino ma niente fiori (risposte in contrasto)',
    risposte: { per_chi: 'me', genere: 'lei', luogo: ['giardino'], esclusioni: ['fiori'], intensita: 3 } },
  { nome: 'bosco-calmo', titolo: 'Bosco, calmo, tutti i giorni',
    risposte: { per_chi: 'me', genere: 'libero', luogo: ['bosco'], carattere: ['calmo'], occasione: ['quotidiano'], intensita: 3, stagione: 'autunno' } },
  { nome: 'spezie-audace', titolo: 'Mercato delle spezie, audace, occasione speciale',
    risposte: { per_chi: 'me', genere: 'lui', luogo: ['spezie'], carattere: ['audace'], occasione: ['speciale'], intensita: 5 } },
  { nome: 'sport-fresco', titolo: 'Sport, agrumeto, niente di forte',
    risposte: { per_chi: 'me', genere: 'lui', luogo: ['agrumeto'], esclusioni: ['forte'], occasione: ['sport'], intensita: 2, stagione: 'estate' } },
  { nome: 'regalo-genitore', titolo: 'Regalo a un genitore, elegante, biblioteca',
    risposte: { per_chi: 'regalo', destinatario: 'genitore', genere: 'lei', luogo: ['biblioteca'], carattere: ['elegante'], intensita: 3 } },
  { nome: 'tropici-allegro', titolo: 'Spiaggia tropicale, allegro, estate',
    risposte: { per_chi: 'me', genere: 'lei', luogo: ['tropici'], carattere: ['allegro'], stagione: 'estate', intensita: 3 } },
  { nome: 'senza-idee', titolo: 'Nessuna idea: solo "per me" e nessun vincolo',
    risposte: { per_chi: 'me', genere: 'libero' } },
  { nome: 'tutti-i-veti', titolo: 'Chi esclude quasi tutto (dolce, fiori, fumo)',
    risposte: { per_chi: 'me', genere: 'libero', esclusioni: ['dolce', 'fiori', 'fumo'], luogo: ['bosco'], intensita: 3 } },
];

/**
 * Ricerche tipiche del secondo percorso (docs/12-ricerca-note.md), usate da
 * scripts/prova_ricerca.mjs e dalla prova della ricerca nel backoffice.
 * Stessa idea degli scenari qui sopra: si leggono a occhio col personale.
 */
export const RICERCHE = [
  { nome: 'cuoio', titolo: 'Solo cuoio', criteri: { note: ['cuoio'] } },
  { nome: 'muschio-leggero', titolo: 'Muschi puliti, qualcosa di discreto', criteri: { accordi: ['muschiato'], intensita: 'leggera' } },
  { nome: 'agrumi-mare', titolo: 'Agrumi e brezza marina', criteri: { accordi: ['agrumato', 'acquatico'] } },
  { nome: 'vaniglia-non-dolce', titolo: 'Vaniglia, ma niente da pasticceria', criteri: { note: ['vaniglia'], escludi: ['gourmand'] } },
  { nome: 'legni-spezie-lui', titolo: 'Legni e spezie, per lui', criteri: { accordi: ['legnoso', 'speziato'], genere: 'uomo' } },
  { nome: 'rosa-lei', titolo: 'Rosa, per lei', criteri: { note: ['rosa'], genere: 'donna' } },
  { nome: 'oud-deciso', titolo: 'Oud, e che si senta', criteri: { accordi: ['oud'], intensita: 'decisa' } },
  { nome: 'tabacco-raro', titolo: 'Tabacco: la famiglia più piccola del catalogo', criteri: { accordi: ['tabacco'] } },
  { nome: 'tre-note', titolo: 'Tre note insieme: bergamotto, sandalo, vaniglia', criteri: { note: ['bergamotto', 'sandalo', 'vaniglia'] } },
  { nome: 'legni-senza-fiori', titolo: 'Legni, senza fiori', criteri: { accordi: ['legnoso'], escludi: ['floreale-bianco', 'rosa'] } },
  { nome: 'impossibile', titolo: 'Una combinazione quasi impossibile: tè, cuoio e note solari', criteri: { accordi: ['tè', 'cuoio', 'solare'] } },
];

/**
 * Frasi tipiche del consulente a parole (docs/13-consulente.md): come le direbbe
 * un cliente al chiosco. Le usano scripts/test_consulente.mjs (come prova sul
 * catalogo vero), scripts/prova_consulente.mjs (da leggere a occhio) e la prova
 * del consulente nel backoffice.
 *
 * `attese` dice cosa deve succedere, in termini di catalogo e non di scene, così
 * resta valido quando il lessico cresce:
 *   famiglie: almeno `almeno` delle tre proposte (2 se non detto) hanno una di
 *             queste famiglie a 0,3 o più;
 *   note:     almeno una delle tre ha in piramide una di queste note;
 *   vietate:  nessuna delle tre ha una di queste famiglie a 0,5 o più;
 *   genere:   nessuna delle tre è dell'altro genere;
 *   dolcezza / intensita / freschezza: { max } o { min } sulla media delle tre.
 */
export const FRASI = [
  // luoghi
  { frase: "Vorrei un profumo fresco, che mi ricordi un bosco d'inverno", attese: { famiglie: ['legnoso', 'verde', 'aromatico'], vietate: ['gourmand'] } },
  { frase: 'Qualcosa che sappia di mare, di spiaggia d\'estate', attese: { famiglie: ['acquatico', 'agrumato', 'solare'], vietate: ['gourmand', 'oud'] } },
  { frase: 'il profumo della montagna, aria pulita', attese: { famiglie: ['verde', 'aromatico', 'legnoso', 'muschiato', 'acquatico'] } },
  { frase: 'un giardino fiorito in primavera', attese: { famiglie: ['floreale-fresco', 'floreale-bianco', 'rosa', 'verde'] } },
  { frase: 'un campo di lavanda in Provenza', attese: { famiglie: ['aromatico'], note: ['lavanda'] } },
  { frase: 'mi fa pensare a un deserto caldo, sabbia e spezie', attese: { famiglie: ['ambrato', 'speziato', 'oud', 'legnoso'] } },
  { frase: 'una biblioteca antica, libri e legno', attese: { famiglie: ['legnoso', 'cuoio', 'tabacco', 'incenso', 'ambrato'] } },
  { frase: 'una chiesa, con l\'incenso', attese: { famiglie: ['incenso', 'ambrato', 'legnoso'], note: ['incenso'] } },
  { frase: 'una spa, qualcosa di rilassante e pulito', attese: { famiglie: ['muschiato', 'aromatico', 'verde', 'acquatico', 'tè', 'floreale-fresco'], vietate: ['oud', 'gourmand'] } },
  { frase: "un'isola tropicale, cocco e fiori", attese: { famiglie: ['solare', 'floreale-bianco', 'fruttato'] } },
  { frase: 'dopo la pioggia, la terra bagnata', attese: { famiglie: ['verde', 'patchouli', 'legnoso', 'acquatico'] } },
  { frase: 'una baita di montagna col camino acceso', attese: { famiglie: ['legnoso', 'incenso', 'ambrato', 'cuoio', 'tabacco'], vietate: ['acquatico'] } },
  // cibi
  { frase: 'qualcosa che sappia di caffè e cioccolato', attese: { famiglie: ['gourmand', 'vaniglia', 'ambrato'], note: ['caffè', 'cacao', 'cioccolato'] } },
  { frase: 'una pasticceria, dolce e goloso', attese: { famiglie: ['gourmand', 'vaniglia'], dolcezza: { min: 3.5 } } },
  { frase: 'i frutti rossi, fragole e lamponi', attese: { famiglie: ['fruttato'], note: ['lampone', 'fragola', 'frutti rossi', 'ribes nero', 'ciliegia'] } },
  { frase: 'la torta di mele con la cannella', attese: { famiglie: ['gourmand', 'fruttato', 'speziato', 'vaniglia'] } },
  { frase: 'un gelato al pistacchio', attese: { famiglie: ['gourmand', 'vaniglia'], note: ['pistacchio', 'mandorla'], almeno: 1 } },
  // Qui può uscire un agrumato con un fondo di oud (sul catalogo di oggi il 530):
  // la scheda dice agrumi a 1, ed è una proposta da provare, non un errore.
  { frase: 'agrumi, limone e arancia, frizzante', attese: { famiglie: ['agrumato'], almeno: 3, vietate: ['gourmand'], freschezza: { min: 3.5 } } },
  { frase: 'miele e fiori d\'arancio', attese: { famiglie: ['miele', 'floreale-bianco', 'ambrato'], note: ['miele', "fiore d'arancio"] } },
  { frase: 'le castagne arrostite d\'autunno', attese: { famiglie: ['gourmand', 'legnoso', 'vaniglia', 'ambrato'] } },
  // bevande
  { frase: 'un mojito d\'estate', attese: { famiglie: ['agrumato', 'aromatico', 'verde', 'boozy'], vietate: ['oud'] } },
  { frase: 'un tè verde, sobrio', attese: { famiglie: ['tè', 'verde', 'agrumato', 'muschiato'], almeno: 1 } },
  { frase: 'whisky e tabacco, qualcosa di maschile', attese: { famiglie: ['boozy', 'tabacco', 'cuoio', 'legnoso', 'ambrato'], genere: 'uomo' } },
  { frase: 'un bicchiere di rum invecchiato', attese: { famiglie: ['boozy', 'vaniglia', 'ambrato', 'legnoso', 'tabacco', 'gourmand'] } },
  { frase: 'champagne e festa', attese: { famiglie: ['fruttato', 'agrumato', 'floreale-fresco', 'floreale-bianco', 'boozy', 'muschiato'] } },
  { frase: 'una cioccolata calda davanti al camino', attese: { famiglie: ['gourmand', 'vaniglia', 'ambrato'], note: ['cacao', 'cioccolato'] } },
  { frase: 'vorrei un profumo che sappia di vino rosso', attese: { famiglie: ['fruttato', 'boozy', 'speziato', 'legnoso', 'rosa', 'ambrato'] } },
  // situazioni e persone
  { frase: 'per un colloquio di lavoro, qualcosa di discreto', attese: { famiglie: ['muschiato', 'agrumato', 'aromatico', 'cipriato', 'floreale-fresco', 'tè', 'legnoso', 'verde'], intensita: { max: 3.5 }, vietate: ['oud', 'gourmand'] } },
  { frase: 'per un primo appuntamento, sensuale', attese: { famiglie: ['ambrato', 'vaniglia', 'floreale-bianco', 'muschiato', 'legnoso', 'rosa', 'speziato'] } },
  { frase: 'per andare in palestra, fresco e leggero', attese: { famiglie: ['agrumato', 'acquatico', 'aromatico', 'verde', 'muschiato'], vietate: ['oud', 'gourmand'], freschezza: { min: 3.5 } } },
  { frase: 'per mio marito, elegante, per la sera', attese: { famiglie: ['legnoso', 'ambrato', 'speziato', 'cuoio', 'aromatico', 'oud', 'incenso', 'tabacco'], genere: 'uomo' } },
  { frase: 'un regalo per mia mamma, qualcosa di elegante e floreale', attese: { famiglie: ['floreale-fresco', 'floreale-bianco', 'rosa', 'cipriato'], genere: 'donna' } },
  { frase: 'per una ragazza giovane, allegro e fruttato', attese: { famiglie: ['fruttato', 'floreale-fresco', 'agrumato'], genere: 'donna' } },
  { frase: 'per tutti i giorni in ufficio', attese: { famiglie: ['muschiato', 'agrumato', 'aromatico', 'floreale-fresco', 'legnoso', 'cipriato', 'verde', 'tè'], intensita: { max: 3.6 } } },
  { frase: 'per una serata in discoteca, che si senta', attese: { famiglie: ['ambrato', 'vaniglia', 'gourmand', 'speziato', 'fruttato', 'oud', 'legnoso', 'floreale-bianco'], intensita: { min: 3 } } },
  { frase: 'per il matrimonio di mia sorella', attese: { famiglie: ['floreale-bianco', 'floreale-fresco', 'rosa', 'cipriato', 'muschiato', 'fruttato'], genere: 'donna' } },
  // momenti, sensazioni, ricordi
  { frase: 'una sera d\'inverno, caldo e avvolgente', attese: { famiglie: ['ambrato', 'vaniglia', 'legnoso', 'speziato', 'oud', 'gourmand', 'incenso', 'tabacco'], vietate: ['acquatico'] } },
  { frase: 'pulito, come il bucato steso al sole', attese: { famiglie: ['muschiato', 'floreale-fresco', 'agrumato', 'aromatico'], vietate: ['oud', 'gourmand'] } },
  { frase: 'misterioso e scuro', attese: { famiglie: ['oud', 'incenso', 'cuoio', 'patchouli', 'ambrato', 'legnoso', 'tabacco'] } },
  { frase: 'la casa della nonna', attese: { famiglie: ['cipriato', 'floreale-fresco', 'rosa', 'muschiato', 'aromatico', 'vaniglia', 'floreale-bianco', 'gourmand'] } },
  { frase: 'il dopobarba di mio papà', attese: { famiglie: ['aromatico', 'agrumato', 'legnoso', 'muschiato'], genere: 'uomo' } },
  { frase: 'la crema solare delle vacanze da bambino', attese: { famiglie: ['solare', 'floreale-bianco', 'vaniglia', 'muschiato'] } },
  { frase: 'Natale, spezie e mandarino', attese: { famiglie: ['speziato', 'agrumato', 'ambrato', 'gourmand', 'vaniglia'] } },
  { frase: 'il colore blu, profondo', attese: { famiglie: ['acquatico', 'aromatico', 'legnoso', 'agrumato', 'ambrato', 'muschiato'] } },
  // negazioni e sfumature
  { frase: 'vaniglia ma non troppo dolce', attese: { famiglie: ['vaniglia'], note: ['vaniglia'], dolcezza: { max: 4 } } },
  { frase: 'fresco ma niente agrumi', attese: { famiglie: ['acquatico', 'aromatico', 'verde', 'muschiato', 'floreale-fresco', 'tè'], vietate: ['agrumato'] } },
  { frase: 'legnoso, senza fiori', attese: { famiglie: ['legnoso'], vietate: ['floreale-bianco', 'rosa'] } },
  { frase: 'odio il dolce, vorrei qualcosa di speziato', attese: { famiglie: ['speziato'], vietate: ['gourmand'], dolcezza: { max: 3.2 } } },
  { frase: 'il mare sì, ma niente di troppo forte', attese: { famiglie: ['acquatico', 'agrumato', 'solare'], intensita: { max: 3.6 } } },
];

const quanteFamiglie = (p, famiglie, soglia) => famiglie.some((f) => ((p.accordi || {})[f] || 0) >= soglia);

/**
 * Le attese di una frase, controllate sulle tre proposte del consulente.
 * Torna l'elenco di quello che non va: vuoto vuol dire che la frase è andata bene.
 */
export function controllaAttese(esito, attese) {
  const problemi = [];
  const tre = esito.proposte.map((p) => p.profilo);
  if (tre.length < 3) problemi.push(`solo ${tre.length} proposte`);
  if (attese.famiglie) {
    const almeno = attese.almeno ?? 2;
    const prese = tre.filter((p) => quanteFamiglie(p, attese.famiglie, 0.3)).length;
    if (prese < almeno) problemi.push(`famiglie ${attese.famiglie.join('/')}: ${prese} su 3 (ne servono ${almeno})`);
  }
  if (attese.note) {
    const volute = new Set(attese.note);
    const ok = tre.some((p) => ['testa', 'cuore', 'fondo'].some((f) => (p[f] || []).some((n) => volute.has(n))));
    if (!ok) problemi.push(`nessuna delle tre ha ${attese.note.join('/')}`);
  }
  if (attese.vietate) {
    const colpite = tre.filter((p) => quanteFamiglie(p, attese.vietate, 0.5)).map((p) => p.codice);
    if (colpite.length) problemi.push(`vietate ${attese.vietate.join('/')} in ${colpite.join(', ')}`);
  }
  if (attese.genere) {
    const altro = attese.genere === 'uomo' ? 'donna' : 'uomo';
    const sbagliati = tre.filter((p) => p.genere === altro).map((p) => p.codice);
    if (sbagliati.length) problemi.push(`genere sbagliato: ${sbagliati.join(', ')}`);
  }
  for (const misura of ['dolcezza', 'intensita', 'freschezza']) {
    const regola = attese[misura];
    if (!regola || !tre.length) continue;
    const media = tre.reduce((s, p) => s + (p[misura] || 0), 0) / tre.length;
    if ('max' in regola && media > regola.max) problemi.push(`${misura} media ${media.toFixed(1)} > ${regola.max}`);
    if ('min' in regola && media < regola.min) problemi.push(`${misura} media ${media.toFixed(1)} < ${regola.min}`);
  }
  return problemi;
}

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

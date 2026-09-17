#!/usr/bin/env python3
"""Estrae le piramidi olfattive dalle card PDF del fornitore.

    python3 scripts/estrai_piramidi.py [cartella] [uscita]

Cartella predefinita: "Piramidi Olfattive" (in .gitignore: contiene i nomi
commerciali nei nomi dei file). Uscita predefinita: dati/piramidi.json.

Il file prodotto contiene SOLO codice, categoria, famiglia e note: nessun nome
commerciale, quindi e' versionabile.

Ogni card e' un PDF di una pagina: codice in alto, una o piu' righe di famiglia,
poi la piramide a tre livelli (testa, cuore, fondo). Undici card sono state
corrette a mano dal fornitore con annotazioni (rettangoli pieni che coprono il
testo vecchio e caselle di testo con quello nuovo): il testo coperto va
scartato, quello delle annotazioni va tenuto.

Serve pymupdf:  pip3 install pymupdf
"""

import json
import os
import re
import sys
from collections import Counter

import pymupdf

CARTELLA_PREDEFINITA = 'Piramidi Olfattive'
USCITA_PREDEFINITA = 'dati/piramidi.json'
Y_FAMIGLIA = 45      # sopra questa quota c'e' solo il codice
Y_NOTE = 75          # da qui in giu' ci sono le note della piramide
SALTO_LIVELLO = 10   # distacco verticale fra un livello e l'altro
SENZA_PIRAMIDE = ('586', '587')   # feromoni: la card non ha la piramide


def righe_di(oggetto):
    """Righe di testo con la posizione della linea di base (affidabile anche
    quando il riquadro dichiarato dal PDF e' sballato)."""
    righe = []
    for blocco in oggetto.get_text('dict')['blocks']:
        for linea in blocco.get('lines', []):
            for pezzo in linea['spans']:
                testo = re.sub(r'\s+', ' ', pezzo['text']).strip()
                if testo:
                    righe.append({
                        'testo': testo.upper(),
                        'y': round(pezzo['origin'][1], 1),
                        'x': round(pezzo['origin'][0], 1),
                        'corpo': round(pezzo['size'], 1),
                    })
    return righe


def leggi_card(percorso):
    """Righe visibili della card: annotazioni comprese, testo coperto escluso."""
    documento = pymupdf.open(percorso)
    pagina = documento[0]
    coperture, correzioni = [], []
    for annotazione in pagina.annots():
        tipo = annotazione.type[1]
        if tipo == 'Square':
            coperture.append(annotazione.rect)
        elif tipo == 'FreeText':
            correzioni += righe_di(annotazione)
    gia_prese = {(r['testo'], r['y']) for r in correzioni}

    visibili = list(correzioni)
    for riga in righe_di(pagina):
        if (riga['testo'], riga['y']) in gia_prese:
            continue                      # e' il testo di una correzione, gia' preso
        y_visiva = riga['y'] - riga['corpo'] * 0.3
        if any(r.x0 - 1 <= riga['x'] <= r.x1 + 1 and r.y0 - 1 <= y_visiva <= r.y1 + 1 for r in coperture):
            continue                      # coperto da una correzione
        visibili.append(riga)
    documento.close()
    visibili.sort(key=lambda r: (r['y'], r['x']))
    return visibili


def scheda_da_card(percorso, categoria):
    nome = os.path.basename(percorso)
    codice = re.match(r'^(\d{3})', nome).group(1)
    righe = leggi_card(percorso)

    codici = [r['testo'] for r in righe if re.fullmatch(r'\d{3}', r['testo'])]
    famiglia = [r['testo'] for r in righe
                if not re.fullmatch(r'\d{3}', r['testo']) and Y_FAMIGLIA <= r['y'] < Y_NOTE]

    livelli, corrente, precedente = [], [], None
    for riga in [r for r in righe if r['y'] >= Y_NOTE]:
        if precedente is not None and riga['y'] - precedente > SALTO_LIVELLO:
            livelli.append(corrente)
            corrente = []
        corrente.append(riga['testo'])
        precedente = riga['y']
    if corrente:
        livelli.append(corrente)

    scheda = {'codice': codice, 'categoria': categoria, 'famiglia': famiglia,
              'testa': [], 'cuore': [], 'fondo': []}
    avvisi = []
    if len(livelli) == 3:
        scheda['testa'], scheda['cuore'], scheda['fondo'] = livelli
    elif codice not in SENZA_PIRAMIDE:
        scheda['livelli_grezzi'] = livelli
        avvisi.append(f'{len(livelli)} livelli invece di 3')
    if codice not in codici:
        avvisi.append(f'il codice sulla card non corrisponde al nome del file: {codici or "assente"}')
    if not famiglia and codice not in SENZA_PIRAMIDE:
        avvisi.append('famiglia assente')
    return scheda, avvisi


def main():
    cartella = sys.argv[1] if len(sys.argv) > 1 else CARTELLA_PREDEFINITA
    uscita = sys.argv[2] if len(sys.argv) > 2 else USCITA_PREDEFINITA
    if not os.path.isdir(cartella):
        sys.exit(f'Cartella non trovata: {cartella}')

    schede, avvisi = [], []
    for radice, _, nomi in os.walk(cartella):
        categoria = os.path.basename(radice)
        categoria = re.sub(r'^\d+\s*', '', categoria) if radice != cartella else ''
        for nome in sorted(nomi):
            if not nome.lower().endswith('.pdf'):
                continue
            if not re.match(r'^\d{3}', nome):
                avvisi.append((nome, 'il nome del file non inizia con il codice'))
                continue
            scheda, problemi = scheda_da_card(os.path.join(radice, nome), categoria)
            schede.append(scheda)
            avvisi += [(nome, p) for p in problemi]

    schede.sort(key=lambda s: s['codice'])
    doppioni = [c for c, n in Counter(s['codice'] for s in schede).items() if n > 1]
    if doppioni:
        avvisi.append(('—', f'codici presenti piu\' di una volta: {sorted(doppioni)}'))

    os.makedirs(os.path.dirname(uscita) or '.', exist_ok=True)
    with open(uscita, 'w', encoding='utf-8') as f:
        json.dump(schede, f, ensure_ascii=False, indent=1)
        f.write('\n')

    note = Counter(n for s in schede for n in s['testa'] + s['cuore'] + s['fondo'])
    print(f'Card lette: {len(schede)} -> {uscita}')
    print(f'Con piramide completa: {sum(1 for s in schede if s["testa"])}')
    print(f'Note citate: {sum(note.values())} ({len(note)} diverse)')
    print(f'Avvisi: {len(avvisi)}')
    for nome, problema in avvisi:
        print(f'  - {nome}: {problema}')


if __name__ == '__main__':
    main()

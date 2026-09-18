// Service worker: il chiosco deve funzionare anche senza rete.
// Alla prima visita mette in cache il guscio dell'app e i dati di partenza;
// poi serve dalla cache e aggiorna in sottofondo.

const CACHE = 'consulente-v4';   // si alza a ogni pubblicazione che cambia file o dati

const GUSCIO = [
  './',
  'index.html',
  'style.css',
  'manifest.json',
  'fonts/assistant.css',
  'fonts/assistant-latin.woff2',
  'fonts/assistant-latin-ext.woff2',
  'img/logo.svg',
  'img/favicon.svg',
  'img/icona-180.png',
  'img/icona-192.png',
  'img/icona-512.png',
  'js/app.js',
  'js/motore.js',
  'js/percorso.js',
  'js/risultati.js',
  'js/backoffice.js',
  'js/editor-domande.js',
  'js/store-locale.js',
  'js/statistiche.js',
  'js/scenari.js',
  'js/dati.js',
  'js/icone.js',
  'js/ui.js',
  'config/accordi.json',
  'config/domande.json',
  'config/pesi.json',
  'config/frasi.json',
  'config/testi.json',
  'dati/catalogo.json',
  'dati/profili.json',
  '../dati/catalogo.json',
  '../dati/profili.json',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Sempre dalla rete, mai dalla cache del browser: mescolare file di due
    // versioni diverse rompe l'app (un modulo nuovo che importa da uno vecchio).
    // Uno alla volta: un file mancante (i due percorsi di dati/) non deve far fallire tutto.
    await Promise.all(GUSCIO.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  if (new URL(richiesta.url).origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const salvata = await cache.match(richiesta, { ignoreSearch: true });
    const dallaRete = fetch(richiesta).then((risposta) => {
      if (risposta && risposta.ok) cache.put(richiesta, risposta.clone());
      return risposta;
    }).catch(() => null);
    return salvata || (await dallaRete) || new Response('Non disponibile offline', { status: 503 });
  })());
});

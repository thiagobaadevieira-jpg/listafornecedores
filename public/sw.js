const CACHE_NAME = 'controle-gastos-v2';
// Apenas assets estáticos com hash (JS/CSS via Vite) são cacheados
// HTML NUNCA é cacheado pelo SW para garantir sempre o código mais recente

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Ativa imediatamente sem esperar fechar as abas antigas
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Apaga todos os caches antigos (v1, etc.)
          }
        })
      );
    })
  );
  self.clients.claim(); // Assume controle imediato de todas as abas
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora requests não-GET e requests para domínios externos (ex: Supabase API)
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // NUNCA cacheia navegação HTML — sempre busca da rede para garantir versão atual
  if (request.mode === 'navigate' || request.url.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Para assets com hash no nome (JS/CSS gerados pelo Vite): cache-first
  // Esses arquivos mudam de nome a cada build, então são seguros para cachear
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      }).catch(() => {});
    })
  );
});

const CACHE_NAME = 'controle-gastos-v4';
// Assets estáticos (JS/CSS via Vite) + fotos do Supabase Storage são cacheados
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

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Bras Conect';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-icon.png',
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ─── Fetch (cache) ────────────────────────────────────────────────────────────

const SUPABASE_STORAGE = 'vguvwtqobrhhexenpvpb.supabase.co/storage';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Ignora requests não-GET
  if (request.method !== 'GET') return;

  // NUNCA cacheia navegação HTML — sempre busca da rede para garantir versão atual
  if (request.mode === 'navigate' || url.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Fotos do Supabase Storage (fornecedores, banners, avatars, logo): cache-first
  // Cada upload gera URL única com timestamp, então novas fotos nunca estão em cache
  if (url.includes(SUPABASE_STORAGE)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
          return response;
        }).catch(() => {});
      })
    );
    return;
  }

  // Assets estáticos locais (JS/CSS gerados pelo Vite com hash): cache-first
  if (!url.startsWith(self.location.origin)) return;

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

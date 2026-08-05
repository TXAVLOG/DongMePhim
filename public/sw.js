const CACHE_NAME = 'dongphim-v1';
const VIDEO_CACHE_NAME = 'dongmephim-video-cache';
const OFFLINE_URL = '/offline';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/favicon.ico',
  '/favicon.png',
  '/logo-icon.gif',
  '/logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-192x192.png',
  '/icon-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== VIDEO_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

async function getOfflineFallback() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(OFFLINE_URL);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (err) {
    console.error('[SW] Error retrieving offline fallback:', err);
  }
  
  return new Response('Bạn đang ngoại tuyến. Vui lòng kiểm tra kết nối mạng và thử lại.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
  });
}

// ═══════════════════════════════════════════════════════════════
// HLS Streams Caching & Prefetching Logic
// ═══════════════════════════════════════════════════════════════

async function prefetchHlsStream(streamUrl) {
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    
    // Fetch and cache the m3u8 playlist
    const res = await fetch(streamUrl);
    if (!res.ok) return;
    
    const playlistText = await res.clone().text();
    await cache.put(streamUrl, res);
    
    const lines = playlistText.split('\n');
    const segmentUrls = [];
    const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        let fullUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          fullUrl = new URL(trimmed, baseUrl).href;
        }
        segmentUrls.push(fullUrl);
      }
    }
    
    // Cache the first 3 segments
    const firstThree = segmentUrls.slice(0, 3);
    for (const fullUrl of firstThree) {
      try {
        const cached = await cache.match(fullUrl);
        if (!cached) {
          const segRes = await fetch(fullUrl);
          if (segRes.ok) {
            await cache.put(fullUrl, segRes);
          }
        }
      } catch (e) {
        console.warn('[SW] Prefetch failed for segment:', fullUrl, e);
      }
    }
    console.log('[SW] Prefetched next episode HLS playlist and first 3 segments successfully.');
  } catch (err) {
    console.warn('[SW] Prefetch HLS failed:', err);
  }
}

async function downloadHlsStream(streamUrl, episodeName, client) {
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    
    // 1. Fetch playlist
    const res = await fetch(streamUrl);
    if (!res.ok) throw new Error('Không thể tải danh sách tập phim (m3u8)');
    
    const playlistText = await res.clone().text();
    await cache.put(streamUrl, res);
    
    // 2. Parse segments
    const lines = playlistText.split('\n');
    const segmentUrls = [];
    const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        let fullUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          fullUrl = new URL(trimmed, baseUrl).href;
        }
        segmentUrls.push(fullUrl);
      }
    }
    
    const totalSegments = segmentUrls.length;
    if (totalSegments === 0) {
      if (client) {
        client.postMessage({ type: 'DOWNLOAD_COMPLETE', streamUrl, episodeName });
      }
      return;
    }
    
    // 3. Download segments concurrently (concurrency limit of 3)
    let downloadedCount = 0;
    const queue = [...segmentUrls];
    
    const downloadWorker = async () => {
      while (queue.length > 0) {
        const fullUrl = queue.shift();
        if (!fullUrl) break;
        
        try {
          const cached = await cache.match(fullUrl);
          if (!cached) {
            const segRes = await fetch(fullUrl);
            if (segRes.ok) {
              await cache.put(fullUrl, segRes);
            } else {
              throw new Error(`Segment fetch status ${segRes.status}`);
            }
          }
          downloadedCount++;
          
          const progress = Math.round((downloadedCount / totalSegments) * 100);
          if (client) {
            client.postMessage({ 
              type: 'DOWNLOAD_PROGRESS', 
              streamUrl, 
              episodeName, 
              progress,
              downloaded: downloadedCount,
              total: totalSegments
            });
          }
        } catch (e) {
          console.warn('[SW] Segment download failed:', fullUrl, e);
        }
      }
    };
    
    // Run 3 workers in parallel
    await Promise.all([downloadWorker(), downloadWorker(), downloadWorker()]);
    
    if (client) {
      client.postMessage({ type: 'DOWNLOAD_COMPLETE', streamUrl, episodeName });
    }
    
  } catch (err) {
    console.error('[SW] Download stream failed:', err);
    if (client) {
      client.postMessage({ type: 'DOWNLOAD_FAILED', streamUrl, episodeName, error: err.message });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Fetch Interception
// ═══════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip external ad networks, tracking, or cross-origin endpoints unless it's a media stream
  const isSelfOrigin = url.origin === self.location.origin;
  const isVideoSegment = url.pathname.endsWith('.ts') || url.pathname.endsWith('.m4s') || url.pathname.includes('/index.m3u8') || url.pathname.endsWith('.m3u8');
  
  if (!isSelfOrigin && !isVideoSegment) {
    return;
  }

  // Caching strategy for HLS video segments (Cache-First)
  if (isVideoSegment) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // If downloading live, optionally cache if CORS allows
          return response;
        });
      })
    );
    return;
  }

  // Caching strategy for local APIs (Network-First with Cache fallback)
  if (url.pathname.startsWith('/api/app/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response(JSON.stringify({ 
              status: 'error', 
              success: false, 
              message: 'Bạn đang ngoại tuyến. Dữ liệu chưa được tải.' 
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
          });
        })
    );
    return;
  }

  // Caching strategy for same-origin static assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && (
          url.pathname.startsWith('/assets/') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.gif') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.js') ||
          url.pathname.startsWith('/fonts/')
        )) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        if (event.request.mode === 'navigate') {
          return getOfflineFallback();
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// SW Client Messaging
// ═══════════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  
  if (data.type === 'PREFETCH_EPISODE') {
    prefetchHlsStream(data.streamUrl);
  } else if (data.type === 'DOWNLOAD_EPISODE') {
    downloadHlsStream(data.streamUrl, data.episodeName, event.source);
  }
});

// ═══════════════════════════════════════════════════════════════
// Web Push Notifications
// ═══════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  let payload = { title: 'WebFilm', body: 'Có phim mới vừa cập nhật, xem ngay!' };
  
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      payload = { title: 'WebFilm', body: event.data.text() };
    }
  }
  
  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: '/favicon.png',
    image: payload.image || undefined,
    data: {
      url: payload.url || '/tphim'
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'watch', title: 'Xem Ngay', icon: '/favicon.png' },
      { action: 'close', title: 'Đóng' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const clickActionUrl = event.notification.data?.url || '/tphim';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find open browser tab for WebFilm and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(clickActionUrl).then((c) => c.focus());
        }
      }
      // Open new tab if none open
      if (clients.openWindow) {
        return clients.openWindow(clickActionUrl);
      }
    })
  );
});

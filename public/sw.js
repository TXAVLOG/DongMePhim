const CACHE_NAME = 'dongphim-v1';
const OFFLINE_URL = '/offline';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/favicon.ico',
  '/favicon.png',
  '/logo-icon.gif',
  '/logo.png'
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
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

async function getOfflineFallback(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(OFFLINE_URL);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (err) {
    console.error('[SW] Error retrieving offline fallback:', err);
  }
  
  // Return a basic fallback response if even the cache fails
  return new Response('Bạn đang ngoại tuyến. Vui lòng kiểm tra lại kết nối mạng.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
  });
}

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local/same-origin or safe external resource requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip external APIs, analytics, or ad network beacons
  if (url.origin !== self.location.origin) {
    // If it's a cross-origin request, we don't handle caching unless it's static/critical
    // But we still catch failures to avoid uncaught promise rejections
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('[SW] Cross-origin fetch failed:', url.href, err);
        return new Response('Network error', { status: 408 });
      })
    );
    return;
  }

  // Handle same-origin requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone and cache it for static assets
        if (response.ok && (
          url.pathname.startsWith('/assets/') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.gif') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.js')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async (error) => {
        console.warn('[SW] Fetch failed, checking cache or returning offline page:', url.pathname, error);
        
        // Check cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If user is navigating to a page, return the offline fallback
        if (event.request.mode === 'navigate') {
          return getOfflineFallback(event.request);
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

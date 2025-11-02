// Service Worker for Albert3 Muse Synth Studio
// Version 2.4.1 - Production Only

const CACHE_VERSION = 'v2.4.1';
const CACHE_NAME = `albert3-cache-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Audio files cache (separate from static)
const AUDIO_CACHE_NAME = `albert3-audio-${CACHE_VERSION}`;

// API responses cache
const API_CACHE_NAME = `albert3-api-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  cacheFirst: 'cache-first',
  networkFirst: 'network-first',
  staleWhileRevalidate: 'stale-while-revalidate',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    }).then(() => {
      console.log('[SW] Service worker installed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== AUDIO_CACHE_NAME && 
              cacheName !== API_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip all dev/Vite requests
  if (url.pathname.startsWith('/src/') || 
      url.pathname.startsWith('/node_modules/') ||
      url.pathname.startsWith('/@vite') ||
      url.pathname.startsWith('/__vite') ||
      url.pathname.startsWith('/@react-refresh') ||
      request.destination === 'document') {
    return;
  }

  // Strategy 1: Audio files - Cache First with Network Fallback
  if (request.url.includes('.mp3') || request.url.includes('.wav') || request.url.includes('/audio/')) {
    event.respondWith(cacheFirstStrategy(request, AUDIO_CACHE_NAME));
    return;
  }

  // Strategy 2: API calls - Network First with Cache Fallback
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }

  // Strategy 3: Static assets - Stale While Revalidate (production builds only)
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidateStrategy(request, CACHE_NAME));
    return;
  }

  // Only cache production-built JS/CSS (in /assets/)
  if ((request.destination === 'script' || request.destination === 'style') && 
      url.pathname.match(/^\/assets\/.+\.(js|css)$/)) {
    event.respondWith(staleWhileRevalidateStrategy(request, CACHE_NAME));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Network First Strategy
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});


const CACHE_NAME = 'salou-ai-assistant-v1';
const assetsToCache = [
  '/',
  '/index.html',
  // Assuming 'index.js' is the compiled main JavaScript bundle generated from index.tsx
  // If your build process outputs a different name (e.g., 'main.js', 'bundle.js'), please update this.
  '/index.js', 
  '/manifest.json',
  // Essential CSS from TailwindCSS CDN
  'https://cdn.tailwindcss.com',
  // Google Fonts (Cairo)
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap',
  // Example for a specific Cairo font file (actual URL might vary based on user's browser/OS)
  // You might need to inspect network requests to get exact font URLs to cache reliably.
  'https://fonts.gstatic.com/s/cairo/v19/SLXGc1nY6HfvXFKuYjpp_w.woff2', 
  // CDN for React and GenAI SDK (based on importmap in index.html)
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0', // Ensure both react@^19.2.0/ and react@^19.2.0 are covered if used differently
  'https://aistudiocdn.com/@google/genai@^1.28.0',
  // Background images (hardcoded in App.tsx)
  'https://picsum.photos/1920/1080',
  'https://picsum.photos/1920/1080?grayscale',
  // Placeholder for PWA icons - these image files need to be created in the /icons directory
  '/icons/salou-icon-192x192.png',
  '/icons/salou-icon-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all app shell content');
        return cache.addAll(assetsToCache).catch(error => {
          console.error('[Service Worker] Failed to cache some assets:', error);
          // Log specific failed requests if needed for debugging cache issues
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }

        // If not in cache, fetch from the network
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and can only be consumed once. We must clone it so that
            // both the browser and the cache can consume it.
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
          console.error('[Service Worker] Fetch failed:', error);
          // Optional: Return an offline fallback page or asset here
          // For example: caches.match('/offline.html');
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  // Delete old caches not in the whitelist
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
    
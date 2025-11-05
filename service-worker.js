const CACHE_NAME = 'salou-ai-assistant-v3';
const assetsToCache = [
  // Core files
  '/',
  'index.html',
  'manifest.json',
  'service-worker.js',

  // TypeScript/React source files
  'index.tsx',
  'App.tsx',
  'types.ts',
  'components/AssistantWidget.tsx',
  'components/ChatBubble.tsx',
  'components/icons/BotIcon.tsx',
  'components/icons/EndCallIcon.tsx',
  'components/icons/InstallIcon.tsx',
  'components/icons/MicIcon.tsx',
  'components/icons/SalouAvatar.tsx',
  'components/icons/SendIcon.tsx',
  'components/icons/StopIcon.tsx',
  'components/icons/VideoIcon.tsx',
  'hooks/usePWAInstall.ts',
  'hooks/useSpeechRecognition.ts',
  'services/geminiService.ts',
  'utils/audioUtils.ts',

  // PWA Icons
  'icons/salou-icon-192x192.png',
  'icons/salou-icon-512x512.png',

  // External assets from CDNs
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/@google/genai@^1.28.0',
  
  // Background images
  'https://picsum.photos/1920/1080',
  'https://picsum.photos/1920/1080?grayscale',
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all app shell content');
        return cache.addAll(assetsToCache).catch(error => {
          console.error('[Service Worker] Failed to cache some assets:', error);
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
          console.error('[Service Worker] Fetch failed:', error);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
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
// Service Worker для кэширования аудио файлов
const CACHE_NAME = 'albert-muse-audio-cache-v1';
const AUDIO_CACHE_NAME = 'albert-muse-audio-files-v1';
const STATIC_CACHE_NAME = 'albert-muse-static-v1';

// Файлы для кэширования при установке
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Максимальный размер кэша аудио файлов (100MB)
const MAX_AUDIO_CACHE_SIZE = 100 * 1024 * 1024;
// Максимальное количество аудио файлов в кэше
const MAX_AUDIO_FILES = 50;

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker');
  
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_CACHE_NAME);
      console.log('[SW] Кэширование статических файлов');
      try {
        // Пытаемся закэшировать все сразу
        await cache.addAll(STATIC_FILES);
      } catch (e) {
        // Если какая-то запись недоступна, пробуем по одной и не падаем
        console.warn('[SW] addAll не удалось, кэшируем по одному:', e);
        for (const url of STATIC_FILES) {
          try {
            const resp = await fetch(url, { cache: 'no-store' });
            if (resp.ok) {
              await cache.put(url, resp.clone());
            } else {
              console.warn('[SW] Пропуск файла (не ok):', url, resp.status);
            }
          } catch (singleErr) {
            console.warn('[SW] Пропуск файла (ошибка):', url, singleErr);
          }
        }
      }
      console.log('[SW] Service Worker установлен');
    } finally {
      await self.skipWaiting();
    }
  })());
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем старые кэши
            if (cacheName !== CACHE_NAME && 
                cacheName !== AUDIO_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker активирован');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET и префлайт запросы
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Явно пропускаем Supabase API-запросы (кроме явных аудио по расширению)
  if (url.hostname.endsWith('supabase.co') && !isAudioFileByExtension(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Кэшируем только аудио файлы по расширению
  if (isAudioFileByExtension(request.url)) {
    event.respondWith(handleAudioRequest(request));
  }
  // Кэшируем статические файлы
  else if (isStaticFile(request.url)) {
    event.respondWith(handleStaticRequest(request));
  }
  // Остальные запросы проходят без кэширования
  else {
    event.respondWith(fetch(request));
  }
});

// Проверка, является ли файл аудио
function isAudioFileByExtension(url) {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  const u = url.toLowerCase();
  return audioExtensions.some(ext => u.includes(ext));
}

// Проверка, является ли файл статическим
function isStaticFile(url) {
  const staticExtensions = ['.js', '.css', '.html', '.png', '.jpg', '.svg', '.ico'];
  return staticExtensions.some(ext => url.includes(ext)) || url.endsWith('/');
}

// Обработка запросов аудио файлов
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Аудио файл найден в кэше:', request.url);
    return cachedResponse;
  }
  
  try {
    console.log('[SW] Загрузка аудио файла:', request.url);
    const response = await fetch(request, { cache: 'no-store' });

    if (response.ok) {
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.startsWith('audio/')) {
        // Проверяем размер кэша перед добавлением
        await manageCacheSize();
        // Кэшируем только аудио контент
        await cache.put(request, response.clone());
        console.log('[SW] Аудио файл добавлен в кэш:', request.url);
      }
    }

    return response;
  } catch (error) {
    console.error('[SW] Ошибка загрузки аудио файла:', error);
    
    // Возвращаем кэшированную версию, если есть
    const fallbackResponse = await cache.match(request);
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Возвращаем ошибку
    return new Response('Аудио файл недоступен', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Обработка запросов статических файлов
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseToCache = response.clone();
      await cache.put(request, responseToCache);
    }
    return response;
  } catch (error) {
    console.error('[SW] Ошибка загрузки статического файла:', error);
    return new Response('Файл недоступен', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Управление размером кэша
async function manageCacheSize() {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const keys = await cache.keys();
  
  if (keys.length >= MAX_AUDIO_FILES) {
    console.log('[SW] Превышен лимит файлов в кэше, удаляем старые');
    
    // Удаляем 10% самых старых файлов
    const filesToDelete = Math.ceil(keys.length * 0.1);
    for (let i = 0; i < filesToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
  
  // Проверяем общий размер кэша (приблизительно)
  let totalSize = 0;
  const responses = await Promise.all(
    keys.slice(0, 10).map(key => cache.match(key))
  );
  
  responses.forEach(response => {
    if (response && response.headers.get('content-length')) {
      totalSize += parseInt(response.headers.get('content-length'));
    }
  });
  
  // Если размер превышен, удаляем файлы
  if (totalSize * (keys.length / 10) > MAX_AUDIO_CACHE_SIZE) {
    console.log('[SW] Превышен размер кэша, очищаем старые файлы');
    const filesToDelete = Math.ceil(keys.length * 0.2);
    for (let i = 0; i < filesToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_AUDIO':
      cacheAudioFile(data.url);
      break;
    case 'CLEAR_CACHE':
      clearAudioCache();
      break;
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      });
      break;
  }
});

// Принудительное кэширование аудио файла
async function cacheAudioFile(url) {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await fetch(url, { cache: 'no-store' });

    if (response.ok) {
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.startsWith('audio/')) {
        await manageCacheSize();
        await cache.put(url, response);
        console.log('[SW] Файл принудительно добавлен в кэш:', url);
      } else {
        console.log('[SW] Принудительное кэширование пропущено: не аудио', url);
      }
    }
  } catch (error) {
    console.error('[SW] Ошибка принудительного кэширования:', error);
  }
}

// Очистка кэша аудио файлов
async function clearAudioCache() {
  try {
    await caches.delete(AUDIO_CACHE_NAME);
    console.log('[SW] Кэш аудио файлов очищен');
  } catch (error) {
    console.error('[SW] Ошибка очистки кэша:', error);
  }
}

// Получение информации о кэше
async function getCacheInfo() {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const keys = await cache.keys();
    
    return {
      fileCount: keys.length,
      maxFiles: MAX_AUDIO_FILES,
      maxSize: MAX_AUDIO_CACHE_SIZE,
      files: keys.map(key => key.url)
    };
  } catch (error) {
    console.error('[SW] Ошибка получения информации о кэше:', error);
    return { fileCount: 0, maxFiles: MAX_AUDIO_FILES, maxSize: MAX_AUDIO_CACHE_SIZE, files: [] };
  }
}
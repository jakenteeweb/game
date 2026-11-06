// Service worker «Әріп әлемі»: кэширует всё приложение для работы без интернета.
const CACHE = 'alip-alemi-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('alip-alemi-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Safari (iPhone) запрашивает аудио частями (заголовок Range) и не играет звук,
 * если в ответ приходит весь файл целиком. Отдаём нужный кусок из кэша с кодом 206.
 */
async function rangeResponse(request, response) {
  const range = request.headers.get('range');
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  if (!m) return response;
  const buf = await response.arrayBuffer();
  const size = buf.byteLength;
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] !== '' && m[2] !== '' ? Number(m[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.headers.has('range')) {
    e.respondWith(
      caches.match(e.request.url, { ignoreSearch: true }).then((hit) => (hit ? rangeResponse(e.request, hit) : fetch(e.request))),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Записи диктора, добавленные позже, тоже сохраняем для офлайна.
        if (res.ok && url.pathname.includes('/audio/')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    }),
  );
});

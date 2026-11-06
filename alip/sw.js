// Service worker «Әріп әлемі»: кэширует всё приложение для работы без интернета.
const CACHE = 'alip-alemi-mw4fz80l';
const FILES = ["./","index.html","assets/index-CVFCIqf9.css","assets/index-BIxO4SAv.js","audio/kk/c.bye.mp3","audio/kk/c.count.mp3","audio/kk/c.count_intro.mp3","audio/kk/c.effort.mp3","audio/kk/c.garden.mp3","audio/kk/c.hello.mp3","audio/kk/c.hint.mp3","audio/kk/c.letters.mp3","audio/kk/c.listen.mp3","audio/kk/c.match.mp3","audio/kk/c.more.mp3","audio/kk/c.my_garden.mp3","audio/kk/c.new_letter.mp3","audio/kk/c.new_number.mp3","audio/kk/c.numbers.mp3","audio/kk/c.praise1.mp3","audio/kk/c.praise2.mp3","audio/kk/c.praise3.mp3","audio/kk/c.praise4.mp3","audio/kk/c.praise5.mp3","audio/kk/c.remember.mp3","audio/kk/c.retry1.mp3","audio/kk/c.retry2.mp3","audio/kk/c.review_day.mp3","audio/kk/c.slow.mp3","audio/kk/c.sound_is.mp3","audio/kk/c.too_few.mp3","audio/kk/c.too_many.mp3","audio/kk/c.trace.mp3","audio/kk/l.a.balloons.mp3","audio/kk/l.a.find.mp3","audio/kk/l.a.intro.mp3","audio/kk/l.a.name.mp3","audio/kk/l.a.word.mp3","audio/kk/l.ae.balloons.mp3","audio/kk/l.ae.find.mp3","audio/kk/l.ae.intro.mp3","audio/kk/l.ae.name.mp3","audio/kk/l.ae.word.mp3","audio/kk/l.n.balloons.mp3","audio/kk/l.n.find.mp3","audio/kk/l.n.intro.mp3","audio/kk/l.n.name.mp3","audio/kk/l.n.word.mp3","audio/kk/l.q.balloons.mp3","audio/kk/l.q.find.mp3","audio/kk/l.q.intro.mp3","audio/kk/l.q.name.mp3","audio/kk/l.q.word.mp3","audio/kk/l.t.balloons.mp3","audio/kk/l.t.find.mp3","audio/kk/l.t.intro.mp3","audio/kk/l.t.name.mp3","audio/kk/l.t.word.mp3","audio/kk/l.ue.balloons.mp3","audio/kk/l.ue.find.mp3","audio/kk/l.ue.intro.mp3","audio/kk/l.ue.name.mp3","audio/kk/l.ue.word.mp3","audio/kk/manifest.json","audio/kk/n.1.basket.alma.mp3","audio/kk/n.1.basket.almurt.mp3","audio/kk/n.1.basket.sabiz.mp3","audio/kk/n.1.choose.mp3","audio/kk/n.1.find.mp3","audio/kk/n.1.intro.mp3","audio/kk/n.1.name.mp3","audio/kk/n.1.total.mp3","audio/kk/n.2.basket.alma.mp3","audio/kk/n.2.basket.almurt.mp3","audio/kk/n.2.basket.sabiz.mp3","audio/kk/n.2.choose.mp3","audio/kk/n.2.find.mp3","audio/kk/n.2.intro.mp3","audio/kk/n.2.name.mp3","audio/kk/n.2.total.mp3","audio/kk/n.3.basket.alma.mp3","audio/kk/n.3.basket.almurt.mp3","audio/kk/n.3.basket.sabiz.mp3","audio/kk/n.3.choose.mp3","audio/kk/n.3.find.mp3","audio/kk/n.3.intro.mp3","audio/kk/n.3.name.mp3","audio/kk/n.3.total.mp3","audio/kk/n.4.basket.alma.mp3","audio/kk/n.4.basket.almurt.mp3","audio/kk/n.4.basket.sabiz.mp3","audio/kk/n.4.choose.mp3","audio/kk/n.4.find.mp3","audio/kk/n.4.intro.mp3","audio/kk/n.4.name.mp3","audio/kk/n.4.total.mp3","audio/kk/n.5.basket.alma.mp3","audio/kk/n.5.basket.almurt.mp3","audio/kk/n.5.basket.sabiz.mp3","audio/kk/n.5.choose.mp3","audio/kk/n.5.find.mp3","audio/kk/n.5.intro.mp3","audio/kk/n.5.name.mp3","audio/kk/n.5.total.mp3","icon-192.png","icon-512.png","img/apple.webp","img/balloon.webp","img/basket.webp","img/bread.webp","img/carrot.webp","img/fish.webp","img/flower.webp","img/fox.webp","img/house.webp","img/ladybug.webp","img/pear.webp","img/rabbit.webp","img/rooster.webp","img/star.webp","manifest.webmanifest"];

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

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
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

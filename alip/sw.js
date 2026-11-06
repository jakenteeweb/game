// Service worker «Әріп әлемі»: кэширует всё приложение для работы без интернета.
const CACHE = 'alip-alemi-mw4z40gv';
const FILES = ["./","index.html","assets/index-CSGaMgXO.css","assets/index-CgxyVDpg.js","audio/kk/c.build_word.mp3","audio/kk/c.bye.mp3","audio/kk/c.count.mp3","audio/kk/c.count_intro.mp3","audio/kk/c.dictation.mp3","audio/kk/c.effort.mp3","audio/kk/c.games.mp3","audio/kk/c.garden.mp3","audio/kk/c.hello.mp3","audio/kk/c.hint.mp3","audio/kk/c.lesson.mp3","audio/kk/c.lesson_first.mp3","audio/kk/c.letters.mp3","audio/kk/c.level_up.mp3","audio/kk/c.listen.mp3","audio/kk/c.match.mp3","audio/kk/c.memory.mp3","audio/kk/c.missing_letter.mp3","audio/kk/c.missing_number.mp3","audio/kk/c.more.mp3","audio/kk/c.my_garden.mp3","audio/kk/c.new_letter.mp3","audio/kk/c.new_number.mp3","audio/kk/c.numbers.mp3","audio/kk/c.play.mp3","audio/kk/c.pop.mp3","audio/kk/c.praise1.mp3","audio/kk/c.praise2.mp3","audio/kk/c.praise3.mp3","audio/kk/c.praise4.mp3","audio/kk/c.praise5.mp3","audio/kk/c.read_word.mp3","audio/kk/c.remember.mp3","audio/kk/c.retry1.mp3","audio/kk/c.retry2.mp3","audio/kk/c.review_day.mp3","audio/kk/c.slow.mp3","audio/kk/c.sound_is.mp3","audio/kk/c.syl_build.mp3","audio/kk/c.syl_listen.mp3","audio/kk/c.thanks.mp3","audio/kk/c.too_few.mp3","audio/kk/c.too_many.mp3","audio/kk/c.trace.mp3","audio/kk/c.which_more.mp3","audio/kk/c.you_wrote.mp3","audio/kk/l.a.name.mp3","audio/kk/l.ae.name.mp3","audio/kk/l.b.name.mp3","audio/kk/l.ch.name.mp3","audio/kk/l.d.name.mp3","audio/kk/l.e.name.mp3","audio/kk/l.eh.name.mp3","audio/kk/l.f.name.mp3","audio/kk/l.g.name.mp3","audio/kk/l.gh.name.mp3","audio/kk/l.h.name.mp3","audio/kk/l.i.name.mp3","audio/kk/l.ii.name.mp3","audio/kk/l.k.name.mp3","audio/kk/l.kh.name.mp3","audio/kk/l.l.name.mp3","audio/kk/l.m.name.mp3","audio/kk/l.n.name.mp3","audio/kk/l.ng.name.mp3","audio/kk/l.o.name.mp3","audio/kk/l.oe.name.mp3","audio/kk/l.p.name.mp3","audio/kk/l.q.name.mp3","audio/kk/l.r.name.mp3","audio/kk/l.s.name.mp3","audio/kk/l.sh.name.mp3","audio/kk/l.shch.name.mp3","audio/kk/l.t.name.mp3","audio/kk/l.ts.name.mp3","audio/kk/l.u.name.mp3","audio/kk/l.ue.name.mp3","audio/kk/l.uu.name.mp3","audio/kk/l.v.name.mp3","audio/kk/l.y.name.mp3","audio/kk/l.ya.name.mp3","audio/kk/l.yo.name.mp3","audio/kk/l.yu.name.mp3","audio/kk/l.yy.name.mp3","audio/kk/l.z.name.mp3","audio/kk/l.zh.name.mp3","audio/kk/manifest.json","audio/kk/n.0.name.mp3","audio/kk/n.1.name.mp3","audio/kk/n.10.name.mp3","audio/kk/n.11.name.mp3","audio/kk/n.12.name.mp3","audio/kk/n.13.name.mp3","audio/kk/n.14.name.mp3","audio/kk/n.15.name.mp3","audio/kk/n.16.name.mp3","audio/kk/n.17.name.mp3","audio/kk/n.18.name.mp3","audio/kk/n.19.name.mp3","audio/kk/n.2.name.mp3","audio/kk/n.20.name.mp3","audio/kk/n.3.name.mp3","audio/kk/n.4.name.mp3","audio/kk/n.5.name.mp3","audio/kk/n.6.name.mp3","audio/kk/n.7.name.mp3","audio/kk/n.8.name.mp3","audio/kk/n.9.name.mp3","audio/kk/p.balloons.mp3","audio/kk/p.basket.mp3","audio/kk/p.digit_find.mp3","audio/kk/p.digit_write.mp3","audio/kk/p.equals.mp3","audio/kk/p.find.mp3","audio/kk/p.give.mp3","audio/kk/p.in_word.mp3","audio/kk/p.items.mp3","audio/kk/p.letter_dot.mp3","audio/kk/p.letter_has.mp3","audio/kk/p.me.mp3","audio/kk/p.minus.mp3","audio/kk/p.number_find.mp3","audio/kk/p.number_write.mp3","audio/kk/p.plus.mp3","audio/kk/p.put.mp3","audio/kk/p.starts.mp3","audio/kk/p.this_is.mp3","audio/kk/p.total.mp3","audio/kk/p.which_pic.mp3","audio/kk/p.which_word.mp3","audio/kk/p.write.mp3","audio/kk/syl.ba.mp3","audio/kk/syl.be.mp3","audio/kk/syl.bo.mp3","audio/kk/syl.by.mp3","audio/kk/syl.da.mp3","audio/kk/syl.de.mp3","audio/kk/syl.do.mp3","audio/kk/syl.dy.mp3","audio/kk/syl.la.mp3","audio/kk/syl.le.mp3","audio/kk/syl.lo.mp3","audio/kk/syl.ly.mp3","audio/kk/syl.ma.mp3","audio/kk/syl.me.mp3","audio/kk/syl.mo.mp3","audio/kk/syl.my.mp3","audio/kk/syl.na.mp3","audio/kk/syl.ne.mp3","audio/kk/syl.no.mp3","audio/kk/syl.ny.mp3","audio/kk/syl.qa.mp3","audio/kk/syl.qe.mp3","audio/kk/syl.qo.mp3","audio/kk/syl.qy.mp3","audio/kk/syl.ra.mp3","audio/kk/syl.re.mp3","audio/kk/syl.ro.mp3","audio/kk/syl.ry.mp3","audio/kk/syl.sa.mp3","audio/kk/syl.se.mp3","audio/kk/syl.sha.mp3","audio/kk/syl.she.mp3","audio/kk/syl.sho.mp3","audio/kk/syl.shy.mp3","audio/kk/syl.so.mp3","audio/kk/syl.sy.mp3","audio/kk/syl.ta.mp3","audio/kk/syl.te.mp3","audio/kk/syl.to.mp3","audio/kk/syl.ty.mp3","audio/kk/w.airplane.mp3","audio/kk/w.apple.mp3","audio/kk/w.apricot.mp3","audio/kk/w.ball.mp3","audio/kk/w.balloon.mp3","audio/kk/w.bicycle.mp3","audio/kk/w.book.mp3","audio/kk/w.bread.mp3","audio/kk/w.brush.mp3","audio/kk/w.carrot.mp3","audio/kk/w.cat.mp3","audio/kk/w.chair.mp3","audio/kk/w.circus.mp3","audio/kk/w.cosmonaut.mp3","audio/kk/w.dishes.mp3","audio/kk/w.dog.mp3","audio/kk/w.doll.mp3","audio/kk/w.door.mp3","audio/kk/w.dragon.mp3","audio/kk/w.envelope.mp3","audio/kk/w.excavator.mp3","audio/kk/w.fir.mp3","audio/kk/w.fish.mp3","audio/kk/w.flower.mp3","audio/kk/w.fountain.mp3","audio/kk/w.fox.mp3","audio/kk/w.house.mp3","audio/kk/w.kidgoat.mp3","audio/kk/w.ladybug.mp3","audio/kk/w.moon.mp3","audio/kk/w.needle.mp3","audio/kk/w.onion.mp3","audio/kk/w.pear.mp3","audio/kk/w.rabbit.mp3","audio/kk/w.rooster.mp3","audio/kk/w.rose.mp3","audio/kk/w.star.mp3","audio/kk/w.suitcase.mp3","audio/kk/w.top.mp3","audio/kk/w.yacht.mp3","audio/kk/w.zebra.mp3","icon-192.png","icon-512.png","img/airplane.webp","img/apple.webp","img/apricot.webp","img/ball.webp","img/balloon.webp","img/basket.webp","img/bicycle.webp","img/book.webp","img/bread.webp","img/brush.webp","img/carrot.webp","img/cat.webp","img/chair.webp","img/circus.webp","img/cosmonaut.webp","img/dishes.webp","img/dog.webp","img/doll.webp","img/door.webp","img/dragon.webp","img/envelope.webp","img/excavator.webp","img/fir.webp","img/fish.webp","img/flower.webp","img/fountain.webp","img/fox.webp","img/hanshaiym-cheer.webp","img/hanshaiym-think.webp","img/hanshaiym.webp","img/house.webp","img/kidgoat.webp","img/ladybug.webp","img/moon.webp","img/needle.webp","img/onion.webp","img/pear.webp","img/rabbit.webp","img/rooster.webp","img/rose.webp","img/star.webp","img/suitcase.webp","img/top.webp","img/yacht.webp","img/zebra.webp","manifest.webmanifest"];

// Установка обновления: код приложения обязателен, остальные файлы — «по возможности».
// Раньше один недоступный файл срывал всю установку, и телефоны застревали на старой версии.
const CORE = FILES.filter((f) => f === './' || f === 'index.html' || f.startsWith('assets/'));
// Каждый файл скачиваем заново: адрес с номером версии и cache: 'reload' — мимо HTTP-кэша браузера.
// Иначе обновление могло сохранить старую копию (GitHub Pages разрешает браузеру держать файлы
// 10 минут), и заменённая запись (например, название буквы) оставалась старой.
async function store(c, f) {
  const url = f + (f.includes('?') ? '&' : '?') + 'v=' + CACHE;
  const res = await fetch(new Request(url, { cache: 'reload' }));
  if (!res.ok) throw new Error(f + ': ' + res.status);
  await c.put(f, res);
}
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(async (c) => {
        await Promise.all(CORE.map((f) => store(c, f)));
        await Promise.allSettled(FILES.filter((f) => !CORE.includes(f)).map((f) => store(c, f)));
      })
      .then(() => self.skipWaiting()),
  );
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

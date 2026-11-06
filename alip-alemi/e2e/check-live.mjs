// Проверка опубликованного сайта: каждый файл из списка service worker должен отдаваться (200).
// Иначе телефоны не смогут установить обновление. Запуск: node e2e/check-live.mjs [адрес]
const base = process.argv[2] ?? 'https://jakenteeweb.github.io/game/alip/';
const sw = await (await fetch(base + 'sw.js', { cache: 'no-store' })).text();
const files = JSON.parse(sw.match(/const FILES = (\[.*?\]);/s)[1]);
const bad = [];
for (let i = 0; i < files.length; i += 12) {
  await Promise.all(files.slice(i, i + 12).map(async (f) => {
    const r = await fetch(base + f, { method: 'GET', cache: 'no-store' }).catch(() => null);
    if (!r || r.status !== 200) bad.push(`${r?.status ?? 'ERR'} ${f}`);
  }));
}
console.log(`Файлов в обновлении: ${files.length}, недоступно: ${bad.length}`);
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
console.log('САЙТ В ПОРЯДКЕ');

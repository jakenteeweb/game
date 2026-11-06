// Регрессия: заменённая запись (например, название буквы) должна обновиться на телефоне.
// Сервер отдаёт файлы как GitHub Pages — с Cache-Control: max-age=600, то есть браузер
// может 10 минут брать их из своего HTTP-кэша. Обновление обязано скачать файл заново.
// Запуск: npm run build && NODE_PATH=$(npm root -g) node e2e/stale-cache.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ok = (c, m) => { if (!c) { console.log('ПРОВАЛ', m); process.exit(1); } console.log('OK', m); };

// Копия собранного приложения, чтобы подменять файлы, не трогая сборку.
const src = new URL('../../alip/', import.meta.url).pathname;
const root = fs.mkdtempSync('/tmp/alip-stale-');
fs.cpSync(src, root, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600' });
  res.end(fs.readFileSync(f));
}).listen(4174);

const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto('http://localhost:4174/');
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload();
ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker установлен');
const clip = 'audio/kk/l.a.name.mp3';
// Телефон недавно проигрывал старую запись — она лежит в HTTP-кэше браузера.
await p.evaluate((u) => fetch(u, { cache: 'default' }).then((r) => r.arrayBuffer()), clip);

// Новая версия: другая запись буквы и новый номер кэша.
const fresh = fs.readFileSync(path.join(root, 'audio/kk/l.ae.name.mp3'));
fs.writeFileSync(path.join(root, clip), fresh);
const sw = path.join(root, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/alip-alemi-(\w+)/, 'alip-alemi-$1x'));

await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
// Ждём, пока новая версия полностью установится и станет активной.
const activated = () => p.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  const k = await caches.keys();
  return !!r && !r.installing && !r.waiting && r.active?.state === 'activated' && k.length === 1 && k[0].endsWith('x');
}).catch(() => false); // приложение само перезагружается в новую версию — это нормально
for (let i = 0; i < 60 && !(await activated()); i++) await p.waitForTimeout(500);
ok(await activated(), 'новая версия установлена');
await p.waitForLoadState();
const got = await p.evaluate(async (u) => {
  const c = await caches.open((await caches.keys())[0]);
  const r = await c.match(u, { ignoreSearch: true });
  return r ? new Uint8Array(await r.arrayBuffer()).length : -1;
}, clip);
ok(got === fresh.length, `после обновления в кэше новая запись буквы (${got} байт, ожидалось ${fresh.length})`);
await b.close();
server.close();
fs.rmSync(root, { recursive: true, force: true });

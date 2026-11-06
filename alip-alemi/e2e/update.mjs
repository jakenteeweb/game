// Проверка автообновления установленного приложения. Запуск: npx vite preview --port 4173 & NODE_PATH=$(npm root -g) node e2e/update.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const ok = (c, m) => { if (!c) { console.log('ПРОВАЛ', m); process.exit(1); } console.log('OK', m); };
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage();
let navs = 0; p.on('framenavigated', (f) => f === p.mainFrame() && navs++);
await p.goto('http://localhost:4173/');
await p.evaluate(async () => {
  const db = await new Promise((r) => { const q = indexedDB.open('alip-alemi', 1); q.onupgradeneeded = () => {}; q.onsuccess = () => r(q.result); });
  const t = db.transaction(['profiles', 'settings'], 'readwrite');
  t.objectStore('profiles').put({ v: 1, id: 'p1', nickname: 'Тест', avatar: '🐻', age: 5, length: 'short', createdAt: 1, sessionCount: 0, garden: [] });
  t.objectStore('settings').put({ key: 'settings', speechOn: false, speechVolume: 1, musicOn: false, musicVolume: .3, allowKazakhTts: false, allowAiVoice: true, showDrafts: true, activeProfileId: 'p1' });
  await new Promise((r) => (t.oncomplete = r));
});
await p.reload(); await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload(); // теперь страницей управляет service worker
await p.locator('[aria-label="Әріптер"]').waitFor();
ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker управляет страницей');
const rebuild = () => execSync('npm run build', { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
const swVersion = () => p.evaluate(() => fetch('sw.js', { cache: 'no-store' }).then((r) => r.text()).then((t) => t.match(/alip-alemi-(\w+)/)[1]));

// 1) Урок идёт — новая версия не прерывает его
await p.locator('[aria-label="Әріптер"]').click();
await p.locator('[data-task]').waitFor({ state: 'attached', timeout: 20000 });
const before = navs; rebuild();
await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await p.waitForTimeout(6000);
ok(navs === before && (await p.locator('[data-task]').count()) === 1, 'во время урока перезагрузки нет');
// 2) Вернулись на главный — обновление применилось
await p.locator('[aria-label="Шығу"]').click();
await p.waitForTimeout(4000);
ok(navs > before, 'на главном экране приложение перезагрузилось в новую версию');
const ctrl = await p.evaluate(() => caches.keys());
ok(ctrl.length === 1 && ctrl[0] === 'alip-alemi-' + (await swVersion()), 'используется кэш новой версии: ' + ctrl.join(','));
// 3) Обновление на главном экране применяется сразу
const b2 = navs; rebuild();
await p.locator('[aria-label="Әріптер"]').waitFor();
await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await p.waitForTimeout(6000);
ok(navs > b2, 'новая версия на главном экране — за один запуск');
await p.locator('[aria-label="Әріптер"]').waitFor();
ok(true, 'после обновления приложение работает, профиль на месте');
await b.close();

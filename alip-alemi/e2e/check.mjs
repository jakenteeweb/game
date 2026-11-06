// Сквозная проверка в настоящем браузере (Chromium, эмуляция телефона с сенсорным экраном).
// Запуск: npm run build && npx vite preview --port 4173 & NODE_PATH=$(npm root -g) node e2e/check.mjs
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const URL = process.env.APP_URL ?? 'http://localhost:4173/';
const log = (...a) => console.log('•', ...a);
const assert = (c, m) => { if (!c) throw new Error('ПРОВАЛ: ' + m); log('OK', m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(page);
// Счётчик одновременно звучащих аудио — проверка, что фразы не накладываются.
await ctx.addInitScript(() => {
  window.__maxPlaying = 0; window.__playing = new Set();
  const upd = () => { window.__maxPlaying = Math.max(window.__maxPlaying, window.__playing.size); };
  // new Audio() не в DOM — слушаем каждый элемент напрямую.
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.__tracked) {
      this.__tracked = true;
      this.addEventListener('playing', () => { window.__playing.add(this); upd(); });
      for (const ev of ['pause', 'ended', 'emptied', 'error']) this.addEventListener(ev, () => window.__playing.delete(this));
    }
    return orig.call(this);
  };
});
/** WAV-тон 1.2 с — «запись диктора» для проверки загрузки и воспроизведения. */
function wav(freq) {
  const rate = 8000, n = rate * 1.2, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 8000), 44 + i * 2);
  return buf;
}

async function hold(sel) {
  const b = await page.locator(sel).boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(2300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function enterParent() {
  await hold('[aria-label="Ата-аналарға: басып тұрыңыз"]');
  const q = await page.locator('.gate >> text=/неше болады/').textContent();
  const [, a, b] = q.match(/(\d+) \+ (\d+)/);
  for (const d of String(+a + +b)) await page.locator('.keypad button', { hasText: new RegExp(`^${d}$`) }).click();
  await page.locator('.keypad button', { hasText: 'OK' }).click();
  await page.locator('text=Ата-ана кабинеті').waitFor();
}
async function addChild(nick, avatarIdx) {
  await page.locator('.tabs button', { hasText: 'Балалар' }).click();
  await page.locator('text=+ Бала қосу').click();
  await page.fill('#nick', nick);
  await page.locator('.avatars button').nth(avatarIdx).click();
  await page.locator('.modal button', { hasText: 'Сақтау' }).click();
  await page.locator('.card strong', { hasText: nick }).waitFor();
}
async function traceTouch(svgSel) {
  const svg = page.locator(svgSel);
  let strokes = JSON.parse(await svg.getAttribute('data-strokes'));
  while (strokes.length) {
    const box = await svg.boundingBox();
    const toPx = ([x, y]) => ({ x: box.x + ((x + 6) / 112) * box.width, y: box.y + ((y + 6) / 112) * box.height });
    const pts = strokes[0];
    // Немного «дрожащей детской руки»: смещение до 4 единиц.
    const dense = [];
    for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 8; k++) {
      const t = k / 8; dense.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t + Math.sin(i * 7 + k) * 4, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t + Math.cos(k * 3) * 3]);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [toPx(dense[0])] });
    for (const p of dense.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [toPx(p)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
    if (!(await svg.count())) break;
    const next = JSON.parse((await svg.getAttribute('data-strokes').catch(() => '[]')) ?? '[]');
    if (next.length >= strokes.length) throw new Error('штрих не засчитан');
    strokes = next;
  }
}

async function drawTouch(svgSel, strokes, viewW = 100, map = (p) => p) {
  const box = await page.locator(svgSel).boundingBox();
  const toPx = ([x, y]) => ({ x: box.x + (x / viewW) * box.width, y: box.y + (y / viewW) * box.height });
  for (const s of strokes) {
    const pts = [];
    for (let i = 1; i < s.length; i++) for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(map([s[i - 1][0] + (s[i][0] - s[i - 1][0]) * t + Math.sin(i + k) * 1.5, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * t])); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [toPx(pts[0])] });
    for (const p of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [toPx(p)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
}
let scribbleTested = false;
const writes = [];
const wordMatches = [];

/** Проходит занятие, отвечая правильно. mistakes — сколько раз ошибиться в первом задании с выбором. */
const shot = new Set();
async function playSession(track, { mistakes = 0, maxTasks = 30 } = {}) {
  await page.locator(`[aria-label="${track === 'letters' ? 'Әріптер' : 'Сандар'}"]`).click();
  const seen = [];
  let lastUid = null;
  for (let n = 0; n < maxTasks; n++) {
    const end = page.locator('[aria-label="Үйге"]');
    const task = page.locator('[data-task]');
    await Promise.race([end.waitFor({ timeout: 30000 }), page.waitForFunction((u) => { const e = document.querySelector('[data-task]'); return e && e.getAttribute('data-uid') !== u; }, lastUid, { timeout: 30000 })]);
    if (await end.count()) break;
    lastUid = await task.getAttribute('data-uid');
    const type = await task.getAttribute('data-task');
    const item = await task.getAttribute('data-item');
    const reason = await task.getAttribute('data-reason');
    seen.push({ type, item, reason });
    await page.waitForTimeout(600);
    if (process.env.SHOT_DIR && !shot.has(type)) { shot.add(type); await page.waitForTimeout(type.includes('ntro') ? 2500 : 300); await page.screenshot({ path: `${process.env.SHOT_DIR}/task-${type}.png` }); }
    if (n === 1) { // частые нажатия «послушать ещё раз»
      for (let k = 0; k < 5; k++) { await page.locator('[aria-label="Қайта тыңдау"]').click(); await page.waitForTimeout(80); }
    }
    if (type === 'intro' || type === 'numIntro') {
      await page.locator('[aria-label="Әрі қарай"]').click({ timeout: 20000 });
    } else if (type === 'wordMatch') {
      const ans = await page.locator('.choices').getAttribute('data-answer');
      await page.locator(`.choice[data-opt="${ans}"]`).click();
      wordMatches.push(item);
    } else if (['recognize', 'listen', 'findDigit', 'matchDigit'].includes(type)) {
      if (mistakes > 0) {
        const wrong = page.locator(`.choice:not([data-opt="${item}"]):not(.gone)`);
        for (let k = 0; k < mistakes && (await wrong.count()); k++) { await wrong.first().click(); await page.waitForTimeout(900); }
        mistakes = 0;
      }
      await page.locator(`.choice[data-opt="${item}"]`).click();
    } else if (type === 'balloons') {
      const bs = page.locator(`.balloon[data-opt="${item}"]`);
      for (let k = 0; k < await bs.count(); k++) { await bs.nth(k).click({ force: true }); await page.waitForTimeout(150); }
    } else if (type === 'trace') {
      await traceTouch('svg[aria-label="trace"]');
    } else if (type === 'write') {
      const sel = 'svg[aria-label="write"]';
      if (!scribbleTested) {
        scribbleTested = true;
        await drawTouch(sel, [Array.from({ length: 30 }, (_, i) => [50 + 30 * Math.cos(i / 4.6), 50 + 30 * Math.sin(i / 4.6)])]);
        await page.locator('[aria-label="Дайын"]').click();
        await page.locator('.write-result.no').waitFor({ timeout: 5000 });
        writes.push('scribble-rejected');
        await page.waitForTimeout(4000);
      }
      const strokes = JSON.parse(await page.locator(sel).getAttribute('data-strokes'));
      await drawTouch(sel, strokes, 100, ([x, y]) => [x * 0.7 + 12, y * 0.7 + 10]);
      await page.locator('[aria-label="Дайын"]').click();
      if (!(await page.locator('.write-result.ok').waitFor({ timeout: 5000 }).then(() => true, () => false))) {
        await page.screenshot({ path: '/tmp/claude-0/-workspace/528ba19f-b723-5dad-9bb1-8e17374d4b19/scratchpad/write-fail.png' });
        throw new Error('написанное не распознано: ' + item + ' ' + (await page.locator('.write-result').textContent().catch(() => '')));
      }
      writes.push(item);
    } else if (type === 'count') {
      const objs = page.locator('.field .obj');
      for (let k = 0; k < await objs.count(); k++) await objs.nth(k).click();
    } else if (type === 'basket') {
      const v = +item.split('_')[1];
      for (let k = 0; k < v; k++) await page.locator('.pile button').first().click();
      await page.locator('[aria-label="Дайын"]').click();
    } else if (type === 'chooseGroup') {
      await page.locator(`[data-count="${item.split('_')[1]}"]`).click();
    }
  }
  if (process.env.SHOT_DIR && !shot.has('end')) { shot.add('end'); await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.SHOT_DIR}/end.png` }); }
  await page.locator('[aria-label="Үйге"]').click();
  if (process.env.SHOT_DIR && !shot.has('home')) { shot.add('home'); await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.SHOT_DIR}/home.png` }); }
  return seen;
}

await page.goto(URL);
await page.locator('text=Әріп әлемі').waitFor();
assert(true, 'приложение открылось');

// Кабинет родителя: два профиля
await enterParent();
await addChild('Айко', 0);
await addChild('Бота', 1);
// Загрузка записей носителя для нескольких фраз (как сделает педагог/родитель)
await page.locator('.tabs button', { hasText: 'Мазмұн' }).click();
const clipIds = ['c.hello', 'l.a.intro', 'c.listen', 'l.a.word', 'l.a.find', 'c.praise1', 'c.praise2', 'c.praise3', 'c.praise4', 'c.praise5'];
for (const [i, id] of clipIds.entries()) {
  const row = page.locator('table.clips tr', { hasText: id });
  await row.locator('input[type=file]').setInputFiles({ name: `${id}.wav`, mimeType: 'audio/wav', buffer: wav(300 + i * 40) });
  await page.locator('table.clips tr', { hasText: id }).waitFor({ state: 'detached' });
}
await page.locator('.seg button', { hasText: 'Барлығы' }).click();
for (const id of clipIds) if (!(await page.locator('table.clips tr', { hasText: id }).first().locator('td.src-recording').count())) throw new Error('не отмечена запись ' + id);
assert((await page.locator('td.src-recording').count()) === clipIds.length, 'записи диктора загружены и отмечены как «запись носителя»');
await page.locator('header button', { hasText: 'Шығу' }).click();
// Первый созданный профиль становится активным.
await page.locator('[aria-label="Айко"]').waitFor();

// Занятие 1 (буквы)
const s1 = await playSession('letters');
log('Занятие 1:', s1.map((t) => `${t.type}:${t.item}${t.reason === 'retry' ? '(повтор)' : ''}`).join(' '));
assert(s1.filter((t) => t.type === 'intro').length === 1, 'ровно одна новая буква в занятии');
assert(s1.some((t) => t.type === 'trace') || s1.some((t) => t.type === 'listen' || t.type === 'recognize'), 'есть упражнения после знакомства');
assert(s1[s1.length - 1].reason === 'return', 'в конце — возвращение к новой букве');

{ const mp = await page.evaluate(() => window.__maxPlaying); assert(mp === 1, `записи диктора звучали, не больше одной одновременно (макс. ${mp})`); }

// Перезапуск: прогресс сохранился
await page.reload();
await page.locator('[aria-label="Әріптер"]').waitFor();
assert(true, 'после перезагрузки открылся профиль Айко, не экран создания');

// Занятие 2: начинается с повторения, одна ошибка-«тык» и проверка адаптации
const s2 = await playSession('letters', { mistakes: 2 });
log('Занятие 2:', s2.map((t) => `${t.type}:${t.item}${t.reason === 'retry' ? '(повтор)' : ''}`).join(' '));
assert(s2[0].reason === 'review' && s2[0].item === 'L_a', 'занятие 2 начинается с повторения А');
assert(s2.some((t) => t.reason === 'retry'), 'после ошибки задание вернулось позже в упрощённом виде');

// Обведение на сенсорном экране
const s3 = await playSession('letters');
log('Занятие 3:', s3.map((t) => `${t.type}:${t.item}`).join(' '));
assert([...s1, ...s2, ...s3].some((t) => t.type === 'trace'), 'обведение пальцем выполнено (touch)');

// Числа
const n1 = await playSession('numbers');
log('Числа 1:', n1.map((t) => `${t.type}:${t.item}`).join(' '));
assert(n1.some((t) => t.type === 'numIntro'), 'знакомство с числом');
const n2 = await playSession('numbers');
log('Числа 2:', n2.map((t) => `${t.type}:${t.item}`).join(' '));

// «Ойындар»: все игры открыты и проходятся до конца, за победы — звёзды
const starsOf = async () => parseInt(await page.locator('.stars-pill').getAttribute('aria-label'), 10);
const starsBefore = await starsOf();
await page.locator('[aria-label="Ойындар"]').click();
assert((await page.locator('.game-card.locked').count()) === 0 && (await page.locator('.game-card').count()) === 7, 'все 7 игр открыты');
for (const game of ['syl', 'word', 'math', 'dict', 'memory', 'feed', 'pop']) {
  await page.locator(`[data-game="${game}"]`).click();
  const end = page.locator('[aria-label="Ойындар"]');
  for (let guard = 0; guard < 60 && !(await end.count()); guard++) {
    await page.waitForTimeout(700);
    if (game === 'memory') {
      const cards = page.locator('.mem-card:not(.done)');
      if (!(await cards.count())) continue;
      const pair = await cards.first().getAttribute('data-pair');
      const both = page.locator(`.mem-card[data-pair="${pair}"]:not(.done)`);
      await both.nth(0).click(); await both.nth(1).click();
      await page.waitForTimeout(800);
    } else if (game === 'feed') {
      const goal = await page.locator('.feed-goal').textContent().catch(() => null);
      if (!goal) continue;
      for (let k = 0; k < +goal; k++) { await page.locator('.pile button').first().click(); await page.waitForTimeout(250); }
      await page.waitForTimeout(2500);
    } else if (game === 'pop') {
      const target = await page.locator('.sky').getAttribute('data-target').catch(() => null);
      if (!target) continue;
      const bs = page.locator(`.balloon[data-opt="${target}"]:not(.popped)`);
      while (await bs.count()) { await bs.first().click({ force: true }); await page.waitForTimeout(300); }
      await page.waitForTimeout(1500);
    } else if (await page.locator('.choices[data-answer]').count()) {
      const ans = await page.locator('.choices[data-answer]').getAttribute('data-answer');
      const opts = page.locator('.choices .choice');
      // Одна ошибка в каждом задании «Есеп» — проверяем, что игра не ломается.
      if (game === 'math') {
        const wrong = page.locator(`.choices .choice:not([data-opt="${ans}"])`);
        if (await wrong.count()) { await wrong.first().click(); await page.waitForTimeout(600); }
      }
      await page.locator(`.choices [data-opt="${ans}"]`).click();
      void opts;
      await page.waitForTimeout(2200);
    } else if (await page.locator('.slots[data-syl]').count()) {
      const syl = await page.locator('.slots[data-syl]').getAttribute('data-syl');
      await page.locator(`.tile.cons[data-tile="${syl[0]}"]`).click(); await page.waitForTimeout(500);
      await page.locator(`.tile.vow[data-tile="${syl[1]}"]`).click();
      await page.waitForTimeout(2200);
    } else if (await page.locator('.slots[data-word] ~ .tiles').count()) {
      const word = (await page.locator('.slots[data-word]').getAttribute('data-word')).toUpperCase();
      for (const ch of word) { await page.locator(`.tile:not(.used)[data-tile="${ch}"]`).first().click(); await page.waitForTimeout(350); }
      await page.waitForTimeout(2200);
    } else if (await page.locator('svg[aria-label="write"]').count()) {
      const sel = 'svg[aria-label="write"]';
      const strokes = JSON.parse(await page.locator(sel).getAttribute('data-strokes'));
      await drawTouch(sel, strokes, 100, ([x, y]) => [x * 0.7 + 12, y * 0.7 + 10]);
      await page.locator('[aria-label="Дайын"]').click();
      await page.waitForTimeout(3000);
    }
  }
  assert(await end.count(), `игра «${game}» проходится до конца`);
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/game-${game}-end.png` });
  await end.click();
}
await page.locator('[aria-label="Үйге"]').click();
await page.waitForTimeout(500);
const starsAfter = await starsOf();
assert(starsAfter > starsBefore + 20, `за победы в играх начислены звёзды (${starsBefore} → ${starsAfter})`);
assert(/[2-9]-деңгей/.test(await page.locator('.stars-pill').textContent()), 'вырос уровень');

// Прогресс у родителя и изоляция профилей
await enterParent();
await page.locator('.tabs button', { hasText: 'Үлгерім' }).click();
const learnCells = await page.locator('.sym-cell.learn, .sym-cell.ok').count();
assert(learnCells >= 3, `у Айко отмечены изучаемые символы (${learnCells})`);
await page.locator('.seg button', { hasText: 'Бота' }).click();
await page.waitForTimeout(400);
assert((await page.locator('.sym-cell.learn, .sym-cell.ok').count()) === 0, 'у Боты прогресс пуст — профили не смешиваются');
if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/parent.png`, fullPage: true });
await page.locator('header button', { hasText: 'Шығу' }).click();

// Офлайн
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await ctx.setOffline(true);
await page.reload();
await page.locator('[aria-label="Әріптер"]').waitFor({ timeout: 10000 });
const off = await playSession('letters');
assert(off.length > 0, `без интернета приложение и уроки работают (${off.length} заданий)`);
await ctx.setOffline(false);

log('Жаз!:', writes.join(', '));
log('Қай сөз…:', wordMatches.join(', '));
assert(writes[0] === 'scribble-rejected' && writes.length >= 2, '«Жаз!»: каракуля не засчитана, написанный пальцем символ распознан');
assert(await page.evaluate(() => window.__maxPlaying) <= 1, 'звук ни разу не наложился');
assert(errors.length === 0, 'нет ошибок JavaScript: ' + errors.join('; '));
await browser.close();
console.log('\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');

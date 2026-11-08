// Игры раздела «Ойындар». Все игры открыты: берут знакомое с уроков, а если знакомого мало —
// первые буквы программы. Игры не меняют учебный прогресс, но дают звёзды и награду в сад.
import { ITEMS, LETTERS, NUMBERS, type LetterItem, type NumberItem } from '../content';
import { CURRICULUM } from '../content/curriculum';
import { PICTURES, type Picture } from '../content/pictures';
import { SYLLABLES, READING_WORDS, type Syllable } from '../content/syllables';
import type { ItemProgress } from '../engine/progress';

export type GameId = 'memory' | 'feed' | 'pop' | 'syl' | 'word' | 'math' | 'dict' | 'dyb';

/** Навык для отчёта «Мектепке дайындық»: какая игра что тренирует. */
export type SkillArea = 'sounds' | 'reading' | 'math' | 'writing' | 'letters';
export const GAME_AREA: Record<GameId, SkillArea> = {
  dyb: 'sounds', syl: 'reading', word: 'reading', math: 'math', feed: 'math', dict: 'writing', pop: 'letters', memory: 'letters',
};

export interface Known {
  letters: LetterItem[];
  numbers: NumberItem[];
}

const MIN_LETTERS = 6;
const MIN_NUMBERS = 5;

/** Знакомое ребёнку; если знакомого мало — дополняем первыми символами программы (все игры открыты). */
export function knownFor(progress: Record<string, ItemProgress | undefined>): Known {
  const seen = (id: string) => (progress[id]?.stage ?? 0) > 0;
  const okLetter = (l: LetterItem) => l.status !== 'stub' && !!l.words[0];
  let letters = LETTERS.filter((l) => okLetter(l) && seen(l.id));
  if (letters.length < MIN_LETTERS) {
    const extra = CURRICULUM.letterOrder.map((id) => ITEMS[id] as LetterItem).filter((l) => okLetter(l) && !letters.includes(l));
    letters = [...letters, ...extra.slice(0, MIN_LETTERS - letters.length)];
  }
  let numbers = NUMBERS.filter((n) => n.status !== 'stub' && n.value >= 1 && n.value <= 10 && seen(n.id));
  if (numbers.length < MIN_NUMBERS) {
    const extra = NUMBERS.filter((n) => n.value >= 1 && n.value <= 5 && !numbers.includes(n));
    numbers = [...numbers, ...extra.slice(0, MIN_NUMBERS - numbers.length)].sort((a, b) => a.value - b.value);
  }
  return { letters, numbers };
}

export interface MemoryCard {
  key: string;
  pair: string;
  kind: 'glyph' | 'picture' | 'dots';
  value: string;
}

/** Пары для «Жұбын тап»: буква ↔ картинка её слова, цифра ↔ столько же точек. До 3 пар. */
export function memoryCards(k: Known, rng: () => number, pairs = 3): MemoryCard[] {
  const pool = [
    ...k.letters.map((l) => ({ id: l.id, a: { kind: 'glyph' as const, value: l.upper }, b: { kind: 'picture' as const, value: l.id } })),
    ...k.numbers.map((n) => ({ id: n.id, a: { kind: 'glyph' as const, value: n.digit }, b: { kind: 'dots' as const, value: String(n.value) } })),
  ];
  const chosen = shuffle(pool, rng).slice(0, pairs);
  const cards = chosen.flatMap((p) => [
    { key: `${p.id}-a`, pair: p.id, ...p.a },
    { key: `${p.id}-b`, pair: p.id, ...p.b },
  ]);
  return shuffle(cards, rng);
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Награда за игру — не чаще одного раза в день на каждую игру (без бесконечной цепочки наград). */
export function rewardDue(lastRewardDay: string | undefined, today: string): boolean {
  return lastRewardDay !== today;
}

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

// ---------------- «Буын» ----------------

/** Варианты слога: тот же согласный с другой гласной и та же гласная с другим согласным. */
export function syllableOptions(target: Syllable, rng: () => number, n = 4): Syllable[] {
  const near = SYLLABLES.filter((s) => s.id !== target.id && (s.c === target.c || s.v === target.v));
  return shuffle([target, ...shuffle(near, rng).slice(0, n - 1)], rng);
}

/** Картинка к слову для чтения. */
export const pictureOfWord = (word: string): Picture | undefined => PICTURES.find((p) => p.word === word);

/** Слова для чтения/сборки: есть картинка и запись; короткие — для начала. */
export function readingWords(maxLen = 5): string[] {
  return READING_WORDS.filter((w) => w.length <= maxLen && pictureOfWord(w));
}

/** Три картинки: правильная + две с другими словами. */
export function pictureOptions(word: string, rng: () => number, n = 3): Picture[] {
  const right = pictureOfWord(word)!;
  const others = shuffle(PICTURES.filter((p) => p.word !== word && p.id !== 'pear'), rng).slice(0, n - 1);
  return shuffle([right, ...others], rng);
}

// ---------------- «Сөз құра» ----------------

export const letterOf = (ch: string): LetterItem | undefined => LETTERS.find((l) => l.lower === ch.toLowerCase());

/** Плитки для сборки слова: буквы слова + 2 лишние. */
export function wordTiles(word: string, rng: () => number, extra = 2): string[] {
  const letters = [...word.toUpperCase()];
  const pool = LETTERS.filter((l) => l.status !== 'stub' && !letters.includes(l.upper)).map((l) => l.upper);
  return shuffle([...letters, ...shuffle(pool, rng).slice(0, extra)], rng);
}

/** «Қай әріп жетпей тұр?»: позиция пропуска и варианты букв. */
export function missingLetter(word: string, rng: () => number): { pos: number; options: string[] } {
  const letters = [...word.toUpperCase()];
  const pos = Math.floor(rng() * letters.length);
  const right = letters[pos];
  const item = letterOf(right);
  const conf = (item?.confusable ?? []).filter((u) => u !== right && !!letterOf(u) && letterOf(u)!.status !== 'stub'); // confusable — сами буквы, не id
  const rest = LETTERS.filter((l) => l.status !== 'stub' && l.upper !== right).map((l) => l.upper);
  const wrong = [...new Set([...shuffle(conf, rng).slice(0, 1), ...shuffle(rest, rng)])].filter((u) => u !== right).slice(0, 2);
  return { pos, options: shuffle([right, ...wrong], rng) };
}

// ---------------- «Есеп» ----------------

export type MathTask =
  | { kind: 'add' | 'sub'; a: number; b: number; answer: number; options: number[] }
  | { kind: 'more'; a: number; b: number; answer: number; options: number[] }
  | { kind: 'missing'; seq: (number | null)[]; answer: number; options: number[] };

function numOptions(answer: number, max: number, rng: () => number, n = 3): number[] {
  const near = [answer - 1, answer + 1, answer - 2, answer + 2].filter((v) => v >= 0 && v <= max);
  return shuffle([answer, ...shuffle(near, rng).slice(0, n - 1)], rng);
}

/** Задача на счёт. max — до 10 или до 20. */
export function mathTask(kind: 'add' | 'sub' | 'more' | 'missing', max: number, rng: () => number): MathTask {
  const r = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  if (kind === 'add') {
    const a = r(1, max - 1);
    const b = r(1, Math.min(max - a, max === 10 ? 5 : 9));
    return { kind, a, b, answer: a + b, options: numOptions(a + b, max, rng) };
  }
  if (kind === 'sub') {
    const a = r(2, max);
    const b = r(1, Math.min(a - 1, max === 10 ? 5 : 9));
    return { kind, a, b, answer: a - b, options: numOptions(a - b, max, rng) };
  }
  if (kind === 'more') {
    const a = r(1, max);
    let b = r(1, max);
    while (b === a) b = r(1, max);
    return { kind, a, b, answer: Math.max(a, b), options: [a, b] };
  }
  const start = r(1, max - 3);
  const gap = r(1, 2);
  const seq: (number | null)[] = [start, start + 1, start + 2, start + 3];
  const answer = seq[gap] as number;
  seq[gap] = null;
  return { kind: 'missing', seq, answer, options: numOptions(answer, max, rng) };
}

export function pickSyllable(rng: () => number): Syllable {
  return pick(SYLLABLES, rng);
}

// ---------------- «Дыбыстар»: звуковой анализ, как в школе ----------------
// Только однозначные буквы: И, У, Й, Ю, Я, Ё, Э, Ъ, Ь в школе разбирают отдельно — в заданиях их нет.

export const CLEAR_VOWELS = 'аәеоөұүыі';
export const CLEAR_CONSONANTS = 'бвгғджзкқлмнңпрстфхһцчшщ';
export const isVowel = (ch: string) => CLEAR_VOWELS.includes(ch.toLowerCase());
const isClear = (w: string) => [...w].every((ch) => CLEAR_VOWELS.includes(ch) || CLEAR_CONSONANTS.includes(ch));

/** Буквы для «дауысты ма, дауыссыз ба?». */
export const SOUND_LETTERS: LetterItem[] = LETTERS.filter((l) => l.status !== 'stub' && (CLEAR_VOWELS.includes(l.lower) || CLEAR_CONSONANTS.includes(l.lower)));

/** Слова с картинкой и только однозначными буквами. */
export function soundWords(maxLen = 6): Picture[] {
  return PICTURES.filter((p) => p.word.length <= maxLen && isClear(p.word));
}

/** Число слогов = число гласных (для слов из soundWords). */
export const syllableCount = (word: string) => [...word].filter((ch) => CLEAR_VOWELS.includes(ch)).length;

/** Звуковая схема: «д» — гласный (красный), «к» — согласный (синий). Пример: «нан» → «кдк». */
export const schemaOf = (word: string) => [...word].map((ch) => (CLEAR_VOWELS.includes(ch) ? 'д' : 'к')).join('');

/** Три схемы: правильная + две отличающиеся одним-двумя кружками той же длины. */
export function schemaOptions(word: string, rng: () => number): string[] {
  const right = schemaOf(word);
  const flip = (s: string, i: number) => s.slice(0, i) + (s[i] === 'д' ? 'к' : 'д') + s.slice(i + 1);
  const cands = new Set<string>();
  for (let i = 0; i < right.length; i++) {
    cands.add(flip(right, i));
    for (let j = i + 1; j < right.length; j++) cands.add(flip(flip(right, i), j));
  }
  cands.delete(right);
  return shuffle([right, ...shuffle([...cands], rng).slice(0, 2)], rng);
}

/** Варианты для «первый / последний звук»: правильная буква + две другие (похожие — в приоритете). */
export function soundOptions(word: string, pos: 'first' | 'last', rng: () => number): string[] {
  const ch = (pos === 'first' ? word[0] : word[word.length - 1]).toUpperCase();
  const conf = (letterOf(ch)?.confusable ?? []).filter((u) => u !== ch && SOUND_LETTERS.some((l) => l.upper === u) && !word.toUpperCase().includes(u));
  const other = SOUND_LETTERS.map((l) => l.upper).filter((u) => u !== ch && !word.toUpperCase().includes(u));
  const wrong = [...new Set([...shuffle(conf, rng).slice(0, 1), ...shuffle(other, rng)])].filter((u) => u !== ch).slice(0, 2);
  return shuffle([ch, ...wrong], rng);
}

/** Варианты числа слогов: 1–4, правильный всегда есть. */
export function syllableCountOptions(word: string): number[] {
  const n = syllableCount(word);
  const lo = Math.max(1, Math.min(n - 1, 2));
  return [lo, lo + 1, lo + 2].includes(n) ? [lo, lo + 1, lo + 2] : [n - 1, n, n + 1].filter((v) => v >= 1);
}

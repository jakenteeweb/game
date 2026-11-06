// Игры раздела «Ойнап үйрен». Используют только то, с чем ребёнок уже познакомился на уроках.
// Игры не меняют учебный прогресс (освоение считается только на уроках), но дают награду в сад.
import { LETTERS, NUMBERS, type LetterItem, type NumberItem } from '../content';
import type { ItemProgress } from '../engine/progress';

export type GameId = 'memory' | 'feed' | 'pop';

export interface Known {
  letters: LetterItem[];
  numbers: NumberItem[];
}

export function knownFor(progress: Record<string, ItemProgress | undefined>): Known {
  const seen = (id: string) => (progress[id]?.stage ?? 0) > 0;
  return {
    letters: LETTERS.filter((l) => l.status !== 'stub' && l.words[0] && seen(l.id)),
    numbers: NUMBERS.filter((n) => n.status !== 'stub' && n.value >= 1 && n.value <= 5 && seen(n.id)),
  };
}

/** Можно ли играть: для пар нужно хотя бы 2 знакомых символа, для остальных — хотя бы один. */
export function isUnlocked(game: GameId, k: Known): boolean {
  if (game === 'memory') return k.letters.length + k.numbers.length >= 2;
  if (game === 'feed') return k.numbers.length >= 1;
  return k.letters.length >= 1;
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

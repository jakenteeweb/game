import { describe, expect, it } from 'vitest';
import { newProgress, type ItemProgress } from '../engine/progress';
import { isUnlocked, knownFor, memoryCards, rewardDue } from './games';
import { mulberry32 } from '../engine/rng';

const seen = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { ...newProgress('p', id, id.startsWith('L') ? 'letters' : 'numbers'), stage: 1 } as ItemProgress]));

describe('игры «Ойнап үйрен»', () => {
  it('закрыты, пока ребёнок ничего не изучил', () => {
    const k = knownFor({});
    expect(isUnlocked('memory', k)).toBe(false);
    expect(isUnlocked('feed', k)).toBe(false);
    expect(isUnlocked('pop', k)).toBe(false);
  });

  it('используют только знакомое', () => {
    const k = knownFor(seen(['L_a', 'N_2']));
    expect(k.letters.map((l) => l.id)).toEqual(['L_a']);
    expect(k.numbers.map((n) => n.id)).toEqual(['N_2']);
    expect(isUnlocked('memory', k)).toBe(true);
    const cards = memoryCards(k, mulberry32(3));
    expect(cards).toHaveLength(4);
    expect(new Set(cards.map((c) => c.pair))).toEqual(new Set(['L_a', 'N_2']));
  });

  it('в «Жұбын тап» у каждой карточки ровно одна пара', () => {
    const cards = memoryCards(knownFor(seen(['L_a', 'L_n', 'L_t', 'L_ae', 'N_1'])), mulberry32(9));
    expect(cards).toHaveLength(6);
    const byPair: Record<string, number> = {};
    for (const c of cards) byPair[c.pair] = (byPair[c.pair] ?? 0) + 1;
    expect(Object.values(byPair).every((v) => v === 2)).toBe(true);
  });

  it('награда за игру — не чаще раза в день', () => {
    expect(rewardDue(undefined, '2026-11-6')).toBe(true);
    expect(rewardDue('2026-11-6', '2026-11-6')).toBe(false);
    expect(rewardDue('2026-11-5', '2026-11-6')).toBe(true);
  });
});

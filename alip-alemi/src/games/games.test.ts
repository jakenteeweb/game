import { describe, expect, it } from 'vitest';
import { newProgress, type ItemProgress } from '../engine/progress';
import { schemaOf, schemaOptions, soundOptions, soundWords, syllableCount, syllableCountOptions, SOUND_LETTERS, isVowel, knownFor, mathTask, memoryCards, missingLetter, pictureOfWord, pictureOptions, readingWords, rewardDue, syllableOptions, wordTiles, letterOf } from './games';
import { mulberry32 } from '../engine/rng';
import { CLIPS } from '../content';
import { READING_WORDS, SYLLABLES } from '../content/syllables';

const seen = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { ...newProgress('p', id, id.startsWith('L') ? 'letters' : 'numbers'), stage: 1 } as ItemProgress]));

describe('игры', () => {
  it('открыты сразу: без уроков берутся первые буквы программы', () => {
    const k = knownFor({});
    expect(k.letters.length).toBeGreaterThanOrEqual(6);
    expect(k.letters[0].id).toBe('L_a');
    expect(k.numbers.map((n) => n.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it('знакомое с уроков идёт первым', () => {
    const k = knownFor(seen(['L_zh', 'N_7']));
    expect(k.letters[0].id).toBe('L_zh');
    expect(k.numbers.map((n) => n.value)).toContain(7);
  });

  it('в «Жұбын тап» у каждой карточки ровно одна пара', () => {
    const cards = memoryCards(knownFor({}), mulberry32(9));
    expect(cards).toHaveLength(6);
    const byPair: Record<string, number> = {};
    for (const c of cards) byPair[c.pair] = (byPair[c.pair] ?? 0) + 1;
    expect(Object.values(byPair).every((v) => v === 2)).toBe(true);
  });

  it('награда за игру — не чаще раза в день', () => {
    expect(rewardDue(undefined, '2026-11-6')).toBe(true);
    expect(rewardDue('2026-11-6', '2026-11-6')).toBe(false);
  });

  it('слоги и слова для чтения озвучены и с картинками', () => {
    for (const s of SYLLABLES) expect(CLIPS[s.clip], s.id).toBeTruthy();
    for (const w of READING_WORDS) {
      const p = pictureOfWord(w);
      expect(p, w).toBeTruthy();
      expect(CLIPS[`w.${p!.id}`], w).toBeTruthy();
      for (const ch of w) expect(letterOf(ch), `${w}: ${ch}`).toBeTruthy();
    }
    expect(readingWords().length).toBeGreaterThan(10);
  });

  it('варианты в играх корректны', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const s = SYLLABLES[i % SYLLABLES.length];
      const o = syllableOptions(s, rng);
      expect(o).toContain(s);
      expect(new Set(o.map((x) => x.id)).size).toBe(o.length);
      const w = READING_WORDS[i % READING_WORDS.length];
      const pics = pictureOptions(w, rng);
      expect(pics.filter((p) => p.word === w)).toHaveLength(1);
      const tiles = wordTiles(w, rng);
      for (const ch of w.toUpperCase()) expect(tiles).toContain(ch);
      const m = missingLetter(w, rng);
      expect(m.options.filter((x) => x === w.toUpperCase()[m.pos])).toHaveLength(1);
      expect(new Set(m.options).size).toBe(3);
      for (const kind of ['add', 'sub', 'more', 'missing'] as const) {
        for (const max of [10, 20]) {
          const t = mathTask(kind, max, rng);
          expect(t.options).toContain(t.answer);
          expect(new Set(t.options).size).toBe(t.options.length);
          expect(t.options.every((v) => v >= 0 && v <= max)).toBe(true);
          if (t.kind === 'add') expect(t.a + t.b).toBe(t.answer);
          if (t.kind === 'sub') expect(t.a - t.b).toBe(t.answer);
          if (t.kind === 'missing') expect(t.seq.filter((v) => v === null)).toHaveLength(1);
        }
      }
    }
  });

  it('«Дыбыстар»: звуковой анализ как в школе', () => {
    expect(schemaOf('нан')).toBe('кдк');
    expect(schemaOf('алма')).toBe('дккд');
    expect(syllableCount('балық')).toBe(2);
    expect(syllableCount('доп')).toBe(1);
    // В заданиях нет неоднозначных букв (И, У, Й, Ю, Я, Ё, Э).
    for (const l of SOUND_LETTERS) expect('ИУЙЮЯЁЭЪЬ'.includes(l.upper), l.upper).toBe(false);
    expect(isVowel('Ә')).toBe(true);
    expect(isVowel('Қ')).toBe(false);
    const words = soundWords(6);
    expect(words.length).toBeGreaterThan(12);
    const rng = mulberry32(11);
    for (let i = 0; i < 300; i++) {
      const w = words[i % words.length].word;
      expect(/[иуйюяёэъь]/.test(w), w).toBe(false);
      const sch = schemaOptions(w, rng);
      expect(sch).toContain(schemaOf(w));
      expect(new Set(sch).size).toBe(sch.length);
      expect(sch.length).toBeGreaterThanOrEqual(2);
      for (const x of sch) expect(x).toHaveLength(w.length);
      for (const pos of ['first', 'last'] as const) {
        const o = soundOptions(w, pos, rng);
        const right = (pos === 'first' ? w[0] : w[w.length - 1]).toUpperCase();
        expect(o.filter((x) => x === right)).toHaveLength(1);
        expect(new Set(o).size).toBe(3);
      }
      const c = syllableCountOptions(w);
      expect(c).toContain(syllableCount(w));
      expect(c.every((v) => v >= 1)).toBe(true);
    }
    for (const w of ['ай', 'ит']) expect(words.some((p) => p.word === w)).toBe(false);
  });
});

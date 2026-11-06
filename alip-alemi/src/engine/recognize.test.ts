import { describe, expect, it } from 'vitest';
import { STROKES } from '../content/strokes';
import type { Point, Stroke } from '../content/types';
import { accepts, makeTemplate, recognize, MAX_SCORE, NOISE_TEMPLATES } from './recognize';
import { mulberry32 } from './rng';

const SYMBOLS = Object.keys(STROKES);
const templates = SYMBOLS.map((s) => makeTemplate(s, STROKES[s]));

/** «Детское» написание: дрожание, другой масштаб и наклон, обратное направление, другой порядок штрихов. */
function childish(strokes: Stroke[], seed: number): Stroke[] {
  const rng = mulberry32(seed);
  const scale = 0.6 + rng() * 0.9;
  const dx = rng() * 40, dy = rng() * 40;
  const skew = (rng() - 0.5) * 0.25;
  const dense = strokes.map((s) => {
    const out: Point[] = [];
    for (let i = 1; i < s.length; i++) {
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        out.push([s[i - 1][0] + (s[i][0] - s[i - 1][0]) * t, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * t]);
      }
    }
    out.push(s[s.length - 1]);
    return out.map(([x, y]) => [
      (x + skew * y + (rng() - 0.5) * 7) * scale + dx,
      (y + (rng() - 0.5) * 7) * scale + dy,
    ] as Point);
  });
  const reversed = dense.map((s) => (rng() < 0.4 ? [...s].reverse() : s));
  return rng() < 0.5 ? reversed.reverse() : reversed;
}

describe('распознавание написанного', () => {
  it('узнаёт каждый символ в детском написании', () => {
    let ok = 0, total = 0;
    const worst: Record<string, number> = {};
    for (const s of SYMBOLS) {
      for (let seed = 1; seed <= 25; seed++) {
        const r = recognize(childish(STROKES[s], seed * 31 + s.charCodeAt(0)), [...templates, ...NOISE_TEMPLATES])!;
        total++;
        if (r.best === s && r.score <= MAX_SCORE) ok++;
        worst[s] = Math.max(worst[s] ?? 0, r.score);
      }
    }
    // Не меньше 95% верных при заметном дрожании и наклоне.
    expect(ok / total, JSON.stringify(worst)).toBeGreaterThanOrEqual(0.95);
  });

  it('не засчитывает каракули и кружочки', () => {
    const rng = mulberry32(5);
    let accepted = 0;
    for (let k = 0; k < 60; k++) {
      const scribble: Stroke = Array.from({ length: 20 }, () => [rng() * 100, rng() * 100] as Point);
      for (const s of SYMBOLS) if (accepts([scribble], s, templates).ok) accepted++;
    }
    const circle: Stroke = Array.from({ length: 30 }, (_, i) => [50 + 30 * Math.cos(i / 4.6), 50 + 30 * Math.sin(i / 4.6)] as Point);
    for (const s of SYMBOLS) expect(accepts([circle], s, templates).ok).toBe(false);
    expect(accepted / (60 * SYMBOLS.length)).toBeLessThan(0.02);
  });

  it('путает только с тем, что действительно написано', () => {
    // Написали Н, а просили Т — не засчитываем и говорим, что это Н.
    const r = accepts(childish(STROKES['Н'], 7), 'Т', templates);
    expect(r.ok).toBe(false);
    expect(r.recognized).toBe('Н');
  });

  it('пустое или точка — не ответ', () => {
    expect(accepts([], 'А', templates).ok).toBe(false);
    expect(accepts([[[50, 50], [51, 50]]], 'А', templates).ok).toBe(false);
  });
});

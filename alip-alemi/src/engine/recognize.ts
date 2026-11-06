// Распознавание написанного пальцем символа (алгоритм $P, point-cloud recognizer).
// Не зависит от порядка и направления штрихов — подходит для детского письма. Работает без интернета.
import type { Point, Stroke } from '../content/types';

const N = 32;

interface P { x: number; y: number; id: number }

export interface Template {
  /** Что это: id символа или `noise:*` для каракулей. */
  name: string;
  points: P[];
}

function pathLength(pts: P[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) d += dist(pts[i - 1], pts[i]);
  return d;
}
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

function resample(pts: P[], n: number): P[] {
  const I = pathLength(pts) / (n - 1);
  if (!isFinite(I) || I === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));
  let D = 0;
  const src = pts.map((p) => ({ ...p }));
  const out: P[] = [{ ...src[0] }];
  for (let i = 1; i < src.length; i++) {
    if (src[i].id !== src[i - 1].id) continue;
    const d = dist(src[i - 1], src[i]);
    if (D + d >= I) {
      const t = (I - D) / d;
      const q = { x: src[i - 1].x + t * (src[i].x - src[i - 1].x), y: src[i - 1].y + t * (src[i].y - src[i - 1].y), id: src[i].id };
      out.push(q);
      src.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push({ ...src[src.length - 1] });
  return out.slice(0, n);
}

function normalize(pts: P[]): P[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const scaled = pts.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, id: p.id }));
  const cx = scaled.reduce((a, p) => a + p.x, 0) / scaled.length;
  const cy = scaled.reduce((a, p) => a + p.y, 0) / scaled.length;
  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
}

function cloudDistance(a: P[], b: P[], start: number): number {
  const matched = new Array(a.length).fill(false);
  let sum = 0;
  let i = start;
  do {
    let index = -1;
    let min = Infinity;
    for (let j = 0; j < b.length; j++) {
      if (matched[j]) continue;
      const d = dist(a[i], b[j]);
      if (d < min) { min = d; index = j; }
    }
    matched[index] = true;
    const weight = 1 - ((i - start + a.length) % a.length) / a.length;
    sum += weight * min;
    i = (i + 1) % a.length;
  } while (i !== start);
  return sum;
}

function greedyMatch(a: P[], b: P[]): number {
  const step = Math.floor(Math.pow(a.length, 0.5));
  let min = Infinity;
  for (let i = 0; i < a.length; i += step) {
    min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  }
  return min;
}

export function prepare(strokes: Stroke[]): P[] {
  const pts: P[] = [];
  strokes.forEach((s, id) => s.forEach(([x, y]) => pts.push({ x, y, id })));
  if (pts.length === 0) return [];
  return normalize(resample(pts, N));
}

export function makeTemplate(name: string, strokes: Stroke[]): Template {
  return { name, points: prepare(strokes) };
}

/** Шаблоны «не символ»: каракули, кружок, точка-клякса, волна. Если ближе всего они — ответ не засчитывается. */
export const NOISE_TEMPLATES: Template[] = [
  makeTemplate('noise:circle', [Array.from({ length: 25 }, (_, i) => [50 + 35 * Math.cos((i / 24) * 2 * Math.PI), 50 + 35 * Math.sin((i / 24) * 2 * Math.PI)] as Point)]),
  makeTemplate('noise:zigzag', [[[10, 30], [25, 70], [40, 30], [55, 70], [70, 30], [85, 70]]]),
  makeTemplate('noise:scribble', [[[20, 20], [80, 80], [20, 80], [80, 20], [20, 50], [80, 50], [50, 20], [50, 80]]]),
  makeTemplate('noise:wave', [Array.from({ length: 25 }, (_, i) => [10 + i * 3.3, 50 + 20 * Math.sin(i / 2)] as Point)]),
  makeTemplate('noise:hline', [[[10, 50], [90, 50]]]),
];

export interface Recognition {
  best: string;
  score: number;
  ranking: { name: string; score: number }[];
}

/** Распознать штрихи среди шаблонов. Чем меньше score — тем ближе. */
export function recognize(strokes: Stroke[], templates: Template[]): Recognition | null {
  const drawn = prepare(strokes.filter((s) => s.length > 0));
  if (drawn.length === 0) return null;
  const ranking = templates
    .filter((t) => t.points.length)
    .map((t) => ({ name: t.name, score: greedyMatch(drawn, t.points) }))
    .sort((a, b) => a.score - b.score);
  return { best: ranking[0].name, score: ranking[0].score, ranking };
}

/** Порог «похоже на символ вообще». Подобран тестами на искажённых образцах. */
export const MAX_SCORE = 1.35;

/** Засчитать ли написанное как нужный символ. */
export function accepts(strokes: Stroke[], targetName: string, templates: Template[]): { ok: boolean; recognized: string | null } {
  const total = strokes.reduce((a, s) => a + s.length, 0);
  if (total < 4) return { ok: false, recognized: null };
  const r = recognize(strokes, [...templates, ...NOISE_TEMPLATES]);
  if (!r) return { ok: false, recognized: null };
  const recognized = r.best.startsWith('noise:') ? null : r.best;
  return { ok: r.best === targetName && r.score <= MAX_SCORE, recognized };
}

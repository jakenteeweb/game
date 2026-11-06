import { mulberry32 } from '../engine/rng';

export interface Placed {
  x: number; // %
  y: number; // %
  size: number; // px
}

/**
 * Случайная раскладка без наложений: меняются расположение и размер,
 * чтобы ребёнок понимал количество, а не запоминал картинку.
 */
export function layout(n: number, seed: number, opts: { base?: number; aspect?: number } = {}): Placed[] {
  const rng = mulberry32(seed);
  const base = opts.base ?? 64;
  const aspect = opts.aspect ?? 4 / 3;
  const out: Placed[] = [];
  const minDist = n <= 3 ? 30 : n <= 5 ? 24 : 18;
  // Сначала пробуем случайные точки; если не вышло — аккуратная сетка со сдвигами.
  for (let attempt = 0; attempt < 400 && out.length < n; attempt++) {
    const x = 14 + rng() * 72;
    const y = 18 + rng() * 66;
    if (out.every((p) => Math.hypot(p.x - x, (p.y - y) / aspect) >= minDist)) {
      out.push({ x, y, size: Math.round(base * (0.75 + rng() * 0.5)) });
    }
  }
  if (out.length < n) {
    out.length = 0;
    const cols = Math.ceil(Math.sqrt(n * aspect));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      out.push({ x: ((c + 0.5) / cols) * 80 + 10, y: ((r + 0.5) / rows) * 70 + 15, size: Math.round(base * (0.8 + rng() * 0.3)) });
    }
  }
  return out;
}

export function GroupPicture({ count, picture, seed, base = 46 }: { count: number; picture: string; seed: number; base?: number }) {
  const pos = layout(count, seed, { base, aspect: 3 / 4 });
  return (
    <>
      {pos.map((p, i) => (
        <span key={i} className="obj" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }} aria-hidden="true">
          {picture}
        </span>
      ))}
    </>
  );
}

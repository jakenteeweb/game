/** Награды для личного сада: выдаются за участие и старание. */
export const GARDEN_ITEMS = ['🌷', '🌻', '🌼', '🌳', '🍄', '🦋', '🌸', '🐞', '🐝', '🌾', '🐤', '🪺', '🌲', '🐿️', '🌈', '🏡', '🐢', '🍓', '🌹', '🐇'];

export function nextRewards(garden: string[], count: number): string[] {
  return Array.from({ length: count }, (_, i) => GARDEN_ITEMS[(garden.length + i) % GARDEN_ITEMS.length]);
}

/** Детерминированная позиция предмета в саду (на траве). */
export function gardenSpot(i: number): { x: number; y: number; size: number } {
  const golden = 0.61803398875;
  const x = 8 + ((i * golden * 100) % 84);
  const row = Math.floor(i / 7);
  const y = 58 + ((row * 9 + (i % 3) * 5) % 38);
  return { x, y, size: 34 + ((i * 7) % 18) + Math.min(row, 3) * 2 };
}

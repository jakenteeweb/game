// Звёзды и уровни: за правильные ответы на уроках и выигранные раунды в играх.
// Звёзды только прибавляются — ничего не отнимается за ошибки или пропуски.
import { db } from '../storage/db';

export const STARS_PER_LEVEL = 20;

export function levelOf(stars: number) {
  return Math.floor(stars / STARS_PER_LEVEL) + 1;
}

export function levelProgress(stars: number) {
  return (stars % STARS_PER_LEVEL) / STARS_PER_LEVEL;
}

/** Добавить звёзды ребёнку. Возвращает новый счёт и признак «новый уровень». */
export async function awardStars(profileId: string, n: number): Promise<{ stars: number; levelUp: boolean }> {
  const p = await db.getProfile(profileId);
  if (!p || n <= 0) return { stars: p?.stars ?? 0, levelUp: false };
  const before = p.stars ?? 0;
  const stars = before + n;
  await db.putProfile({ ...p, stars });
  return { stars, levelUp: levelOf(stars) > levelOf(before) };
}

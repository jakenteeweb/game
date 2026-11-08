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
/** Итог раунда игры для отчёта: навык и «без ошибок ли». */
export interface SkillResult {
  area: string;
  clean: boolean;
}

/**
 * Добавить звёзды ребёнку и (по желанию) записать итог раунда — одной записью профиля,
 * чтобы две отдельные записи не затирали друг друга. Возвращает новый счёт и признак «новый уровень».
 */
export async function awardStars(profileId: string, n: number, skill?: SkillResult): Promise<{ stars: number; levelUp: boolean }> {
  const p = await db.getProfile(profileId);
  if (!p || (n <= 0 && !skill)) return { stars: p?.stars ?? 0, levelUp: false };
  const before = p.stars ?? 0;
  const stars = before + Math.max(0, n);
  const skills = { ...(p.skills ?? {}) };
  if (skill) {
    const t = skills[skill.area] ?? { ok: 0, tries: 0, at: 0 };
    skills[skill.area] = { ok: t.ok + (skill.clean ? 1 : 0), tries: t.tries + 1, at: Date.now() };
  }
  await db.putProfile({ ...p, stars, skills });
  return { stars, levelUp: levelOf(stars) > levelOf(before) };
}

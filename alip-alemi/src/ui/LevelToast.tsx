import { useEffect, useState } from 'react';
import { chime } from '../audio/audio';
import { awardStars, levelOf, type SkillResult } from '../engine/stars';

type Listener = (level: number) => void;
const listeners = new Set<Listener>();

/** Дать звёзды; при новом уровне — праздничная плашка и фраза «Жаңа деңгей!». */
/**
 * Дать звёзды; при новом уровне — праздничная плашка. Фразу «Жаңа деңгей!» проигрывает вызывающий
 * в своей очереди (после похвалы) — иначе фразы обрывают друг друга.
 */
export async function giveStars(profileId: string, n: number, refresh: () => Promise<void>, skill?: SkillResult): Promise<{ stars: number; levelUp: boolean }> {
  const r = await awardStars(profileId, n, skill);
  await refresh();
  if (r.levelUp) {
    for (const l of listeners) l(levelOf(r.stars));
    chime('tada');
  }
  return r;
}

/** Хвост очереди фраз для нового уровня. */
export const levelUpSteps = (levelUp: boolean) => (levelUp ? [{ pause: 250 }, 'c.level_up'] : []);

export function LevelToast() {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    let t: number | undefined;
    const l: Listener = (lv) => {
      setLevel(lv);
      clearTimeout(t);
      t = window.setTimeout(() => setLevel(null), 2600);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
      clearTimeout(t);
    };
  }, []);
  if (level === null) return null;
  return <div className="level-toast" role="status">⭐ {level}-деңгей! ⭐</div>;
}

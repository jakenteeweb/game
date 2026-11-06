import { useEffect, useState } from 'react';
import { audio, chime } from '../audio/audio';
import { awardStars, levelOf } from '../engine/stars';

type Listener = (level: number) => void;
const listeners = new Set<Listener>();

/** Дать звёзды; при новом уровне — праздничная плашка и фраза «Жаңа деңгей!». */
export async function giveStars(profileId: string, n: number, refresh: () => Promise<void>): Promise<number> {
  const r = await awardStars(profileId, n);
  await refresh();
  if (r.levelUp) {
    for (const l of listeners) l(levelOf(r.stars));
    chime('tada');
    void audio.play(['c.level_up']);
  }
  return r.stars;
}

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

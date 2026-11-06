import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';

/** Ботақан — верблюжонок-помощник с книжкой (иллюстрации сгенерированы в Higgsfield). */
const IMAGES = {
  calm: 'img/botakan.webp',
  cheer: 'img/botakan-happy.webp',
  sleep: 'img/botakan-sleep.webp',
};

type Mood = 'calm' | 'cheer' | 'sleep';

/**
 * Помощник. Покачивается, когда звучит фраза; на похвалу (смена bounceKey) на миг радуется.
 */
export function Mascot({ size = '', mood = 'calm', bounceKey }: { size?: '' | 'small' | 'big'; mood?: Mood; bounceKey?: unknown }) {
  const talking = useSpeaking();
  const [cheer, setCheer] = useState(false);
  useEffect(() => {
    if (bounceKey === undefined) return;
    setCheer(true);
    const t = setTimeout(() => setCheer(false), 1300);
    return () => clearTimeout(t);
  }, [bounceKey]);
  const shown: Mood = cheer ? 'cheer' : mood;
  return (
    <span className={`mascot ${size} ${talking && shown !== 'sleep' ? 'talking' : ''} ${cheer ? 'bounce' : ''}`} aria-hidden="true">
      {(Object.keys(IMAGES) as Mood[]).map((m) => (
        // Все позы загружены сразу — смена мгновенная и работает без интернета.
        <img key={m} src={IMAGES[m]} alt="" draggable={false} style={{ opacity: m === shown ? 1 : 0 }} />
      ))}
    </span>
  );
}

export function useSpeaking() {
  const [s, setS] = useState(audio.speaking);
  useEffect(() => {
    const off = audio.subscribe(() => setS(audio.speaking));
    return () => {
      off();
    };
  }, []);
  return !!s;
}

/** Перерисовка при изменении состояния аудио (загрузка записей, появление голоса). */
export function useAudioVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const off = audio.subscribe(() => setV((x) => x + 1));
    return () => {
      off();
    };
  }, []);
  return v;
}

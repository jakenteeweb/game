import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';

/** Лисёнок Түлкі — добрый помощник. «Говорит», когда звучит фраза. */
export function Fox({ size = '', mood = 'happy', bounceKey }: { size?: '' | 'small' | 'big'; mood?: 'happy' | 'think' | 'sleep'; bounceKey?: unknown }) {
  const talking = useSpeaking();
  const [bounce, setBounce] = useState(false);
  useEffect(() => {
    if (bounceKey === undefined) return;
    setBounce(true);
    const t = setTimeout(() => setBounce(false), 650);
    return () => clearTimeout(t);
  }, [bounceKey]);
  return (
    <svg className={`fox ${size} ${talking && mood !== 'sleep' ? 'talking' : ''} ${bounce ? 'bounce' : ''}`} viewBox="0 0 120 120" aria-hidden="true">
      {/* уши */}
      <path d="M22 18 L44 46 L18 56 Z" fill="#ee8a3c" />
      <path d="M98 18 L76 46 L102 56 Z" fill="#ee8a3c" />
      <path d="M26 27 L39 45 L24 50 Z" fill="#5a3a2a" />
      <path d="M94 27 L81 45 L96 50 Z" fill="#5a3a2a" />
      {/* голова */}
      <path d="M60 30 C88 30 106 48 104 70 C102 92 82 108 60 108 C38 108 18 92 16 70 C14 48 32 30 60 30 Z" fill="#ee8a3c" />
      <path d="M60 64 C76 64 92 74 94 86 C90 100 76 108 60 108 C44 108 30 100 26 86 C28 74 44 64 60 64 Z" fill="#fff6e8" />
      {/* глаза */}
      {mood === 'sleep' ? (
        <>
          <path d="M38 64 Q45 70 52 64" stroke="#3b2a20" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M68 64 Q75 70 82 64" stroke="#3b2a20" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="45" cy="63" rx="6" ry={mood === 'think' ? 5 : 7} fill="#3b2a20" />
          <ellipse cx="75" cy="63" rx="6" ry={mood === 'think' ? 5 : 7} fill="#3b2a20" />
          <circle cx="47" cy="60" r="2" fill="#fff" />
          <circle cx="77" cy="60" r="2" fill="#fff" />
        </>
      )}
      {/* щёчки */}
      <circle cx="33" cy="78" r="6" fill="#f6a5a0" opacity=".7" />
      <circle cx="87" cy="78" r="6" fill="#f6a5a0" opacity=".7" />
      {/* нос и рот */}
      <ellipse cx="60" cy="80" rx="6" ry="4.5" fill="#3b2a20" />
      <g className="mouth">
        <path d="M52 89 Q60 97 68 89" stroke="#3b2a20" strokeWidth="3.5" fill={mood === 'happy' ? '#e56f73' : 'none'} strokeLinecap="round" />
      </g>
    </svg>
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

import { useEffect, useState } from 'react';
import { audio, type Step } from '../audio/audio';
import { NUMBER_WORDS } from '../content/numbers';
import type { LetterItem, NumberItem } from '../content';
import { itemOf, type TaskProps } from './common';
import { layout } from './objects';

/** Этап 1. Знакомство: большая и строчная буква, название, звук, слово с картинкой. */
export function LetterIntro({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec) as LetterItem;
  const word = item.words[0];
  const [ready, setReady] = useState(false);
  const steps: Step[] = [item.introClip!, { pause: 300 }, item.nameClip!];
  if (item.soundClip && audio.canPlay(item.soundClip)) steps.push({ pause: 300 }, 'c.sound_is', item.soundClip);
  if (word) steps.push({ pause: 400 }, word.clipId);

  useEffect(() => {
    setReplay(steps);
    let alive = true;
    void audio.play(steps).then(() => alive && setReady(true));
    // Кнопка появится в любом случае, даже если звук был прерван.
    const t = setTimeout(() => alive && setReady(true), 6000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.uid]);

  return (
    <div className="stage">
      <div className="intro-card">
        <button className="intro-glyph" onClick={() => void audio.play([item.nameClip!])} aria-label={item.upper}>
          {item.upper}<span className="lower">{item.lower}</span>
        </button>
      </div>
      {word && (
        <button className="picture-card" onClick={() => void audio.play([word.clipId])} aria-label={word.word}>
          <div>{word.picture}</div>
          <div className="word">{highlight(word.word, item)}</div>
        </button>
      )}
      {ready && (
        <button className="next-btn appear" aria-label="Әрі қарай" onClick={() => { audio.stop(); onDone({ completed: true, errors: 0, hinted: false }); }}>
          ➜
        </button>
      )}
    </div>
  );
}

function highlight(word: string, item: LetterItem) {
  const cap = word[0].toUpperCase() + word.slice(1);
  return [...cap].map((ch, i) => (
    <span key={i} className={ch.toUpperCase() === item.upper ? 'hl' : ''}>{ch}</span>
  ));
}

/** Знакомство с числом: цифра как знак + пересчёт предметов (каждый подсвечивается один раз). */
export function NumberIntro({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec) as NumberItem;
  const n = item.value;
  const pos = layout(n, spec.seed, { base: 70 });
  const [lit, setLit] = useState(0);
  const [ready, setReady] = useState(false);
  const countSteps = (): Step[] => [item.introClip!, { pause: 300 }, 'c.count_intro'];

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLit(0);
      setReady(false);
      const ok = await audio.play(countSteps());
      if (!ok || !alive) return;
      for (let i = 1; i <= n; i++) {
        if (!alive) return;
        setLit(i);
        const ok2 = await audio.play([`n.${i}.name`, { pause: 250 }]);
        if (!ok2) return;
      }
      if (alive) await audio.play([`n.${n}.total`]);
      if (alive) setReady(true);
    };
    setReplay([item.introClip!, `n.${n}.total`]);
    void run();
    const t = setTimeout(() => alive && setReady(true), 9000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.uid]);

  return (
    <div className="stage">
      <button className="intro-glyph numbers" onClick={() => void audio.play([item.nameClip!])} aria-label={NUMBER_WORDS[n]}>
        {item.digit}
      </button>
      <div className="field">
        {pos.map((p, i) => (
          <span key={i} className={`obj ${lit === i + 1 ? 'flash' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}>
            {spec.object?.picture}
            {lit > i && <span className="num">{i + 1}</span>}
          </span>
        ))}
      </div>
      {ready && (
        <button className="next-btn appear" aria-label="Әрі қарай" onClick={() => { audio.stop(); onDone({ completed: true, errors: 0, hinted: false }); }}>
          ➜
        </button>
      )}
    </div>
  );
}

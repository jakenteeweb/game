import { useMemo, useRef, useState } from 'react';
import { audio, chime } from '../audio/audio';
import type { LetterItem } from '../content';
import { mulberry32, shuffle } from '../engine/rng';
import { Pic } from './objects';
import { OptionFace, SpeakerButton, itemOf, optionLabel, retryClip, useInstruction, useTapGuard, type TaskProps } from './common';

const COLORS = ['#e67a8f', '#7cbf7a', '#5aa9cf', '#f2a65a', '#b9a6e6', '#e8b84a'];

/** Этап 5. Закрепление: найти все шары с нужной буквой. */
export function BalloonsTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec) as LetterItem;
  const steps = [item.balloonsClip!];
  useInstruction(steps, setReplay, [spec.uid]);
  const guard = useTapGuard();
  const [popped, setPopped] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const errors = useRef(0);
  const hinted = useRef(false);
  const done = useRef(false);

  const places = useMemo(() => {
    const rng = mulberry32(spec.seed);
    const slots = shuffle([...Array(8).keys()], rng).slice(0, spec.options.length);
    return spec.options.map((_, i) => {
      const s = slots[i];
      return {
        left: (s % 4) * 25 + 1.5 + rng() * 2,
        top: Math.floor(s / 4) * 48 + 2 + rng() * 6,
        color: COLORS[(i + Math.floor(rng() * 6)) % COLORS.length],
        delay: rng() * 2,
      };
    });
  }, [spec]);

  const targets = spec.options.map((o, i) => (o === spec.itemId ? i : -1)).filter((i) => i >= 0);

  const tap = (i: number) => {
    if (done.current || guard.tooEarly() || popped.includes(i)) return;
    if (spec.options[i] === spec.itemId) {
      chime('pop');
      const next = [...popped, i];
      setPopped(next);
      if (targets.every((t) => next.includes(t))) {
        done.current = true;
        setTimeout(() => onDone({ completed: true, errors: errors.current, hinted: hinted.current }), 400);
      }
      return;
    }
    errors.current += 1;
    setWrong(i);
    setTimeout(() => setWrong(null), 450);
    if (guard.wrongBurst()) {
      hinted.current = true;
      void audio.play(['c.slow', { pause: 200 }, ...steps]);
      return;
    }
    if (errors.current >= 2) {
      hinted.current = true;
      setHint(true);
      void audio.play(['c.hint']);
    } else {
      void audio.play([retryClip()]);
    }
  };

  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
        {item.words[0] && <span className="picture-card" aria-hidden="true"><Pic obj={item.words[0]} size={72} /></span>}
      </div>
      <div className="sky">
        {spec.options.map((opt, i) => {
          const l = optionLabel(opt);
          const p = places[i];
          return (
            <button
              key={i}
              data-opt={opt}
              className={`balloon ${popped.includes(i) ? 'popped' : ''} ${wrong === i ? 'wrong' : ''} ${hint && opt === spec.itemId ? 'hint' : ''}`}
              style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s` }}
              onClick={() => tap(i)}
              aria-label={l.text}
            >
              <div className={`b ${l.shape ? 'shape' : ''}`} style={{ background: p.color }}>{l.pic ? <OptionFace opt={opt} size={48} /> : l.text}</div>
              <div className="string" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

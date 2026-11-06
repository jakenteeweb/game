import { useMemo, useRef, useState } from 'react';
import { audio, chime } from '../audio/audio';
import type { NumberItem } from '../content';
import { mulberry32 } from '../engine/rng';
import { GroupPicture, layout } from './objects';
import { SpeakerButton, itemOf, retryClip, useInstruction, useTapGuard, type TaskProps } from './common';

/**
 * Пересчёт: ребёнок касается каждого предмета, предмет подсвечивается и получает номер ровно один раз.
 * Повторное касание того же предмета ничего не меняет — двойного подсчёта не бывает.
 */
export function CountTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec) as NumberItem;
  const n = item.value;
  const pos = useMemo(() => layout(n, spec.seed, { base: 72 }), [n, spec.seed]);
  const [order, setOrder] = useState<number[]>([]);
  const done = useRef(false);
  const steps = ['c.count'];
  useInstruction(steps, setReplay, [spec.uid]);

  const tap = (i: number) => {
    if (done.current || order.includes(i)) return;
    const next = [...order, i];
    setOrder(next);
    chime('pop');
    if (next.length === n) {
      done.current = true;
      void audio.play([`n.${next.length}.name`, { pause: 300 }, `n.${n}.total`]).then(() => onDone({ completed: true, errors: 0, hinted: false }));
    } else {
      void audio.play([`n.${next.length}.name`]);
    }
  };

  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
      </div>
      <div className="field">
        {pos.map((p, i) => {
          const k = order.indexOf(i);
          return (
            <button key={i} className={`obj ${k >= 0 ? 'counted flash' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }} onClick={() => tap(i)} aria-label={spec.object?.word}>
              {spec.object?.picture}
              {k >= 0 && <span className="ring" />}
              {k >= 0 && <span className="num">{k + 1}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** «Положи в корзину три яблока». Касание — положить, касание в корзине — вернуть. */
export function BasketTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec) as NumberItem;
  const n = item.value;
  const pool = spec.pool ?? n + 2;
  const object = spec.object!;
  const clip = `n.${n}.basket.${object.word}`;
  const steps = [clip];
  useInstruction(steps, setReplay, [spec.uid]);
  const guard = useTapGuard();
  const [inBasket, setIn] = useState<number[]>([]);
  const [hint, setHint] = useState(false);
  const errors = useRef(0);
  const hinted = useRef(false);
  const done = useRef(false);

  const toggle = (i: number) => {
    if (done.current || guard.tooEarly()) return;
    const adding = !inBasket.includes(i);
    const next = adding ? [...inBasket, i] : inBasket.filter((x) => x !== i);
    setIn(next);
    if (adding) {
      chime('pop');
      // Подсчёт вслух как опора (записи есть для 1–5).
      if (next.length <= 5) void audio.play([`n.${next.length}.name`]);
    }
  };

  const check = () => {
    if (done.current) return;
    if (inBasket.length === n) {
      done.current = true;
      onDone({ completed: true, errors: errors.current, hinted: hinted.current });
      return;
    }
    errors.current += 1;
    chime('soft');
    if (errors.current >= 2) {
      hinted.current = true;
      setHint(true);
    }
    void audio.play([inBasket.length > n ? 'c.too_many' : 'c.too_few', { pause: 300 }, ...(errors.current === 1 ? [retryClip()] : [clip])]);
  };

  const outside = [...Array(pool).keys()].filter((i) => !inBasket.includes(i));
  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
      </div>
      <div className="basket-area">
        <div className="pile">
          {outside.map((i) => (
            <button key={i} onClick={() => toggle(i)} aria-label={object.word}>{object.picture}</button>
          ))}
        </div>
        <div className="basket" aria-label="себет">
          {inBasket.map((i, k) => (
            <button key={i} className={hint && k >= n ? 'extra' : ''} onClick={() => toggle(i)} aria-label={object.word}>{object.picture}</button>
          ))}
          {hint && inBasket.length < n && [...Array(n - inBasket.length)].map((_, k) => (
            <span key={`h${k}`} style={{ fontSize: 50, opacity: 0.25 }} aria-hidden="true">{object.picture}</span>
          ))}
        </div>
        <button className="done-btn" onClick={check} aria-label="Дайын">✓</button>
      </div>
    </div>
  );
}

/** Выбери группу, где N предметов. Группы различаются размером и раскладкой предметов. */
export function ChooseGroupTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec) as NumberItem;
  const groups = spec.groups ?? [item.value];
  const steps = [item.chooseClip!];
  useInstruction(steps, setReplay, [spec.uid]);
  const guard = useTapGuard();
  const [wrong, setWrong] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const errors = useRef(0);
  const hinted = useRef(false);
  const done = useRef(false);
  const seeds = useMemo(() => {
    const r = mulberry32(spec.seed);
    return groups.map(() => Math.floor(r() * 1e9));
  }, [spec.seed, groups]);
  // Разный размер предметов в группах: больше не значит «больше штук».
  const sizes = useMemo(() => groups.map((g, i) => (g === item.value ? 38 : 44 + (i % 2) * 8)), [groups, item.value]);

  const tap = (i: number) => {
    if (done.current || guard.tooEarly()) return;
    if (groups[i] === item.value) {
      done.current = true;
      setRight(i);
      chime('pop');
      setTimeout(() => onDone({ completed: true, errors: errors.current, hinted: hinted.current }), 400);
      return;
    }
    errors.current += 1;
    setWrong(i);
    setTimeout(() => setWrong(null), 450);
    if (guard.wrongBurst() || errors.current >= 2) {
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
        <span className="intro-glyph numbers" style={{ fontSize: 64, padding: '4px 22px' }}>{item.digit}</span>
      </div>
      <div className={`groups n${groups.length}`}>
        {groups.map((g, i) => (
          <button
            key={i}
            data-count={g}
            className={`group-card ${wrong === i ? 'wrong' : ''} ${right === i ? 'right' : ''} ${hint && g === item.value && right === null ? 'hint' : ''}`}
            onClick={() => tap(i)}
            aria-label={`${g}`}
          >
            <GroupPicture count={g} picture={spec.object?.picture ?? '🍎'} seed={seeds[i]} base={sizes[i]} />
          </button>
        ))}
      </div>
    </div>
  );
}

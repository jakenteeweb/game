import { useEffect, useMemo, useRef, useState } from 'react';
import { audio, chime } from '../audio/audio';
import type { NumberItem } from '../content';
import { mulberry32 } from '../engine/rng';
import { GroupPicture, Pic, layout } from './objects';
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
  const steps = n === 0 ? [`n.0.total`] : ['c.count'];
  useInstruction(steps, setReplay, [spec.uid]);
  // Ноль: считать нечего — показываем пустое поле, говорим «барлығы — нөл» и идём дальше (не застреваем).
  useEffect(() => {
    if (n !== 0) return;
    const t = window.setTimeout(() => { if (!done.current) { done.current = true; onDone({ completed: true, errors: 0, hinted: true }); } }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.uid]);

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
            <button key={i} className={`obj ${k >= 0 ? 'counted flash' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => tap(i)} aria-label={spec.object?.word}>
              <Pic obj={spec.object} size={p.size} />
              {k >= 0 && <span className="ring" />}
              {k >= 0 && <span className="num">{k + 1}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Места внутри корзины (в % от картинки корзины 480×495): сначала передний ряд, потом задний, потом верх горки.
 * Нижняя часть предметов уходит за передний край — они лежат внутри, а не висят перед корзиной.
 */
const BASKET_SLOTS = [
  { x: 50, y: 52, r: -4 }, { x: 31, y: 51, r: 8 }, { x: 69, y: 51, r: -8 },
  { x: 40, y: 45, r: 12 }, { x: 60, y: 45, r: -10 }, { x: 22, y: 46, r: -6 }, { x: 78, y: 46, r: 6 },
  { x: 50, y: 39, r: 3 },
];

/** Длинные предметы (морковь) кладём наискосок, крест-накрест — как в настоящей корзине. */
function lyingAngle(image: string | undefined, k: number): number {
  return image?.includes('carrot') ? (k % 2 ? 22 : -22) : 0;
}

/** Высокие предметы приподнимаем, чтобы над краем корзины была видна большая часть каждого. */
function liftOf(image: string | undefined): number {
  return image?.includes('carrot') ? 14 : image?.includes('pear') ? 2 : 0;
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
            <button key={i} onClick={() => toggle(i)} aria-label={object.word}><Pic obj={object} size={72} /></button>
          ))}
        </div>
        <div className="basket" aria-label="себет" data-obj={object.image?.replace(/^.*\/|\.webp$/g, '')}>
          {/* задняя стенка */}
          <img className="basket-back" src="img/basket.webp" alt="" draggable={false} />
          {/* предметы лежат внутри: между задней стенкой и передним краем */}
          {[
            ...inBasket.map((i, k) => ({ key: `i${i}`, k, ghost: false, i })),
            ...(hint && inBasket.length < n ? [...Array(n - inBasket.length)].map((_, g) => ({ key: `g${g}`, k: inBasket.length + g, ghost: true, i: -1 })) : []),
          ]
            .map((e) => ({ ...e, slot: BASKET_SLOTS[e.k % BASKET_SLOTS.length] }))
            .sort((a, b) => a.slot.y - b.slot.y)
            .map((e) =>
              e.ghost ? (
                <span key={e.key} className="in-basket ghost" style={{ left: `${e.slot.x}%`, top: `${e.slot.y - liftOf(object.image)}%` }} aria-hidden="true">
                  <Pic obj={object} size={200} />
                </span>
              ) : (
                <button
                  key={e.key}
                  className={`in-basket ${hint && e.k >= n ? 'extra' : ''}`}
                  style={{ left: `${e.slot.x}%`, top: `${e.slot.y - liftOf(object.image)}%`, rotate: `${lyingAngle(object.image, e.k) + e.slot.r}deg` }}
                  onClick={() => toggle(e.i)}
                  aria-label={object.word}
                >
                  <Pic obj={object} size={200} />
                </button>
              ),
            )}
          {/* передний край корзины перекрывает низ предметов */}
          <img className="basket-front" src="img/basket.webp" alt="" draggable={false} />
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
            <GroupPicture count={g} obj={spec.object} seed={seeds[i]} base={sizes[i]} />
          </button>
        ))}
      </div>
    </div>
  );
}

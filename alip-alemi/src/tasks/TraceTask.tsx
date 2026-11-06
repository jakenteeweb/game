import { useMemo, useRef, useState } from 'react';
import { audio, chime } from '../audio/audio';
import type { Point, Stroke } from '../content';
import { SpeakerButton, itemOf, retryClip, useInstruction, type TaskProps } from './common';

/** Насколько можно отклониться от линии (в единицах поля 100×100) — щедро для маленьких пальцев. */
const TOLERANCE = 13;
const START_ZONE = 0.4;
const NEED_COVERAGE = 0.7;

export function sampleStroke(stroke: Stroke, step = 2.5): Point[] {
  const out: Point[] = [stroke[0]];
  for (let i = 1; i < stroke.length; i++) {
    const [x0, y0] = stroke[i - 1];
    const [x1, y1] = stroke[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}

/** Проверка обведения: терпима к неточностям, важно пройти большую часть линии и дойти до конца. */
export function strokeAccepted(samples: Point[], path: Point[]): boolean {
  if (path.length < 2) return false;
  const covered = samples.map((s) => path.some((p) => Math.hypot(p[0] - s[0], p[1] - s[1]) <= TOLERANCE));
  const ratio = covered.filter(Boolean).length / samples.length;
  const tail = covered.slice(Math.floor(samples.length * 0.85));
  return ratio >= NEED_COVERAGE && tail.some(Boolean);
}

export function startsNearBeginning(samples: Point[], p: Point): boolean {
  const zone = samples.slice(0, Math.max(2, Math.ceil(samples.length * START_ZONE)));
  return zone.some((s) => Math.hypot(p[0] - s[0], p[1] - s[1]) <= TOLERANCE + 6);
}

const toPoints = (s: Point[]) => s.map((p) => p.join(',')).join(' ');

/** Этап 4. Обведение пальцем по широкому контуру с показом старта и направления. */
export function TraceTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec);
  const strokes = item.strokes;
  const samples = useMemo(() => strokes.map((s) => sampleStroke(s)), [strokes]);
  const [idx, setIdx] = useState(0);
  const [path, setPath] = useState<Point[]>([]);
  const [demo, setDemo] = useState(false);
  const [nudge, setNudge] = useState(0);
  const drawing = useRef(false);
  const pathRef = useRef<Point[]>([]);
  const fails = useRef(0);
  const strokeFails = useRef(0);
  const hinted = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const finished = useRef(false);

  const steps = ['c.trace'];
  useInstruction(steps, setReplay, [spec.uid]);

  const toLocal = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
  };

  const completeStroke = () => {
    chime('pop');
    strokeFails.current = 0;
    setDemo(false);
    setPath([]);
    if (idx + 1 >= strokes.length) {
      finished.current = true;
      setIdx(strokes.length);
      setTimeout(() => onDone({ completed: true, errors: fails.current, hinted: hinted.current }), 500);
    } else {
      setIdx(idx + 1);
    }
  };

  const down = (e: React.PointerEvent) => {
    if (finished.current) return;
    const p = toLocal(e);
    if (!startsNearBeginning(samples[idx], p)) {
      setNudge((n) => n + 1); // мягко подсвечиваем звёздочку-старт, ошибкой не считаем
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    pathRef.current = [p];
    setPath([p]);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    pathRef.current = [...pathRef.current, toLocal(e)];
    setPath(pathRef.current);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (strokeAccepted(samples[idx], pathRef.current)) {
      completeStroke();
      return;
    }
    fails.current += 1;
    strokeFails.current += 1;
    setPath([]);
    if (strokeFails.current >= 3) {
      // Не мучаем ребёнка: показываем и засчитываем как выполненное с подсказкой.
      hinted.current = true;
      completeStroke();
    } else if (strokeFails.current === 2) {
      hinted.current = true;
      setDemo(true);
      void audio.play(['c.hint']);
    } else {
      void audio.play([retryClip()]);
    }
  };

  const current = strokes[idx];
  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
      </div>
      <div className="trace-wrap">
        <svg ref={svgRef} viewBox="-6 -6 112 112" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label="trace" data-strokes={JSON.stringify(strokes.slice(idx))}>
          {strokes.map((s, i) => (
            <polyline key={`g${i}`} points={toPoints(s)} fill="none" stroke={i < idx ? '#9fd39c' : '#f1e2cf'} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {current && (
            <>
              <polyline points={toPoints(current)} fill="none" stroke="#e2c9a8" strokeWidth="2.2" strokeDasharray="3 4" strokeLinecap="round" strokeLinejoin="round" />
              {/* направление: точка бежит по линии */}
              <circle r={demo ? 5 : 3} fill={demo ? '#7cbf7a' : '#ee8a3c'} opacity={demo ? 1 : 0.8}>
                <animateMotion dur={demo ? '1.6s' : '2.2s'} repeatCount="indefinite" path={`M${current.map((p) => p.join(' ')).join(' L')}`} />
              </circle>
              {/* старт */}
              <text key={nudge} x={current[0][0]} y={current[0][1] + 4} fontSize="13" textAnchor="middle" className={nudge ? 'fox bounce' : ''}>⭐</text>
            </>
          )}
          {path.length > 1 && <polyline points={toPoints(path)} fill="none" stroke="#ee8a3c" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { audio, chime, type Step } from '../audio/audio';
import { ITEMS, glyph, itemsOf, type Point, type Stroke } from '../content';
import { accepts, makeTemplate } from '../engine/recognize';
import { SpeakerButton, itemOf, retryClip, useInstruction, type TaskProps } from './common';

const toPoints = (s: Point[]) => s.map((p) => p.join(',')).join(' ');

/**
 * «Жаз!» — напиши сам. Тетрадный лист в клетку, без контура.
 * Ребёнок пишет пальцем, приложение распознаёт написанное и показывает результат.
 */
export function WriteTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec);
  const steps: Step[] = [item.writeClip!];
  useInstruction(steps, setReplay, [spec.uid]);

  // Сравниваем со всеми подготовленными символами этой дорожки: так «Н» вместо «Т» распознаётся как «Н».
  const templates = useMemo(
    () => itemsOf(item.track).filter((i) => i.status !== 'stub' && i.strokes.length).map((i) => makeTemplate(i.id, i.strokes)),
    [item.track],
  );

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const [model, setModel] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; recognized: string | null } | null>(null);
  const drawing = useRef(false);
  const cur = useRef<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const errors = useRef(0);
  const hinted = useRef(false);
  const finished = useRef(false);

  const toLocal = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
  };
  const down = (e: React.PointerEvent) => {
    if (finished.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    setResult(null);
    cur.current = [toLocal(e)];
    setCurrent(cur.current);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    cur.current = [...cur.current, toLocal(e)];
    setCurrent(cur.current);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = cur.current; // копия ссылки до очистки — иначе штрих сохранится пустым
    if (stroke.length > 1) setStrokes((s) => [...s, stroke]);
    cur.current = [];
    setCurrent([]);
  };

  const clear = () => {
    if (finished.current) return;
    setStrokes([]);
    setResult(null);
  };

  const check = async () => {
    if (finished.current || strokes.length === 0) return;
    const r = accepts(strokes, item.id, templates);
    setResult(r);
    if (r.ok) {
      finished.current = true;
      chime('pop');
      setTimeout(() => onDone({ completed: true, errors: errors.current, hinted: hinted.current }), 900);
      return;
    }
    errors.current += 1;
    chime('soft');
    // Лист очищаем сразу: ребёнок может начать писать заново, пока лиса говорит.
    setStrokes([]);
    // Показываем, что получилось: «Сен мынаны жаздың: Н».
    const said: Step[] = [];
    if (r.recognized && ITEMS[r.recognized]?.nameClip) said.push('c.you_wrote', ITEMS[r.recognized].nameClip!, { pause: 300 });
    if (errors.current >= 3 && model) {
      // Не мучаем: с образцом засчитываем как выполненное с подсказкой.
      finished.current = true;
      hinted.current = true;
      setResult({ ok: true, recognized: item.id });
      await audio.play(['c.effort']);
      onDone({ completed: true, errors: errors.current, hinted: true });
      return;
    }
    if (errors.current >= 2) {
      hinted.current = true;
      setModel(true);
      await audio.play([...said, 'c.hint', { pause: 200 }, ...steps]);
    } else {
      await audio.play([...said, retryClip()]);
    }
  };

  const recognizedGlyph = result?.recognized ? glyph(ITEMS[result.recognized]) : null;
  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
        {result && (
          <span className={`write-result ${result.ok ? 'ok' : 'no'}`} aria-live="polite">
            {result.ok ? `✓ ${glyph(item)}` : recognizedGlyph ?? '?'}
          </span>
        )}
      </div>
      <div className="notebook">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label="write"
          data-strokes={JSON.stringify(item.strokes)}
        >
          {/* клетки тетради */}
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <line x1={i * 10} y1={0} x2={i * 10} y2={100} className="grid" />
              <line x1={0} y1={i * 10} x2={100} y2={i * 10} className="grid" />
            </g>
          ))}
          <line x1={92} y1={0} x2={92} y2={100} className="margin" />
          {/* образец после второй попытки — бледно, как в прописи */}
          {model && item.strokes.map((s, i) => (
            <polyline key={`m${i}`} points={toPoints(s.map(([x, y]) => [x * 0.8 + 6, y * 0.8 + 8] as Point))} className="model" />
          ))}
          {[...strokes, current].filter((s) => s.length > 1).map((s, i) => (
            <polyline key={i} points={toPoints(s)} className={`ink ${result?.ok ? 'ok' : ''}`} />
          ))}
        </svg>
      </div>
      <div className="row-wrap" style={{ gap: 18 }}>
        <button className="icon-btn" aria-label="Өшіру" onClick={clear}>🧽</button>
        <button className="done-btn" aria-label="Дайын" onClick={() => void check()}>✓</button>
      </div>
    </div>
  );
}

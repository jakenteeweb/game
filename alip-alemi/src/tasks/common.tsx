import { useEffect, useRef, useState } from 'react';
import { audio, chime, type Step } from '../audio/audio';
import { CLIPS, ITEMS, RETRY, glyph, type Item } from '../content';
import { RULES } from '../content/curriculum';
import type { Outcome } from '../engine/progress';
import type { TaskSpec } from '../engine/session';
import { useSpeaking } from '../ui/Mascot';
import { PICTURE_BY_ID, type Picture } from '../content/pictures';
import { Pic } from './objects';

export interface TaskProps {
  spec: TaskSpec;
  onDone: (o: Outcome) => void;
  /** Задание сообщает, какую фразу проигрывать по кнопке «Послушать ещё раз». */
  setReplay: (steps: Step[]) => void;
}

export const itemOf = (spec: TaskSpec): Item => ITEMS[spec.itemId];

export function optionLabel(opt: string): { text: string; shape: boolean; pic?: Picture } {
  if (opt.startsWith('shape:')) return { text: opt.slice(6), shape: true };
  if (opt.startsWith('pic:')) {
    const pic = PICTURE_BY_ID[opt.slice(4)];
    return { text: pic.word, shape: false, pic };
  }
  return { text: glyph(ITEMS[opt]), shape: false };
}

/** Содержимое варианта: буква/цифра, фигура или картинка. */
export function OptionFace({ opt, size = 110 }: { opt: string; size?: number }) {
  const l = optionLabel(opt);
  return l.pic ? <Pic obj={l.pic} size={size} /> : <>{l.text}</>;
}

let retryTurn = 0;
export function retryClip() {
  return RETRY[retryTurn++ % RETRY.length];
}

/**
 * Защита от случайных нажатий: касания сразу после появления задания игнорируются,
 * серия быстрых неверных касаний считается «тыканием наугад» и не засчитывается.
 */
export function useTapGuard() {
  const shownAt = useRef(Date.now());
  const wrongTimes = useRef<number[]>([]);
  return {
    tooEarly: () => Date.now() - shownAt.current < RULES.minTapDelayMs,
    /** Регистрирует неверное касание. true — похоже на случайные нажатия. */
    wrongBurst: () => {
      const now = Date.now();
      wrongTimes.current = [...wrongTimes.current.filter((t) => now - t < RULES.randomTapWindowMs), now];
      if (wrongTimes.current.length >= RULES.randomTapBurst) {
        wrongTimes.current = [];
        return true;
      }
      return false;
    },
  };
}

/** Проиграть инструкцию при появлении задания и зарегистрировать её для повтора. */
export function useInstruction(steps: Step[], setReplay: (s: Step[]) => void, deps: unknown[] = []) {
  useEffect(() => {
    setReplay(steps);
    void audio.play(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function SpeakerButton({ steps, big }: { steps: Step[]; big?: boolean }) {
  const speaking = useSpeaking();
  return (
    <button className={`icon-btn speaker ${speaking ? 'pulse' : ''} ${big ? '' : 'small'}`} aria-label="Тыңдау" onClick={() => void audio.play(steps)}>
      🔊
    </button>
  );
}

/**
 * Общая логика задания с выбором: ошибка → убрать один неверный вариант и спокойно предложить ещё раз,
 * вторая ошибка → подсветить правильный (подсказка, ответ не считается самостоятельным).
 */
export function useChoice(spec: TaskSpec, correct: (opt: string) => boolean, onDone: (o: Outcome) => void, replay: () => void) {
  const [removed, setRemoved] = useState<number[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [rightIdx, setRightIdx] = useState<number | null>(null);
  const errors = useRef(0);
  const hinted = useRef(false);
  const finished = useRef(false);
  const guard = useTapGuard();

  const tap = (opt: string, idx: number) => {
    if (finished.current || guard.tooEarly() || removed.includes(idx)) return;
    if (correct(opt)) {
      finished.current = true;
      setRightIdx(idx);
      chime('pop');
      setTimeout(() => onDone({ completed: true, errors: errors.current, hinted: hinted.current }), 350);
      return;
    }
    errors.current += 1;
    setWrongIdx(idx);
    setTimeout(() => setWrongIdx(null), 450);
    if (guard.wrongBurst()) {
      // Похоже на нажатия наугад: не засчитываем, спокойно повторяем задание.
      hinted.current = true;
      void audio.play(['c.slow', { pause: 200 }]).then((ok) => ok && !finished.current && replay());
      return;
    }
    chime('soft');
    const wrongLeft = spec.options.map((o, i) => ({ o, i })).filter(({ o, i }) => !correct(o) && !removed.includes(i));
    if (errors.current === 1 && wrongLeft.length > 1) {
      setRemoved((r) => [...r, idx]);
      void audio.play([retryClip()]);
    } else {
      hinted.current = true;
      setHint(true);
      void audio.play(['c.hint']);
    }
  };

  const classFor = (opt: string, idx: number) =>
    [
      'choice',
      optionLabel(opt).shape ? 'shape' : '',
      removed.includes(idx) ? 'gone' : '',
      wrongIdx === idx ? 'wrong' : '',
      rightIdx === idx ? 'right' : '',
      hint && correct(opt) && rightIdx === null ? 'hint' : '',
    ].join(' ');

  return { tap, classFor };
}

export function clipExists(id: string | undefined): id is string {
  return !!id && !!CLIPS[id];
}

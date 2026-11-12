import { audio, type Step } from '../audio/audio';
import type { LetterItem, NumberItem } from '../content';
import { GroupPicture, Pic } from './objects';
import { OptionFace, SpeakerButton, itemOf, optionLabel, useChoice, useInstruction, type TaskProps } from './common';
import { PICTURE_BY_ID } from '../content/pictures';

/**
 * Выбор символа:
 *  recognize — «Найди букву А» (+ картинка слова как опора, без показа самой буквы);
 *  listen    — звук без картинки и без текста;
 *  findDigit — «Найди цифру 3»;
 *  matchDigit — показана группа предметов, найди её цифру (количество → знак);
 *  wordMatch — показана буква, найди картинку слова на эту букву.
 */
export function ChoiceTask({ spec, onDone, setReplay }: TaskProps) {
  const item = itemOf(spec);
  const mode = spec.showAs;
  let steps: Step[];
  if (mode === 'listen') {
    const l = item as LetterItem;
    const sound = l.soundClip && audio.canPlay(l.soundClip) ? l.soundClip : l.nameClip!;
    steps = ['c.listen', { pause: 400 }, sound];
  } else if (mode === 'matchDigit') {
    steps = ['c.match'];
  } else if (mode === 'wordMatch') {
    steps = [(item as LetterItem).matchClip!];
  } else if (item.track === 'letters') {
    steps = [item.findClip!];
  } else {
    steps = [(item as NumberItem).findClip!];
  }
  useInstruction(steps, setReplay, [spec.uid]);
  const answer = mode === 'wordMatch'
    ? spec.options.find((o) => PICTURE_BY_ID[o.slice(4)]?.word === (item as LetterItem).words[0]?.word) ?? ''
    : spec.itemId;
  const { tap, classFor, feedback, correct } = useChoice(spec, (o) => o === answer, onDone, () => void audio.play(steps));

  // Если инструкцию нельзя озвучить, для чисел показываем количество — иначе задание не понять без чтения.
  const showGroup = mode === 'matchDigit' || (mode === 'findDigit' && !audio.canPlay(steps[0] as string));
  const n = spec.options.length;

  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
        {mode === 'wordMatch' && (
          <button className="picture-card letter-card" onClick={() => void audio.play([(item as LetterItem).nameClip!])} aria-label={(item as LetterItem).upper}>
            {(item as LetterItem).upper}
          </button>
        )}
        {item.track === 'letters' && mode !== 'listen' && mode !== 'wordMatch' && (item as LetterItem).words[0] && (
          <button className="picture-card" onClick={() => void audio.play([(item as LetterItem).words[0].clipId])} aria-label="сурет">
            <Pic obj={(item as LetterItem).words[0]} size={72} />
          </button>
        )}
      </div>
      {showGroup && item.track === 'numbers' && (
        <div className="group-card" style={{ width: 'min(60vw, 260px)', aspectRatio: '4 / 3' }}>
          <GroupPicture count={(item as NumberItem).value} obj={spec.object} seed={spec.seed} base={44} />
        </div>
      )}
      {item.track === 'letters' && <div className={`exercise-feedback ${correct ? 'success' : ''}`} role="status" aria-live="polite">{feedback || 'Тыңда. Ойлан. Таңда.'}</div>}
      <div className={`choices n${n}`} data-answer={answer}>
        {spec.options.map((opt, i) => (
          <button key={i} data-opt={opt} className={`${classFor(opt, i)} ${opt.startsWith('pic:') ? 'pic' : ''}`} onClick={() => tap(opt, i)} aria-label={optionLabel(opt).text}>
            <OptionFace opt={opt} size={n >= 3 ? 96 : 120} />
          </button>
        ))}
      </div>
    </div>
  );
}

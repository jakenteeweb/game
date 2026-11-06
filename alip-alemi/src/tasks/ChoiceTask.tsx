import { audio, type Step } from '../audio/audio';
import type { LetterItem, NumberItem } from '../content';
import { GroupPicture, Pic } from './objects';
import { SpeakerButton, itemOf, optionLabel, useChoice, useInstruction, type TaskProps } from './common';

/**
 * Выбор символа:
 *  recognize — «Найди букву А» (+ картинка слова как опора, без показа самой буквы);
 *  listen    — звук без картинки и без текста;
 *  findDigit — «Найди цифру 3»;
 *  matchDigit — показана группа предметов, найди её цифру (количество → знак).
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
  } else if (item.track === 'letters') {
    steps = [item.findClip!];
  } else {
    steps = [(item as NumberItem).findClip!];
  }
  useInstruction(steps, setReplay, [spec.uid]);
  const { tap, classFor } = useChoice(spec, (o) => o === spec.itemId, onDone, () => void audio.play(steps));

  // Если инструкцию нельзя озвучить, для чисел показываем количество — иначе задание не понять без чтения.
  const showGroup = mode === 'matchDigit' || (mode === 'findDigit' && !audio.canPlay(steps[0] as string));
  const n = spec.options.length;

  return (
    <div className="stage">
      <div className="prompt-row">
        <SpeakerButton steps={steps} big />
        {item.track === 'letters' && mode !== 'listen' && (item as LetterItem).words[0] && (
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
      <div className={`choices n${n}`}>
        {spec.options.map((opt, i) => (
          <button key={i} data-opt={opt} className={classFor(opt, i)} onClick={() => tap(opt, i)} aria-label={optionLabel(opt).text}>
            {optionLabel(opt).text}
          </button>
        ))}
      </div>
    </div>
  );
}

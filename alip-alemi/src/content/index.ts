import type { Clip, Item, LetterItem, NumberItem, Track } from './types';
import { LETTERS, LETTER_CLIPS } from './letters';
import { NUMBERS, NUMBER_CLIPS } from './numbers';

export * from './types';
export { LETTERS, NUMBERS };

/** Общие фразы помощника Түлкі. Всё — на казахском; статус: черновик. */
const COMMON: Clip[] = [
  { id: 'c.hello', kind: 'instruction', text: 'Сәлем! Мен Түлкімін. Бүгін бірге ойнайық!', ttsAllowed: true },
  { id: 'c.review_day', kind: 'instruction', text: 'Бүгін білгенімізді қайталайық.', ttsAllowed: true },
  { id: 'c.new_letter', kind: 'instruction', text: 'Енді жаңа әріппен танысайық!', ttsAllowed: true },
  { id: 'c.new_number', kind: 'instruction', text: 'Енді жаңа санмен танысайық!', ttsAllowed: true },
  { id: 'c.remember', kind: 'instruction', text: 'Есіңде ме?', ttsAllowed: true },
  { id: 'c.sound_is', kind: 'instruction', text: 'Дыбысы:', ttsAllowed: true },
  { id: 'c.listen', kind: 'instruction', text: 'Тыңда. Қай әріп?', ttsAllowed: true },
  { id: 'c.trace', kind: 'instruction', text: 'Жұлдызшадан баста да, саусағыңмен сызып шық.', ttsAllowed: true },
  { id: 'c.count', kind: 'instruction', text: 'Санайық. Әрқайсысын бір рет бас.', ttsAllowed: true },
  { id: 'c.count_intro', kind: 'instruction', text: 'Санайық:', ttsAllowed: true },
  { id: 'c.match', kind: 'instruction', text: 'Мұнда неше зат бар? Цифрын тап.', ttsAllowed: true },
  { id: 'c.hint', kind: 'feedback', text: 'Міне, осы.', ttsAllowed: true },
  { id: 'c.you_wrote', kind: 'feedback', text: 'Сен мынаны жаздың:', ttsAllowed: true },
  { id: 'c.slow', kind: 'feedback', text: 'Асықпайық. Тыңдап алайық.', ttsAllowed: true },
  { id: 'c.retry1', kind: 'feedback', text: 'Қайта байқап көрейік.', ttsAllowed: true },
  { id: 'c.retry2', kind: 'feedback', text: 'Тағы бір рет байқап көрейік.', ttsAllowed: true },
  { id: 'c.praise1', kind: 'feedback', text: 'Жарайсың!', ttsAllowed: true },
  { id: 'c.praise2', kind: 'feedback', text: 'Тамаша!', ttsAllowed: true },
  { id: 'c.praise3', kind: 'feedback', text: 'Керемет!', ttsAllowed: true },
  { id: 'c.praise4', kind: 'feedback', text: 'Бәрекелді!', ttsAllowed: true },
  { id: 'c.praise5', kind: 'feedback', text: 'Өте жақсы!', ttsAllowed: true },
  { id: 'c.effort', kind: 'feedback', text: 'Сен тырыстың. Жарайсың!', ttsAllowed: true },
  { id: 'c.more', kind: 'feedback', text: 'Тағы біреуін тап.', ttsAllowed: true },
  { id: 'c.too_many', kind: 'feedback', text: 'Көп болып кетті. Біреуін алып таста.', ttsAllowed: true },
  { id: 'c.too_few', kind: 'feedback', text: 'Әлі аз. Тағы сал.', ttsAllowed: true },
  { id: 'c.garden', kind: 'feedback', text: 'Бағыңа жаңа сыйлық келді!', ttsAllowed: true },
  { id: 'c.bye', kind: 'instruction', text: 'Бүгін жақсы ойнадық! Енді демалайық.', ttsAllowed: true },
  { id: 'c.letters', kind: 'instruction', text: 'Әріптер', ttsAllowed: true },
  { id: 'c.numbers', kind: 'instruction', text: 'Сандар', ttsAllowed: true },
  { id: 'c.my_garden', kind: 'instruction', text: 'Менің бағым', ttsAllowed: true },
];

export const CLIPS: Record<string, Clip> = Object.fromEntries(
  [...COMMON, ...LETTER_CLIPS, ...NUMBER_CLIPS].map((c) => [c.id, c]),
);

export const ALL_ITEMS: Item[] = [...LETTERS, ...NUMBERS];
export const ITEMS: Record<string, Item> = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));

export function itemsOf(track: Track): Item[] {
  return track === 'letters' ? LETTERS : NUMBERS;
}

/** Символ, который видит ребёнок. */
export function glyph(item: Item): string {
  return item.track === 'letters' ? item.upper : item.digit;
}

export function isLetter(i: Item): i is LetterItem {
  return i.track === 'letters';
}
export function isNumber(i: Item): i is NumberItem {
  return i.track === 'numbers';
}

export const PRAISE = ['c.praise1', 'c.praise2', 'c.praise3', 'c.praise4', 'c.praise5'];
export const RETRY = ['c.retry1', 'c.retry2'];

/** Заполнители-фигуры для заданий, когда знакомых символов ещё мало. Они не являются буквами. */
export const SHAPES = ['●', '▲', '■', '◆'];

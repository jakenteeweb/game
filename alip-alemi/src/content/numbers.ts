import type { Clip, NumberItem } from './types';
import { STROKES } from './strokes';

/** Казахские числительные 0–20. */
export const NUMBER_WORDS = [
  'нөл', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он',
  'он бір', 'он екі', 'он үш', 'он төрт', 'он бес', 'он алты', 'он жеті', 'он сегіз', 'он тоғыз', 'жиырма',
];

/** Предметы для счёта: одно слово — одна однозначная картинка. */
export const COUNT_OBJECTS = [
  { word: 'алма', picture: '🍎' },
  { word: 'жұлдыз', picture: '⭐' },
  { word: 'балық', picture: '🐟' },
  { word: 'гүл', picture: '🌼' },
  { word: 'қоңыз', picture: '🐞' },
  { word: 'шар', picture: '🎈' },
];

/** Предметы, которые кладём в корзину. */
export const BASKET_OBJECTS = [
  { word: 'алма', picture: '🍎' },
  { word: 'алмұрт', picture: '🍐' },
  { word: 'сәбіз', picture: '🥕' },
];

const READY = new Set([1, 2, 3, 4, 5]);
const clipList: Clip[] = [];
const add = (c: Clip) => (clipList.push(c), c.id);

/** Порядок по методике: сначала 1–5, затем 0 и 6–10, затем 11–20. */
const ORDER = [1, 2, 3, 4, 5, 0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const NUMBERS: NumberItem[] = ORDER.map((value) => {
  const item: NumberItem = {
    id: `N_${value}`,
    track: 'numbers',
    value,
    digit: String(value),
    status: READY.has(value) ? 'draft' : 'stub',
    group: value >= 1 && value <= 5 ? 1 : value <= 10 ? 2 : 3,
    strokes: STROKES[String(value)] ?? [],
  };
  if (!READY.has(value)) return item;
  const w = NUMBER_WORDS[value];
  const cap = w[0].toUpperCase() + w.slice(1);
  const p = `n.${value}`;
  item.nameClip = add({ id: `${p}.name`, kind: 'name', text: w, ttsAllowed: true });
  item.introClip = add({ id: `${p}.intro`, kind: 'instruction', text: `Бұл – ${w}.`, ttsAllowed: true });
  item.findClip = add({ id: `${p}.find`, kind: 'instruction', text: `${cap} цифрын тап.`, ttsAllowed: true });
  add({ id: `${p}.total`, kind: 'instruction', text: `Барлығы – ${w}.`, ttsAllowed: true });
  item.chooseClip = add({ id: `${p}.choose`, kind: 'instruction', text: `Қай суретте ${w} зат бар?`, ttsAllowed: true });
  for (const o of BASKET_OBJECTS) {
    add({ id: `${p}.basket.${o.word}`, kind: 'instruction', text: `Себетке ${w} ${o.word} сал.`, ttsAllowed: true });
  }
  item.basketClip = `${p}.basket`;
  item.confusable = value === 5 ? ['2'] : value === 1 ? ['4'] : undefined;
  return item;
});

export const NUMBER_CLIPS = clipList;

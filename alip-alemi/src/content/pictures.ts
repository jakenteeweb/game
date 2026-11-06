// Картинки-варианты для заданий с выбором: однозначные предметы со знакомыми казахскими словами.
// first — первая буква слова: по ней проверяем, что в «Қай сөз … әрпінен басталады?» правильный ответ один.

export interface Picture {
  id: string;
  word: string;
  first: string;
  image: string;
  picture: string;
}

import { LETTERS } from './letters';

/** Картинки = слова-примеры всех букв (в начале слова) + груша для корзины. */
export const PICTURES: Picture[] = [
  ...LETTERS.filter((l) => l.words[0]).map((l) => {
    const w = l.words[0];
    return { id: w.image!.replace(/^img\/|\.webp$/g, ''), word: w.word, first: w.word[0].toUpperCase(), image: w.image!, picture: w.picture };
  }),
  { id: 'pear', word: 'алмұрт', first: 'А', image: 'img/pear.webp', picture: '🍐' },
];

export const PICTURE_BY_ID: Record<string, Picture> = Object.fromEntries(PICTURES.map((p) => [p.id, p]));

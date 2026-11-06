import type { Clip, NumberItem } from './types';
import { STROKES } from './strokes';

/** Казахские числительные 0–20. */
export const NUMBER_WORDS = [
  'нөл', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он',
  'он бір', 'он екі', 'он үш', 'он төрт', 'он бес', 'он алты', 'он жеті', 'он сегіз', 'он тоғыз', 'жиырма',
];

/** Предметы для счёта: одно слово — одна однозначная картинка. */
export const COUNT_OBJECTS = [
  { word: 'алма', picture: '🍎', image: 'img/apple.webp' },
  { word: 'жұлдыз', picture: '⭐', image: 'img/star.webp' },
  { word: 'балық', picture: '🐟', image: 'img/fish.webp' },
  { word: 'гүл', picture: '🌼', image: 'img/flower.webp' },
  { word: 'қоңыз', picture: '🐞', image: 'img/ladybug.webp' },
  { word: 'шар', picture: '🎈', image: 'img/balloon.webp' },
];

/** Предметы, которые кладём в корзину. */
export const BASKET_OBJECTS = [
  { word: 'алма', picture: '🍎', image: 'img/apple.webp' },
  { word: 'алмұрт', picture: '🍐', image: 'img/pear.webp' },
  { word: 'сәбіз', picture: '🥕', image: 'img/carrot.webp' },
];

const clipList: Clip[] = [];
const add = (c: Clip) => (clipList.some((x) => x.id === c.id) || clipList.push(c), c.id);

/** Слово предмета (отдельная запись) — используется во фразах «Себетке үш алма сал». */
const WORD_CLIP: Record<string, string> = { 'алма': 'w.apple', 'алмұрт': 'w.pear', 'сәбіз': 'w.carrot' };
add({ id: 'w.pear', kind: 'word', text: 'Алмұрт', ttsAllowed: true });

/** Порядок по методике: сначала 1–5, затем 0 и 6–10, затем 11–20. */
const ORDER = [1, 2, 3, 4, 5, 0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const NUMBERS: NumberItem[] = ORDER.map((value) => {
  const w = NUMBER_WORDS[value];
  const single = value <= 9;
  const p = `n.${value}`;
  const item: NumberItem = {
    id: `N_${value}`,
    track: 'numbers',
    value,
    digit: String(value),
    status: 'draft',
    group: value >= 1 && value <= 5 ? 1 : value <= 10 ? 2 : 3,
    // Обводить и писать по памяти — только однозначные цифры.
    strokes: single ? STROKES[String(value)] ?? [] : [],
  };
  const name = add({ id: `${p}.name`, kind: 'name', text: w, ttsAllowed: true });
  item.nameClip = name;
  const cap = w[0].toUpperCase() + w.slice(1);
  item.introClip = add({ id: `${p}.intro`, kind: 'instruction', text: `Бұл – ${w}.`, ttsAllowed: true, parts: ['p.this_is', name] });
  item.findClip = add({ id: `${p}.find`, kind: 'instruction', text: `${cap} ${single ? 'цифрын' : 'санын'} тап.`, ttsAllowed: true, parts: [name, single ? 'p.digit_find' : 'p.number_find'] });
  add({ id: `${p}.total`, kind: 'instruction', text: `Барлығы – ${w}.`, ttsAllowed: true, parts: ['p.total', name] });
  add({ id: `${p}.feed`, kind: 'instruction', text: `Маған ${w} алма бер.`, ttsAllowed: true, parts: ['p.me', name, 'w.apple', 'p.give'] });
  item.writeClip = add({ id: `${p}.write`, kind: 'instruction', text: `${cap} ${single ? 'цифрын' : 'санын'} жаз.`, ttsAllowed: true, parts: [name, single ? 'p.digit_write' : 'p.number_write'] });
  item.chooseClip = add({ id: `${p}.choose`, kind: 'instruction', text: `Қай суретте ${w} зат бар?`, ttsAllowed: true, parts: ['p.which_pic', name, 'p.items'] });
  for (const o of BASKET_OBJECTS) {
    add({ id: `${p}.basket.${o.word}`, kind: 'instruction', text: `Себетке ${w} ${o.word} сал.`, ttsAllowed: true, parts: ['p.basket', name, WORD_CLIP[o.word], 'p.put'] });
  }
  item.basketClip = `${p}.basket`;
  item.confusable = ({ 1: ['7', '4'], 2: ['5', '7'], 3: ['8', '5'], 5: ['2', '6'], 6: ['9', '0'], 9: ['6', '0'], 0: ['6', '9'], 8: ['3', '0'], 7: ['1', '2'], 4: ['1', '9'] } as Record<number, string[]>)[value]
    ?? (value > 9 ? [String(value % 10 === 0 ? value - 1 : value + 1 > 20 ? value - 1 : value + 1)] : undefined);
  return item;
});

export const NUMBER_CLIPS = clipList;

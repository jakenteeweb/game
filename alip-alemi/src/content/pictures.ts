// Картинки-варианты для заданий с выбором: однозначные предметы со знакомыми казахскими словами.
// first — первая буква слова: по ней проверяем, что в «Қай сөз … әрпінен басталады?» правильный ответ один.

export interface Picture {
  id: string;
  word: string;
  first: string;
  image: string;
  picture: string;
}

export const PICTURES: Picture[] = [
  { id: 'apple', word: 'алма', first: 'А', image: 'img/apple.webp', picture: '🍎' },
  { id: 'pear', word: 'алмұрт', first: 'А', image: 'img/pear.webp', picture: '🍐' },
  { id: 'carrot', word: 'сәбіз', first: 'С', image: 'img/carrot.webp', picture: '🥕' },
  { id: 'star', word: 'жұлдыз', first: 'Ж', image: 'img/star.webp', picture: '⭐' },
  { id: 'fish', word: 'балық', first: 'Б', image: 'img/fish.webp', picture: '🐟' },
  { id: 'flower', word: 'гүл', first: 'Г', image: 'img/flower.webp', picture: '🌼' },
  { id: 'ladybug', word: 'қоңыз', first: 'Қ', image: 'img/ladybug.webp', picture: '🐞' },
  { id: 'balloon', word: 'шар', first: 'Ш', image: 'img/balloon.webp', picture: '🎈' },
  { id: 'bread', word: 'нан', first: 'Н', image: 'img/bread.webp', picture: '🍞' },
  { id: 'fox', word: 'түлкі', first: 'Т', image: 'img/fox.webp', picture: '🦊' },
  { id: 'rooster', word: 'әтеш', first: 'Ә', image: 'img/rooster.webp', picture: '🐓' },
  { id: 'rabbit', word: 'қоян', first: 'Қ', image: 'img/rabbit.webp', picture: '🐇' },
  { id: 'house', word: 'үй', first: 'Ү', image: 'img/house.webp', picture: '🏠' },
];

export const PICTURE_BY_ID: Record<string, Picture> = Object.fromEntries(PICTURES.map((p) => [p.id, p]));

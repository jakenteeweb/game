import type { Clip, LetterItem } from './types';
import { STROKES } from './strokes';

/**
 * Казахский кириллический алфавит (42 буквы).
 * slug — латинский идентификатор для файлов озвучки.
 * name — название буквы (требует проверки педагогом).
 */
// Названия согласных — как в казахской школе (әліппе): слог с «ы» (лы, мы, ны), К и Г — мягкие (кі, гі).
export const KAZAKH_ALPHABET: { upper: string; lower: string; slug: string; name: string; vowel?: boolean; noOwnSound?: boolean }[] = [
  { upper: 'А', lower: 'а', slug: 'a', name: 'а', vowel: true },
  { upper: 'Ә', lower: 'ә', slug: 'ae', name: 'ә', vowel: true },
  { upper: 'Б', lower: 'б', slug: 'b', name: 'бы' },
  { upper: 'В', lower: 'в', slug: 'v', name: 'вы' },
  { upper: 'Г', lower: 'г', slug: 'g', name: 'гі' },
  { upper: 'Ғ', lower: 'ғ', slug: 'gh', name: 'ғы' },
  { upper: 'Д', lower: 'д', slug: 'd', name: 'ды' },
  { upper: 'Е', lower: 'е', slug: 'e', name: 'е', vowel: true },
  { upper: 'Ё', lower: 'ё', slug: 'yo', name: 'йо', vowel: true },
  { upper: 'Ж', lower: 'ж', slug: 'zh', name: 'жы' },
  { upper: 'З', lower: 'з', slug: 'z', name: 'зы' },
  { upper: 'И', lower: 'и', slug: 'i', name: 'и', vowel: true },
  { upper: 'Й', lower: 'й', slug: 'y', name: 'қысқа и' },
  { upper: 'К', lower: 'к', slug: 'k', name: 'кі' },
  { upper: 'Қ', lower: 'қ', slug: 'q', name: 'қы' },
  { upper: 'Л', lower: 'л', slug: 'l', name: 'лы' },
  { upper: 'М', lower: 'м', slug: 'm', name: 'мы' },
  { upper: 'Н', lower: 'н', slug: 'n', name: 'ны' },
  { upper: 'Ң', lower: 'ң', slug: 'ng', name: 'ың' },
  { upper: 'О', lower: 'о', slug: 'o', name: 'о', vowel: true },
  { upper: 'Ө', lower: 'ө', slug: 'oe', name: 'ө', vowel: true },
  { upper: 'П', lower: 'п', slug: 'p', name: 'пы' },
  { upper: 'Р', lower: 'р', slug: 'r', name: 'ры' },
  { upper: 'С', lower: 'с', slug: 's', name: 'сы' },
  { upper: 'Т', lower: 'т', slug: 't', name: 'ты' },
  { upper: 'У', lower: 'у', slug: 'u', name: 'у', vowel: true },
  { upper: 'Ұ', lower: 'ұ', slug: 'uu', name: 'ұ', vowel: true },
  { upper: 'Ү', lower: 'ү', slug: 'ue', name: 'ү', vowel: true },
  { upper: 'Ф', lower: 'ф', slug: 'f', name: 'фы' },
  { upper: 'Х', lower: 'х', slug: 'kh', name: 'хы' },
  { upper: 'Һ', lower: 'һ', slug: 'h', name: 'һы' },
  { upper: 'Ц', lower: 'ц', slug: 'ts', name: 'цы' },
  { upper: 'Ч', lower: 'ч', slug: 'ch', name: 'чы' },
  { upper: 'Ш', lower: 'ш', slug: 'sh', name: 'шы' },
  { upper: 'Щ', lower: 'щ', slug: 'shch', name: 'щы' },
  { upper: 'Ъ', lower: 'ъ', slug: 'hard', name: 'айыру белгісі', noOwnSound: true },
  { upper: 'Ы', lower: 'ы', slug: 'yy', name: 'ы', vowel: true },
  { upper: 'І', lower: 'і', slug: 'ii', name: 'і', vowel: true },
  { upper: 'Ь', lower: 'ь', slug: 'soft', name: 'жіңішкелік белгісі', noOwnSound: true },
  { upper: 'Э', lower: 'э', slug: 'eh', name: 'э', vowel: true },
  { upper: 'Ю', lower: 'ю', slug: 'yu', name: 'ю', vowel: true },
  { upper: 'Я', lower: 'я', slug: 'ya', name: 'я', vowel: true },
];

/**
 * Слово-пример для каждой буквы: простое, знакомое ребёнку 6–7 лет, с однозначной картинкой.
 * initial=false — буква стоит не в начале слова (в казахском почти нет слов на Й, Ң, Һ).
 * Все тексты — «черновик» до проверки казахоязычным педагогом.
 */
const PREPARED: Record<string, { word: string; pic: string; emoji: string; initial?: false; confusable: string[]; methodNote?: string }> = {
  'А': { word: 'алма', pic: 'apple', emoji: '🍎', confusable: ['Ә', 'Д', 'Л'] },
  'Ә': { word: 'әтеш', pic: 'rooster', emoji: '🐓', confusable: ['А', 'Э', 'Е'], methodNote: 'Қазақ тіліне тән әріп. Орыс тіліндегі «Э» әрпімен салыстырмау керек.' },
  'Б': { word: 'балық', pic: 'fish', emoji: '🐟', confusable: ['В', 'Р'] },
  'В': { word: 'велосипед', pic: 'bicycle', emoji: '🚲', confusable: ['Б', 'Р', 'Э'] },
  'Г': { word: 'гүл', pic: 'flower', emoji: '🌼', confusable: ['Ғ', 'Т', 'П'] },
  'Ғ': { word: 'ғарышкер', pic: 'cosmonaut', emoji: '🧑‍🚀', confusable: ['Г', 'Е'], methodNote: 'Г әрпінен көлденең сызықшасы арқылы ажыратылады.' },
  'Д': { word: 'доп', pic: 'ball', emoji: '⚽', confusable: ['Л', 'А'] },
  'Е': { word: 'есік', pic: 'door', emoji: '🚪', confusable: ['Ё', 'Э', 'Ә'] },
  'Ё': { word: 'ёлка', pic: 'fir', emoji: '🎄', confusable: ['Е'] },
  'Ж': { word: 'жұлдыз', pic: 'star', emoji: '⭐', confusable: ['К', 'Х'] },
  'З': { word: 'зебра', pic: 'zebra', emoji: '🦓', confusable: ['Э', 'Е'] },
  'И': { word: 'ине', pic: 'needle', emoji: '🪡', confusable: ['Й', 'Н', 'Ң'] },
  'Й': { word: 'ай', pic: 'moon', emoji: '🌙', initial: false, confusable: ['И'] },
  'К': { word: 'кітап', pic: 'book', emoji: '📘', confusable: ['Қ', 'Ж'] },
  'Қ': { word: 'қоян', pic: 'rabbit', emoji: '🐇', confusable: ['К'], methodNote: 'Төменгі оң жақтағы «құйрыққа» назар аударыңыз — ол Қ-ны К-дан ажыратады.' },
  'Л': { word: 'лақ', pic: 'kidgoat', emoji: '🐐', confusable: ['Д', 'П'] },
  'М': { word: 'мысық', pic: 'cat', emoji: '🐱', confusable: ['Н', 'Ш'] },
  'Н': { word: 'нан', pic: 'bread', emoji: '🍞', confusable: ['Ң', 'И', 'П'] },
  'Ң': { word: 'қоңыз', pic: 'ladybug', emoji: '🐞', initial: false, confusable: ['Н'], methodNote: 'Ң сөз басында келмейді, мұрыннан айтылады.' },
  'О': { word: 'орындық', pic: 'chair', emoji: '🪑', confusable: ['Ө', 'С'] },
  'Ө': { word: 'өрік', pic: 'apricot', emoji: '🍑', confusable: ['О'] },
  'П': { word: 'пияз', pic: 'onion', emoji: '🧅', confusable: ['Н', 'Л'] },
  'Р': { word: 'раушан', pic: 'rose', emoji: '🌹', confusable: ['В', 'Б', 'Ь'] },
  'С': { word: 'сәбіз', pic: 'carrot', emoji: '🥕', confusable: ['О', 'Е'] },
  'Т': { word: 'түлкі', pic: 'fox', emoji: '🦊', confusable: ['Г', 'П'] },
  'У': { word: 'қуыршақ', pic: 'doll', emoji: '🪆', initial: false, confusable: ['Ү', 'Ұ'] },
  'Ұ': { word: 'ұшақ', pic: 'airplane', emoji: '✈️', confusable: ['Ү', 'У', 'Т'], methodNote: 'Ұ — көлденең сызықшасы бар, Ү — тік аяқты.' },
  'Ү': { word: 'үй', pic: 'house', emoji: '🏠', confusable: ['Ұ', 'У'], methodNote: 'Ү — тік аяқты, Ұ — көлденең сызықшасы бар.' },
  'Ф': { word: 'фонтан', pic: 'fountain', emoji: '⛲', confusable: ['Ш', 'Ц'] },
  'Х': { word: 'хат', pic: 'envelope', emoji: '✉️', confusable: ['Ж', 'К'] },
  'Һ': { word: 'айдаһар', pic: 'dragon', emoji: '🐉', initial: false, confusable: ['Н', 'Ь'] },
  'Ц': { word: 'цирк', pic: 'circus', emoji: '🎪', confusable: ['Щ', 'Ш'] },
  'Ч': { word: 'чемодан', pic: 'suitcase', emoji: '🧳', confusable: ['У', 'Ш'] },
  'Ш': { word: 'шар', pic: 'balloon', emoji: '🎈', confusable: ['Щ', 'М'] },
  'Щ': { word: 'щетка', pic: 'brush', emoji: '🪥', confusable: ['Ш', 'Ц'] },
  'Ы': { word: 'ыдыс', pic: 'dishes', emoji: '🍽️', confusable: ['І', 'Ь'] },
  'І': { word: 'ит', pic: 'dog', emoji: '🐶', confusable: ['Ы', 'Т'], methodNote: 'Сөз басындағы и дыбысы І әрпімен жазылады: ит.' },
  'Э': { word: 'экскаватор', pic: 'excavator', emoji: '🚜', confusable: ['Е', 'З'] },
  'Ю': { word: 'юла', pic: 'top', emoji: '🪀', confusable: ['О', 'Ы'] },
  'Я': { word: 'яхта', pic: 'yacht', emoji: '⛵', confusable: ['Р', 'А'] },
};

const clipList: Clip[] = [];
function addClip(c: Clip): string {
  if (!clipList.some((x) => x.id === c.id)) clipList.push(c);
  return c.id;
}
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

export const LETTERS: LetterItem[] = KAZAKH_ALPHABET.map((l) => {
  const prep = PREPARED[l.upper];
  const id = `L_${l.slug}`;
  const item: LetterItem = {
    id,
    track: 'letters',
    upper: l.upper,
    lower: l.lower,
    status: prep ? 'draft' : 'stub',
    isVowel: l.vowel,
    noOwnSound: l.noOwnSound,
    words: [],
    strokes: STROKES[l.upper] ?? [],
  };
  if (!prep) return item;

  const p = `l.${l.slug}`;
  // Название буквы — отдельная запись (живой голос ребёнка или клон). Фразы собираются из частей.
  const name = addClip({ id: `${p}.name`, kind: 'name', text: l.name, ttsAllowed: true, note: `${l.upper} әрпінің аты` });
  item.nameClip = name;
  const w = addClip({ id: `w.${prep.pic}`, kind: 'word', text: cap(prep.word), ttsAllowed: true });
  item.words = [{
    word: prep.word, picture: prep.emoji, image: `img/${prep.pic}.webp`, initial: prep.initial !== false,
    clipId: addClip({ id: `${p}.word`, kind: 'word', text: `${cap(prep.word)}. ${cap(prep.word)} сөзінде ${l.upper} әрпі бар.`, ttsAllowed: true, parts: [w, w, 'p.in_word', name, 'p.letter_has'] }),
  }];
  item.introClip = addClip({ id: `${p}.intro`, kind: 'instruction', text: `Бұл – ${l.upper} әрпі.`, ttsAllowed: true, parts: ['p.this_is', name, 'p.letter_dot'] });
  item.findClip = addClip({ id: `${p}.find`, kind: 'instruction', text: `${l.upper} әрпін тап.`, ttsAllowed: true, parts: [name, 'p.find'] });
  item.matchClip = addClip({ id: `${p}.match`, kind: 'instruction', text: `Қай сөз ${l.upper} әрпінен басталады?`, ttsAllowed: true, parts: ['p.which_word', name, 'p.starts'] });
  item.writeClip = addClip({ id: `${p}.write`, kind: 'instruction', text: `${l.upper} әрпін жаз.`, ttsAllowed: true, parts: [name, 'p.write'] });
  item.balloonsClip = addClip({ id: `${p}.balloons`, kind: 'instruction', text: `${l.upper} әрпі жазылған шарларды бас.`, ttsAllowed: true, parts: [name, 'p.balloons'] });
  item.confusable = prep.confusable;
  item.methodNote = prep.methodNote;
  return item;
});

export const LETTER_CLIPS = clipList;

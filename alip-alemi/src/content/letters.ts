import type { Clip, LetterItem, ReviewStatus, WordExample } from './types';
import { STROKES } from './strokes';

/**
 * Казахский кириллический алфавит (42 буквы).
 * slug — латинский идентификатор для файлов озвучки.
 * name — название буквы (требует проверки педагогом).
 */
export const KAZAKH_ALPHABET: { upper: string; lower: string; slug: string; name: string; vowel?: boolean; noOwnSound?: boolean }[] = [
  { upper: 'А', lower: 'а', slug: 'a', name: 'а', vowel: true },
  { upper: 'Ә', lower: 'ә', slug: 'ae', name: 'ә', vowel: true },
  { upper: 'Б', lower: 'б', slug: 'b', name: 'бэ' },
  { upper: 'В', lower: 'в', slug: 'v', name: 'вэ' },
  { upper: 'Г', lower: 'г', slug: 'g', name: 'гэ' },
  { upper: 'Ғ', lower: 'ғ', slug: 'gh', name: 'ға' },
  { upper: 'Д', lower: 'д', slug: 'd', name: 'дэ' },
  { upper: 'Е', lower: 'е', slug: 'e', name: 'е', vowel: true },
  { upper: 'Ё', lower: 'ё', slug: 'yo', name: 'йо', vowel: true },
  { upper: 'Ж', lower: 'ж', slug: 'zh', name: 'жэ' },
  { upper: 'З', lower: 'з', slug: 'z', name: 'зэ' },
  { upper: 'И', lower: 'и', slug: 'i', name: 'и', vowel: true },
  { upper: 'Й', lower: 'й', slug: 'y', name: 'қысқа и' },
  { upper: 'К', lower: 'к', slug: 'k', name: 'ка' },
  { upper: 'Қ', lower: 'қ', slug: 'q', name: 'қа' },
  { upper: 'Л', lower: 'л', slug: 'l', name: 'эл' },
  { upper: 'М', lower: 'м', slug: 'm', name: 'эм' },
  { upper: 'Н', lower: 'н', slug: 'n', name: 'эн' },
  { upper: 'Ң', lower: 'ң', slug: 'ng', name: 'ың' },
  { upper: 'О', lower: 'о', slug: 'o', name: 'о', vowel: true },
  { upper: 'Ө', lower: 'ө', slug: 'oe', name: 'ө', vowel: true },
  { upper: 'П', lower: 'п', slug: 'p', name: 'пэ' },
  { upper: 'Р', lower: 'р', slug: 'r', name: 'эр' },
  { upper: 'С', lower: 'с', slug: 's', name: 'эс' },
  { upper: 'Т', lower: 'т', slug: 't', name: 'тэ' },
  { upper: 'У', lower: 'у', slug: 'u', name: 'у', vowel: true },
  { upper: 'Ұ', lower: 'ұ', slug: 'uu', name: 'ұ', vowel: true },
  { upper: 'Ү', lower: 'ү', slug: 'ue', name: 'ү', vowel: true },
  { upper: 'Ф', lower: 'ф', slug: 'f', name: 'эф' },
  { upper: 'Х', lower: 'х', slug: 'kh', name: 'ха' },
  { upper: 'Һ', lower: 'һ', slug: 'h', name: 'һа' },
  { upper: 'Ц', lower: 'ц', slug: 'ts', name: 'цэ' },
  { upper: 'Ч', lower: 'ч', slug: 'ch', name: 'чэ' },
  { upper: 'Ш', lower: 'ш', slug: 'sh', name: 'ша' },
  { upper: 'Щ', lower: 'щ', slug: 'shch', name: 'ща' },
  { upper: 'Ъ', lower: 'ъ', slug: 'hard', name: 'айыру белгісі', noOwnSound: true },
  { upper: 'Ы', lower: 'ы', slug: 'yy', name: 'ы', vowel: true },
  { upper: 'І', lower: 'і', slug: 'ii', name: 'і', vowel: true },
  { upper: 'Ь', lower: 'ь', slug: 'soft', name: 'жіңішкелік белгісі', noOwnSound: true },
  { upper: 'Э', lower: 'э', slug: 'eh', name: 'э', vowel: true },
  { upper: 'Ю', lower: 'ю', slug: 'yu', name: 'ю', vowel: true },
  { upper: 'Я', lower: 'я', slug: 'ya', name: 'я', vowel: true },
];

/**
 * Подготовленные уроки первой версии. Слова — простые и знакомые детям,
 * картинки однозначные. Все тексты имеют статус «черновик» до проверки педагогом.
 */
const PREPARED: Record<string, { word: string; picture: string; sentence: string; sound?: string; confusable?: string[]; methodNote?: string }> = {
  'А': { word: 'алма', picture: '🍎', sentence: 'Алма. Алма сөзінде А әрпі бар.' },
  'Н': { word: 'нан', picture: '🍞', sentence: 'Нан. Нан сөзінде Н әрпі бар.', sound: '[н]', confusable: ['Ң', 'И'] },
  'Т': { word: 'түлкі', picture: '🦊', sentence: 'Түлкі. Түлкі сөзінде Т әрпі бар.', sound: '[т]' },
  'Ә': {
    word: 'әтеш', picture: '🐓', sentence: 'Әтеш. Әтеш сөзінде Ә әрпі бар.', confusable: ['А', 'Э'],
    methodNote: 'Специфическая казахская буква. Не сравнивать с русской «Э».',
  },
  'Қ': {
    word: 'қоян', picture: '🐇', sentence: 'Қоян. Қоян сөзінде Қ әрпі бар.', sound: '[қ]', confusable: ['К'],
    methodNote: 'Обратить внимание на «хвостик» внизу справа — он отличает Қ от К.',
  },
  'Ү': {
    word: 'үй', picture: '🏠', sentence: 'Үй. Үй сөзінде Ү әрпі бар.', confusable: ['Ұ', 'У'],
    methodNote: 'Ү — с прямой ножкой, Ұ — с перекладиной. Не путать с русской «У».',
  },
};

const clipList: Clip[] = [];

function addClip(c: Clip): string {
  clipList.push(c);
  return c.id;
}

export const LETTERS: LetterItem[] = KAZAKH_ALPHABET.map((l) => {
  const prep = PREPARED[l.upper];
  const id = `L_${l.slug}`;
  const status: ReviewStatus = prep ? 'draft' : 'stub';
  const item: LetterItem = {
    id,
    track: 'letters',
    upper: l.upper,
    lower: l.lower,
    status,
    isVowel: l.vowel,
    noOwnSound: l.noOwnSound,
    words: [],
    strokes: STROKES[l.upper] ?? [],
  };
  if (!prep) return item;

  const p = `l.${l.slug}`;
  item.nameClip = addClip({ id: `${p}.name`, kind: 'name', text: l.name, ttsAllowed: true, note: `Название буквы ${l.upper}` });
  if (!l.vowel && prep.sound) {
    item.soundClip = addClip({
      id: `${p}.sound`, kind: 'sound', text: prep.sound, ttsAllowed: false,
      note: `Изолированный звук ${prep.sound}. Только запись носителя языка.`,
    });
  }
  const word: WordExample = {
    word: prep.word,
    picture: prep.picture,
    clipId: addClip({ id: `${p}.word`, kind: 'word', text: prep.sentence, ttsAllowed: true }),
  };
  item.words = [word];
  item.introClip = addClip({ id: `${p}.intro`, kind: 'instruction', text: `Бұл – ${l.upper} әрпі.`, ttsAllowed: true });
  item.findClip = addClip({ id: `${p}.find`, kind: 'instruction', text: `${l.upper} әрпін тап.`, ttsAllowed: true });
  item.balloonsClip = addClip({ id: `${p}.balloons`, kind: 'instruction', text: `${l.upper} әрпі жазылған шарларды бас.`, ttsAllowed: true });
  item.confusable = prep.confusable;
  item.methodNote = prep.methodNote;
  return item;
});

export const LETTER_CLIPS = clipList;

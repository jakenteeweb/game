// Типы учебного контента. Контент хранится как данные и не зависит от интерфейса.

/** Статус проверки казахоязычным педагогом. `stub` — урок не подготовлен и детям не показывается. */
export type ReviewStatus = 'stub' | 'draft' | 'reviewed' | 'published';

export type ClipKind = 'name' | 'sound' | 'word' | 'instruction' | 'feedback';

/** Один аудиофрагмент. Название, звук, слово, инструкция и обратная связь хранятся раздельно. */
export interface Clip {
  id: string;
  kind: ClipKind;
  /** Текст на казахском языке (что должен произнести диктор). */
  text: string;
  /**
   * Можно ли временно озвучивать синтезом речи с казахским голосом.
   * Для изолированных согласных звуков — нет: синтез произносит их неверно.
   */
  ttsAllowed: boolean;
  /** Подсказка диктору/педагогу. */
  note?: string;
}

export type Point = [number, number];

/** Штрих для обведения в системе координат 100×100. Порядок точек = направление движения. */
export type Stroke = Point[];

export type Track = 'letters' | 'numbers';

export interface WordExample {
  word: string;
  /** Картинка (эмодзи) — должна однозначно изображать слово. */
  picture: string;
  /** Иллюстрация (сгенерирована в Higgsfield), эмодзи — запасной вариант. */
  image?: string;
  clipId: string;
}

export interface LetterItem {
  id: string;
  track: 'letters';
  upper: string;
  lower: string;
  status: ReviewStatus;
  nameClip?: string;
  /** Отдельный клип звука; у гласных звук совпадает с названием. */
  soundClip?: string;
  isVowel?: boolean;
  /** Ъ и Ь: не имеют собственного звука, знакомство на позднем этапе. */
  noOwnSound?: boolean;
  words: WordExample[];
  strokes: Stroke[];
  /** Фразы: «Бұл – А әрпі», «А әрпін тап», «А әрпі жазылған шарларды бас». */
  introClip?: string;
  findClip?: string;
  balloonsClip?: string;
  /** Буквы, которые дети часто путают с этой. */
  confusable?: string[];
  methodNote?: string;
}

export interface NumberItem {
  id: string;
  track: 'numbers';
  value: number;
  digit: string;
  status: ReviewStatus;
  /** Группа открытия: 1 — числа 1–5, 2 — 0 и 6–10, 3 — 11–20. */
  group: 1 | 2 | 3;
  nameClip?: string;
  strokes: Stroke[];
  introClip?: string;
  findClip?: string;
  basketClip?: string;
  chooseClip?: string;
  confusable?: string[];
}

export type Item = LetterItem | NumberItem;

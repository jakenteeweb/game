import type { Clip } from './types';

/** Открытые слоги «согласная + гласная» для игры «Буын». Только твёрдые и мягкие гласные без Ё/Ю/Я. */
export const SYL_CONSONANTS = ['М', 'Н', 'Т', 'Л', 'С', 'Б', 'Қ', 'Д', 'Р', 'Ш'];
export const SYL_VOWELS = ['А', 'О', 'Ы', 'Е'];

const TR: Record<string, string> = { М: 'm', Н: 'n', Т: 't', Л: 'l', С: 's', Б: 'b', Қ: 'q', Д: 'd', Р: 'r', Ш: 'sh', А: 'a', О: 'o', Ы: 'y', Е: 'e' };

export interface Syllable { id: string; text: string; c: string; v: string; clip: string }

export const SYLLABLES: Syllable[] = SYL_CONSONANTS.flatMap((c) => SYL_VOWELS.map((v) => {
  const id = `syl.${TR[c]}${TR[v]}`;
  return { id, text: c + v, c, v, clip: id };
}));

export const SYLLABLE_CLIPS: Clip[] = SYLLABLES.map((s) => ({ id: s.clip, kind: 'word' as const, text: s.text.toLowerCase(), ttsAllowed: true }));

/** Короткие слова для чтения (есть картинка и запись слова). */
export const READING_WORDS = ['үй', 'ай', 'ит', 'нан', 'доп', 'лақ', 'хат', 'шар', 'гүл', 'алма', 'өрік', 'есік', 'қоян', 'ине', 'юла', 'яхта', 'ұшақ', 'әтеш', 'балық', 'мысық', 'пияз', 'цирк', 'сәбіз', 'түлкі', 'кітап', 'зебра'];

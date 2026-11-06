import type { Track } from './types';

/**
 * Настраиваемые правила обучения. Меняются здесь, без правки интерфейса.
 */
export const CURRICULUM = {
  /** Порядок введения букв (id). Неподготовленные (stub) пропускаются. */
  // Для 6–7 лет: сначала частые буквы, казахские Ә, Қ, Ұ, Ү, І, Ө, Ғ, Ң — вперемешку с остальными.
  letterOrder: ['L_a', 'L_n', 'L_t', 'L_e', 'L_l', 'L_o', 'L_r', 'L_s', 'L_q', 'L_yy', 'L_ae', 'L_m', 'L_d', 'L_b',
    'L_ii', 'L_sh', 'L_uu', 'L_ue', 'L_zh', 'L_k', 'L_oe', 'L_gh', 'L_ng', 'L_p', 'L_y', 'L_g', 'L_z', 'L_i', 'L_u',
    'L_h', 'L_kh', 'L_f', 'L_v', 'L_ts', 'L_ch', 'L_shch', 'L_eh', 'L_yu', 'L_ya', 'L_yo'],
  /** Порядок введения чисел. Следующая группа открывается, когда освоена предыдущая. */
  numberOrder: ['N_1', 'N_2', 'N_3', 'N_4', 'N_5', 'N_0', 'N_6', 'N_7', 'N_8', 'N_9', 'N_10',
    'N_11', 'N_12', 'N_13', 'N_14', 'N_15', 'N_16', 'N_17', 'N_18', 'N_19', 'N_20'],

  /** Этапы изучения одного символа. Индекс этапа = сколько этапов пройдено. */
  stages: {
    letters: ['intro', 'recognize', 'listen', 'trace', 'balloons', 'write', 'check'],
    numbers: ['numIntro', 'count', 'basket', 'chooseGroup', 'trace', 'findDigit', 'write', 'check'],
  } as Record<Track, TaskType[]>,
};

/** Этапы конкретного символа: без контура (числа 10–20) нет обведения и письма пальцем. */
export function stagesFor(track: Track, hasStrokes: boolean): TaskType[] {
  const all = CURRICULUM.stages[track];
  return hasStrokes ? all : all.filter((t) => t !== 'trace' && t !== 'write');
}

export type TaskType =
  | 'intro' | 'recognize' | 'listen' | 'trace' | 'balloons' | 'write' | 'check'
  | 'numIntro' | 'count' | 'basket' | 'chooseGroup' | 'findDigit' | 'matchDigit' | 'wordMatch';

/** Пороги и интервалы — все настраиваемые. */
export const RULES = {
  /** Освоение: столько самостоятельных правильных ответов… */
  masteryIndependent: 3,
  /** …в стольких разных типах заданий… */
  masteryTaskTypes: 2,
  /** …и в стольких разных занятиях. */
  masterySessions: 2,
  /** Сколько новых этапов одного символа можно пройти за одно занятие. */
  maxStagesPerSession: 3,
  /** Не больше одного нового символа за занятие. */
  maxNewPerSession: 1,
  /** Для 6–7 лет — до двух новых символов за занятие, если ребёнку не трудно. */
  maxNewPerSessionOlder: 2,
  /** Не вводить новое, если одновременно изучается столько символов. */
  maxLearningAtOnce: 3,
  /** Повторений в начале занятия. */
  maxReviewsAtStart: 3,
  /** Если доля ошибок в последних ответах выше — только повторение. */
  struggleErrorRate: 0.5,
  struggleWindow: 6,
  /**
   * Интервалы повторения по «коробкам»:
   * 0 — позже в том же занятии, 1 — в следующем занятии, далее — в днях.
   */
  intervals: [{ sameSession: true }, { nextSession: true }, { days: 3 }, { days: 7 }, { days: 14 }] as const,
  /** Касания раньше этого времени после появления задания игнорируются (случайные нажатия). */
  minTapDelayMs: 450,
  /** Столько неверных касаний подряд за короткое время = случайные нажатия, не засчитываем. */
  randomTapBurst: 3,
  randomTapWindowMs: 1500,
  /** Количество заданий в занятии в зависимости от выбранной длительности. */
  sessionTasks: { short: 7, normal: 10, long: 13 },
};

export type SessionLength = keyof typeof RULES.sessionTasks;

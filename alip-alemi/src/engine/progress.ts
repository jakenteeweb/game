// Модель прогресса и правила обновления. Чистые функции, без интерфейса и хранилища.
import { CURRICULUM, RULES, type TaskType } from '../content/curriculum';
import type { Track } from '../content/types';

export const PROGRESS_VERSION = 1;

export type Skill = 'visual' | 'audio' | 'practice' | 'quantity';
export type ResultMark = 'ok' | 'hint' | 'err';

export interface SkillStat {
  /** Самостоятельные правильные ответы (с первой попытки, без подсказки). */
  independent: number;
  /** Правильные ответы после подсказки или после ошибки — учитываются отдельно. */
  helped: number;
  errors: number;
}

export interface ItemProgress {
  v: number;
  key: string;
  profileId: string;
  itemId: string;
  track: Track;
  /** Сколько этапов пройдено (см. CURRICULUM.stages). 0 — ещё не знакомились. */
  stage: number;
  skills: Record<Skill, SkillStat>;
  /** Типы заданий, где был самостоятельный правильный ответ. */
  okTaskTypes: TaskType[];
  /** Номера занятий, где был самостоятельный правильный ответ. */
  okSessions: number[];
  hintsUsed: number;
  recent: ResultMark[];
  introducedAt?: number;
  introducedSession?: number;
  lastSeenAt?: number;
  lastSeenSession?: number;
  lastTaskType?: TaskType;
  /** Сколько этапов пройдено в занятии lastSeenSession. */
  stagesThisSession: number;
  /** Коробка интервального повторения (индекс в RULES.intervals). */
  box: number;
  nextReviewAt?: number;
  nextReviewSession?: number;
  mastered: boolean;
  masteredAt?: number;
}

const emptySkill = (): SkillStat => ({ independent: 0, helped: 0, errors: 0 });

export function newProgress(profileId: string, itemId: string, track: Track): ItemProgress {
  return {
    v: PROGRESS_VERSION,
    key: `${profileId}:${itemId}`,
    profileId,
    itemId,
    track,
    stage: 0,
    skills: { visual: emptySkill(), audio: emptySkill(), practice: emptySkill(), quantity: emptySkill() },
    okTaskTypes: [],
    okSessions: [],
    hintsUsed: 0,
    recent: [],
    stagesThisSession: 0,
    box: 0,
    mastered: false,
  };
}

/** Какой навык проверяет тип задания. */
export function skillOf(type: TaskType): Skill | null {
  switch (type) {
    case 'recognize': case 'findDigit': case 'check': return 'visual';
    case 'listen': return 'audio';
    case 'trace': case 'balloons': return 'practice';
    case 'basket': case 'chooseGroup': case 'matchDigit': return 'quantity';
    default: return null; // знакомство и пересчёт — только показ
  }
}

/** Задания-знакомства: засчитываются как пройденные просто по завершении. */
export function isExposure(type: TaskType): boolean {
  return type === 'intro' || type === 'numIntro' || type === 'count';
}

export interface Outcome {
  /** Задание в итоге выполнено (возможно, с подсказкой). */
  completed: boolean;
  /** Ошибок до правильного ответа. */
  errors: number;
  /** Была показана подсказка (образец, подсветка правильного ответа, демонстрация). */
  hinted: boolean;
}

export const isIndependent = (o: Outcome) => o.completed && o.errors === 0 && !o.hinted;

export interface ApplyContext {
  now: number;
  sessionIndex: number;
  /** Задание было повторением (а не изучением нового этапа). */
  isReview: boolean;
  /** Задание выполнено как этап, следующий по программе (тип совпадает с этапом). */
  taskType: TaskType;
  /** Фактически показанный тип (для «check» и для замены слушания без озвучки). */
  checkAs?: TaskType;
}

const DAY = 24 * 60 * 60 * 1000;

/** Применить результат задания к прогрессу символа. Возвращает новый объект. */
export function applyOutcome(prev: ItemProgress, outcome: Outcome, ctx: ApplyContext): ItemProgress {
  const p: ItemProgress = structuredClone(prev);
  const { now, sessionIndex, taskType } = ctx;
  const realType = ctx.checkAs ?? taskType;
  const independent = isIndependent(outcome);

  if (p.lastSeenSession !== sessionIndex) p.stagesThisSession = 0;
  if (p.stage === 0 && (taskType === 'intro' || taskType === 'numIntro')) {
    p.introducedAt = now;
    p.introducedSession = sessionIndex;
  }

  // Навыки: подсказанный ответ учитывается отдельно от самостоятельного.
  const skill = skillOf(realType);
  if (skill) {
    const s = p.skills[skill];
    s.errors += outcome.errors;
    if (outcome.completed) {
      if (independent) s.independent += 1;
      else s.helped += 1;
    }
  }
  if (outcome.hinted) p.hintsUsed += 1;
  if (!isExposure(realType)) {
    const mark: ResultMark = independent ? 'ok' : outcome.completed && outcome.errors === 0 ? 'hint' : outcome.errors > 0 ? 'err' : 'hint';
    p.recent = [...p.recent, mark].slice(-8);
  }
  if (independent && !isExposure(realType)) {
    if (!p.okTaskTypes.includes(realType)) p.okTaskTypes.push(realType);
    if (!p.okSessions.includes(sessionIndex)) p.okSessions = [...p.okSessions, sessionIndex].slice(-10);
  }

  // Этапы: продвигаемся только по текущему этапу программы.
  const stages = CURRICULUM.stages[p.track];
  const current = stages[p.stage];
  if (current === taskType && p.stagesThisSession < RULES.maxStagesPerSession) {
    const passes = isExposure(taskType) ? outcome.completed : independent;
    // Проверка после перерыва засчитывается только в другом занятии, чем знакомство.
    const breakOk = taskType !== 'check' || (p.introducedSession ?? sessionIndex) < sessionIndex;
    if (passes && breakOk) {
      p.stage += 1;
      p.stagesThisSession += 1;
    }
  }

  // Интервальное повторение.
  if (!isExposure(realType)) {
    if (!outcome.completed || outcome.errors > 0) {
      // Ошибка: вернуть позже в этом же занятии и снова в следующем. Без штрафов к накопленному.
      p.box = Math.min(p.box, 1);
      setBox(p, 0, now, sessionIndex);
    } else if (independent) {
      // Пока символ изучается — встречаемся в следующем занятии; освоенный уходит на всё более длинные интервалы.
      // Повтор в том же занятии не доказывает долговременную память — интервал не растёт.
      const sameSessionAgain = prev.lastSeenSession === sessionIndex && p.box >= 2;
      if (!sameSessionAgain) {
        const next = p.mastered && p.box > 0 ? Math.min(p.box + 1, RULES.intervals.length - 1) : 1;
        setBox(p, next, now, sessionIndex);
      }
    } else {
      // С подсказкой: повторить в следующем занятии.
      setBox(p, 1, now, sessionIndex);
    }
  } else if (p.box === 0 && p.stage > 0) {
    setBox(p, 0, now, sessionIndex);
  }

  // Освоение.
  if (!p.mastered && isMastered(p)) {
    p.mastered = true;
    p.masteredAt = now;
    setBox(p, Math.max(p.box, 2), now, sessionIndex);
  }

  p.lastSeenAt = now;
  p.lastSeenSession = sessionIndex;
  p.lastTaskType = realType;
  return p;
}

export function totalIndependent(p: ItemProgress): number {
  return Object.values(p.skills).reduce((a, s) => a + s.independent, 0);
}

export function isMastered(p: ItemProgress): boolean {
  const stages = CURRICULUM.stages[p.track];
  return (
    p.stage >= stages.length &&
    totalIndependent(p) >= RULES.masteryIndependent &&
    p.okTaskTypes.length >= RULES.masteryTaskTypes &&
    p.okSessions.length >= RULES.masterySessions
  );
}

function setBox(p: ItemProgress, box: number, now: number, sessionIndex: number) {
  p.box = box;
  const rule = RULES.intervals[box] as { sameSession?: boolean; nextSession?: boolean; days?: number };
  if (rule.sameSession) {
    p.nextReviewSession = sessionIndex;
    p.nextReviewAt = now;
  } else if (rule.nextSession) {
    p.nextReviewSession = sessionIndex + 1;
    p.nextReviewAt = now;
  } else {
    p.nextReviewSession = sessionIndex + 1;
    p.nextReviewAt = now + (rule.days ?? 1) * DAY;
  }
}

/**
 * Нужно ли повторить символ в занятии sessionIndex.
 * Пропущенные дни не наказываются: просроченное просто становится доступным,
 * а количество повторений в занятии ограничено.
 */
export function isDue(p: ItemProgress, now: number, sessionIndex: number): boolean {
  if (p.stage === 0) return false;
  if ((p.nextReviewSession ?? 0) > sessionIndex) return false;
  return (p.nextReviewAt ?? 0) <= now;
}

/** Насколько просрочено (для сортировки), не влияет на оценку. */
export function overdueScore(p: ItemProgress, now: number): number {
  return now - (p.nextReviewAt ?? now) + (p.mastered ? 0 : 1e12);
}

/** Ребёнку сейчас трудно: много ошибок в последних ответах. */
export function isStruggling(p: ItemProgress): boolean {
  const recent = p.recent.slice(-RULES.struggleWindow);
  if (recent.length < 3) return false;
  const bad = recent.filter((r) => r === 'err').length;
  return bad / recent.length > RULES.struggleErrorRate;
}

/** Число вариантов ответа: растёт с успехами, уменьшается при ошибках. */
export function choiceCount(p: ItemProgress | undefined): number {
  if (!p) return 2;
  const recent = p.recent.slice(-3);
  const recentErr = recent.filter((r) => r === 'err').length;
  const base = 2 + Math.floor(totalIndependent(p) / 2);
  return Math.max(2, Math.min(4, base - recentErr));
}

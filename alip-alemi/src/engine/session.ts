// Построение занятия. Чистая логика: на вход — прогресс, на выход — список заданий.
import { CURRICULUM, RULES, stagesFor, type SessionLength, type TaskType } from '../content/curriculum';
import { ITEMS, SHAPES, glyph, itemsOf, isLetter } from '../content';
import { PICTURES, PICTURE_BY_ID } from '../content/pictures';
import { BASKET_OBJECTS as BASKET_OBJECTS_REF, COUNT_OBJECTS as COUNT_OBJECTS_REF } from '../content/numbers';
import type { Item, Track } from '../content/types';
import { choiceCount, isDue, isExposure, isStruggling, overdueScore, type ItemProgress, type Outcome } from './progress';
import { pick, shuffle, type Rng } from './rng';

export type TaskReason = 'review' | 'new' | 'learn' | 'return' | 'retry';

export interface TaskSpec {
  uid: string;
  /** Тип по программе (этап), используется для продвижения по этапам. */
  type: TaskType;
  /** Что показываем ребёнку. */
  showAs: TaskType;
  itemId: string;
  track: Track;
  reason: TaskReason;
  /** Варианты ответа: id символов или `shape:●`. Всегда содержит правильный ответ (для заданий с выбором). */
  options: string[];
  /** Количество для числовых заданий. */
  count?: number;
  /** Количества групп в «выбери группу». */
  groups?: number[];
  /** Предмет (эмодзи) и слово для числовых заданий. */
  object?: { word: string; picture: string; image?: string };
  /** Сколько предметов доступно для корзины. */
  pool?: number;
  seed: number;
}

export interface SessionPlan {
  track: Track;
  sessionIndex: number;
  reviewOnly: boolean;
  newItemId?: string;
  tasks: TaskSpec[];
}

export interface PlanInput {
  track: Track;
  progress: Record<string, ItemProgress | undefined>;
  sessionIndex: number;
  now: number;
  length: SessionLength;
  rng: Rng;
  /** Есть ли озвучка, чтобы проверить символ на слух. */
  canHear: (item: Item) => boolean;
  /** Сколько новых символов можно ввести за занятие (6–7 лет — 2). */
  maxNew?: number;
  /** Статусы, которые можно показывать детям. Неподготовленные (stub) — никогда. */
  isAvailable?: (item: Item) => boolean;
}

let uidCounter = 0;
const uid = () => `t${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

/** Подготовленные символы трека в порядке программы, с учётом открытия групп чисел. */
export function availableItems(track: Track, progress: PlanInput['progress'], isAvailable?: (i: Item) => boolean): Item[] {
  const order = track === 'letters' ? CURRICULUM.letterOrder : CURRICULUM.numberOrder;
  const ok = (i: Item) => i.status !== 'stub' && (isAvailable ? isAvailable(i) : true);
  let items = order.map((id) => ITEMS[id]).filter((i): i is Item => !!i && ok(i));
  if (track === 'numbers') {
    // Следующая группа чисел открывается только после освоения предыдущей.
    const groupDone = (g: number) =>
      itemsOf('numbers').filter((i) => i.track === 'numbers' && i.group === g && ok(i)).every((i) => progress[i.id]?.mastered);
    items = items.filter((i) => i.track !== 'numbers' || i.group === 1 || (i.group === 2 && groupDone(1)) || (i.group === 3 && groupDone(1) && groupDone(2)));
  }
  return items;
}

/** Знакомые символы: уже было знакомство. */
export function knownItems(track: Track, progress: PlanInput['progress']): Item[] {
  return itemsOf(track).filter((i) => (progress[i.id]?.stage ?? 0) > 0);
}

/**
 * Варианты для выбора — только буквы (или цифры) из всего алфавита:
 * сначала нарочно похожие (Н–Ң, У–Ү–Ұ, А–Ә…), потом знакомые, потом остальные.
 */
export function buildOptions(target: Item, known: Item[], n: number, rng: Rng): string[] {
  const pool = itemsOf(target.track).filter((i) => i.status !== 'stub' && i.id !== target.id && !(i.track === 'numbers' && i.value > 9 && target.track === 'numbers' && (target as { value: number }).value <= 9));
  const confusable = shuffle(pool.filter((k) => target.confusable?.includes(glyph(k))), rng);
  const knownOthers = shuffle(known.filter((k) => k.id !== target.id && !confusable.includes(k)), rng);
  const rest = shuffle(pool.filter((k) => !confusable.includes(k) && !knownOthers.includes(k)), rng);
  // Похожие — максимум половина вариантов, чтобы задание не превращалось в лотерею.
  const nConf = Math.max(1, Math.floor((n - 1) / 2) + (n === 2 ? 0 : 0));
  const picked = [...confusable.slice(0, nConf), ...knownOthers, ...rest].filter((v, i, a) => a.indexOf(v) === i).slice(0, n - 1).map((i) => i.id);
  // Для букв недостающие варианты — картинки (ребёнок отличает букву от предмета), для цифр — фигуры.
  const fillers = target.track === 'letters'
    ? shuffle(PICTURES.filter((p) => p.id !== letterPictureId(target)), rng).map((p) => `pic:${p.id}`)
    : shuffle(SHAPES, rng).map((s) => `shape:${s}`);
  for (let i = 0; picked.length < n - 1; i++) picked.push(fillers[i % fillers.length]);
  return shuffle([target.id, ...picked], rng);
}

/** id картинки слова-примера буквы (её не показываем среди лишних вариантов). */
function letterPictureId(item: Item): string | undefined {
  if (item.track !== 'letters') return undefined;
  const w = item.words[0]?.word;
  return PICTURES.find((p) => p.word === w)?.id;
}

/**
 * «Қай сөз А әрпінен басталады?» — правильная картинка: слово-пример буквы.
 * Остальные — слова знакомых букв и предметы, которые начинаются на другие буквы (ответ всегда один).
 */
export function buildWordOptions(target: Item, known: Item[], n: number, rng: Rng): string[] {
  if (target.track !== 'letters') return [];
  const letter = target.upper;
  const knownWords = known
    .filter((k) => k.id !== target.id && k.track === 'letters' && k.words[0])
    .map((k) => letterPictureId(k))
    .filter((id): id is string => !!id && PICTURE_BY_ID[id].first !== letter);
  const extra = PICTURES.filter((p) => p.first !== letter && !knownWords.includes(p.id)).map((p) => p.id);
  const others = [...shuffle(knownWords, rng), ...shuffle(extra, rng)].slice(0, n - 1).map((id) => `pic:${id}`);
  return shuffle([`pic:${letterPictureId(target)}`, ...others], rng);
}

/** Шары: 2–3 с нужной буквой и несколько других. */
export function buildBalloons(target: Item, known: Item[], rng: Rng, targets = 2): string[] {
  const others = buildOptions(target, known, 4, rng).filter((o) => o !== target.id);
  const list = [...Array(targets).fill(target.id), ...others];
  return shuffle(list, rng);
}

function stagesOf(item: Item) {
  return stagesFor(item.track, item.strokes.length > 0);
}

/** Тип, который реально увидит ребёнок для данного запланированного типа. */
function resolveShowAs(type: TaskType, item: Item, rng: Rng, canHear: (i: Item) => boolean): TaskType {
  if (type === 'check') {
    if (isLetter(item)) return canHear(item) && rng() < 0.5 ? 'listen' : 'recognize';
    return rng() < 0.5 ? 'matchDigit' : 'findDigit';
  }
  // Без озвучки слушание невозможно: показываем узнавание и честно не засчитываем навык «на слух».
  if (type === 'listen' && !canHear(item)) return 'balloons';
  return type;
}

/** Типы заданий для повторения: пройденные этапы и текущий этап (для разнообразия). */
function reviewTypes(item: Item, p: ItemProgress, canHear: (i: Item) => boolean): TaskType[] {
  const stages = stagesOf(item);
  const passed = p.mastered ? stages : stages.slice(0, p.stage + 1);
  let types = passed.filter((t) => !isExposure(t) && t !== 'check');
  if (item.track === 'numbers') {
    // Цифра как знак и число как количество — с самого начала в разных заданиях.
    types = [...new Set<TaskType>([...types, 'chooseGroup', ...(p.stage >= 3 ? (['findDigit', 'matchDigit'] as TaskType[]) : [])])];
    if (item.value === 1) types = types.filter((t) => t !== 'basket' || p.stage < 4);
  }
  if (!canHear(item)) types = types.filter((t) => t !== 'listen');
  // Буква ↔ картинка слова: после того как ребёнок узнаёт букву.
  if (item.track === 'letters' && p.stage >= 2 && item.words[0]) types = [...types, 'wordMatch'];
  if (types.length === 0) types = item.track === 'letters' ? ['recognize'] : ['chooseGroup'];
  return types;
}

export function makeTask(
  type: TaskType, item: Item, reason: TaskReason, input: Pick<PlanInput, 'progress' | 'rng' | 'canHear' | 'track'>,
  opts: { maxChoices?: number } = {},
): TaskSpec {
  const { rng, progress } = input;
  const p = progress[item.id];
  const known = knownItems(item.track, progress);
  const showAs = resolveShowAs(type, item, rng, input.canHear);
  // Для букв всегда не меньше трёх вариантов (после ошибок при повторе — два).
  const minChoices = item.track === 'letters' && !opts.maxChoices ? 3 : 2;
  const n = Math.min(opts.maxChoices ?? 4, Math.max(minChoices, choiceCount(p)));
  const spec: TaskSpec = { uid: uid(), type, showAs, itemId: item.id, track: item.track, reason, options: [], seed: Math.floor(rng() * 1e9) };
  if (item.track === 'numbers') {
    const value = item.value;
    spec.count = value;
    spec.object = pick(COUNT_OBJECTS_REF, rng);
    if (showAs === 'basket') {
      spec.object = pick(BASKET_OBJECTS_REF, rng);
      spec.pool = Math.min(value + 2 + Math.floor(rng() * 2), 8);
    }
    if (showAs === 'chooseGroup') {
      const nGroups = Math.min(3, Math.max(2, n));
      const others = shuffle([1, 2, 3, 4, 5, 6].filter((v) => v !== value && Math.abs(v - value) <= 3), rng).slice(0, nGroups - 1);
      spec.groups = shuffle([value, ...others], rng);
    }
  }
  if (showAs === 'balloons') spec.options = buildBalloons(item, known, rng, (p?.skills.practice.independent ?? 0) > 0 ? 3 : 2);
  else if (showAs === 'wordMatch') spec.options = buildWordOptions(item, known, n, rng);
  else if (['recognize', 'listen', 'findDigit', 'matchDigit'].includes(showAs)) spec.options = buildOptions(item, known, n, rng);
  return spec;
}

/** Собрать занятие. */
export function planSession(input: PlanInput): SessionPlan {
  const { track, progress, sessionIndex, now, rng } = input;
  const target = RULES.sessionTasks[input.length];
  const available = availableItems(track, progress, input.isAvailable);
  const introduced = available.filter((i) => (progress[i.id]?.stage ?? 0) > 0);
  const P = (i: Item) => progress[i.id]!;

  const head: TaskSpec[] = [];
  const middle: TaskSpec[] = [];
  const tail: TaskSpec[] = [];
  const perItem: Record<string, number> = {};
  const push = (list: TaskSpec[], t: TaskSpec) => {
    perItem[t.itemId] = (perItem[t.itemId] ?? 0) + 1;
    use(t);
    list.push(t);
  };
  const usedTypes: Record<string, TaskType[]> = {};
  const use = (t: TaskSpec) => (usedTypes[t.itemId] = [...(usedTypes[t.itemId] ?? []), t.showAs]);
  const reviewTask = (item: Item, reason: TaskReason): TaskSpec => {
    const p = P(item);
    const stages = stagesOf(item);
    // Если подошла «проверка после перерыва» — она и будет повторением.
    if (stages[p.stage] === 'check' && (p.introducedSession ?? sessionIndex) < sessionIndex && reason === 'review') {
      return makeTask('check', item, reason, input);
    }
    const types = reviewTypes(item, p, input.canHear);
    const used = usedTypes[item.id] ?? (p.lastTaskType ? [p.lastTaskType] : []);
    // Сначала типы, которых сегодня ещё не было; повторение не выглядит одинаковым упражнением.
    const fresh = types.filter((t) => !used.includes(t));
    const lastUsed = used[used.length - 1];
    const notLast = types.filter((t) => t !== lastUsed);
    const type = pick(fresh.length ? fresh : notLast.length ? notLast : types, rng);
    return makeTask(type, item, reason, input);
  };

  // 1. Повторение в начале: сначала то, что пора повторить.
  const due = introduced.filter((i) => isDue(P(i), now, sessionIndex)).sort((a, b) => overdueScore(P(b), now) - overdueScore(P(a), now));
  let warm = due.slice(0, RULES.maxReviewsAtStart);
  if (warm.length === 0 && introduced.length > 0) {
    warm = [...introduced].sort((a, b) => (P(a).lastSeenAt ?? 0) - (P(b).lastSeenAt ?? 0)).slice(0, Math.min(2, introduced.length));
  }
  for (const item of warm) push(head, reviewTask(item, 'review'));

  // 2. Новый символ — не больше одного и только если ребёнку не трудно.
  const learning = introduced.filter((i) => !P(i).mastered);
  const struggling = introduced.some((i) => isStruggling(P(i)));
  const next = available.find((i) => (progress[i.id]?.stage ?? 0) === 0);
  const canIntroduce = !!next && !struggling && learning.length < RULES.maxLearningAtOnce && RULES.maxNewPerSession > 0;
  let newItemId: string | undefined;
  let secondNewId: string | undefined;

  if (canIntroduce && next) {
    newItemId = next.id;
    const stages = stagesOf(next);
    push(middle, makeTask(stages[0], next, 'new', input));
    // Следующие этапы нового символа; между ними — знакомое, чтобы не было однообразия.
    const filler = shuffle(introduced, rng);
    for (let s = 1; s < Math.min(RULES.maxStagesPerSession, stages.length); s++) {
      if (stages[s] === 'check') break;
      if (filler[s - 1]) push(middle, reviewTask(filler[s - 1], 'learn'));
      push(middle, makeTask(stages[s], next, 'new', input));
    }
  }

  // 2б. Для 6–7 лет — ещё один новый символ, если первый пошёл и ребёнку не трудно.
  if (newItemId && (input.maxNew ?? RULES.maxNewPerSession) > 1) {
    const second = available.find((i) => (progress[i.id]?.stage ?? 0) === 0 && i.id !== newItemId);
    if (second && learning.length + 2 <= RULES.maxLearningAtOnce + 1) {
      push(middle, makeTask(stagesOf(second)[0], second, 'new', input));
      push(middle, makeTask(stagesOf(second)[1], second, 'new', input));
      secondNewId = second.id;
    }
  }

  // 3. Продолжаем изучение начатых символов: следующий этап каждого.
  for (const item of learning) {
    const p = P(item);
    const stage = stagesOf(item)[p.stage];
    // Пропускаем только знакомство; «пересчёт» тоже этап, иначе число навсегда застрянет на нём.
    if (!stage || stage === 'intro' || stage === 'numIntro') continue;
    if (stage === 'check' && (p.introducedSession ?? sessionIndex) >= sessionIndex) continue;
    if (head.some((t) => t.itemId === item.id && t.type === stage)) continue;
    push(middle, makeTask(stage, item, 'learn', input));
  }

  // 4. Возвращение к пройденному в конце: новое — «позже в том же занятии», иначе — другое знакомое.
  if (newItemId) {
    const item = ITEMS[newItemId];
    push(tail, makeTask(item.track === 'letters' ? 'recognize' : 'findDigit', item, 'return', { ...input, progress: { ...progress, [item.id]: progress[item.id] } }));
    if (secondNewId) push(tail, makeTask(ITEMS[secondNewId].track === 'letters' ? 'recognize' : 'findDigit', ITEMS[secondNewId], 'return', input));
  } else if (introduced.length > 0) {
    const item = pick(introduced, rng);
    push(tail, reviewTask(item, 'return'));
  }

  // 5. Добиваем до нужной длины разнообразным повторением, не перегружая один символ.
  let tasks = [...head, ...middle];
  let guard = 0;
  while (tasks.length + tail.length < target && introduced.length > 0 && guard++ < 40) {
    const candidates = introduced.filter((i) => (perItem[i.id] ?? 0) < 3);
    if (!candidates.length) break;
    const item = pick(candidates, rng);
    const t = reviewTask(item, 'review');
    perItem[item.id] = (perItem[item.id] ?? 0) + 1;
    use(t);
    // Вставляем так, чтобы один и тот же символ не шёл подряд.
    const pos = tasks.length === 0 ? 0 : Math.floor(rng() * (tasks.length + 1));
    if (tasks[pos - 1]?.itemId === item.id || tasks[pos]?.itemId === item.id) tasks.push(t);
    else tasks.splice(pos, 0, t);
  }
  // Новое знакомство не должно быть вытолкнуто за пределы занятия.
  if (tasks.length + tail.length > target) {
    const keep = tasks.filter((t) => t.reason === 'new');
    const others = tasks.filter((t) => t.reason !== 'new').slice(0, Math.max(0, target - tail.length - keep.length));
    tasks = tasks.filter((t) => keep.includes(t) || others.includes(t));
  }
  return {
    track,
    sessionIndex,
    reviewOnly: !newItemId,
    newItemId,
    tasks: [...tasks, ...tail],
  };
}

/** Более простое задание того же символа после ошибки. */
export function easierType(t: TaskType): TaskType {
  switch (t) {
    case 'listen': case 'balloons': case 'check': case 'wordMatch': return 'recognize';
    case 'trace': case 'write': return 'trace';
    case 'matchDigit': case 'basket': case 'chooseGroup': return 'count';
    case 'findDigit': return 'findDigit';
    default: return t;
  }
}

/**
 * После ошибки или подсказки: вернуть символ позже в этом же занятии в более простом виде
 * (не больше одного раза на символ за занятие).
 */
export function adaptAfter(
  plan: SessionPlan, index: number, task: TaskSpec, outcome: Outcome,
  input: Pick<PlanInput, 'progress' | 'rng' | 'canHear' | 'track'>,
): SessionPlan {
  if (isExposure(task.showAs)) return plan;
  if (outcome.errors === 0 && !outcome.hinted) return plan;
  const already = plan.tasks.slice(index + 1).some((t) => t.itemId === task.itemId && t.reason === 'retry');
  const retried = plan.tasks.slice(0, index + 1).filter((t) => t.itemId === task.itemId && t.reason === 'retry').length;
  if (already || retried >= 1) return plan;
  const item = ITEMS[task.itemId];
  const easy = makeTask(easierType(task.showAs), item, 'retry', input, { maxChoices: 2 });
  const tasks = plan.tasks.slice();
  // «Позже, после нескольких других заданий»: через 2 задания или в конце.
  const pos = Math.min(index + 3, tasks.length);
  tasks.splice(pos, 0, easy);
  return { ...plan, tasks };
}

export { glyph };

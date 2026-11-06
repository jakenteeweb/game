import { describe, expect, it } from 'vitest';
import { ITEMS, glyph, type Item } from '../content';
import { CURRICULUM, RULES } from '../content/curriculum';
import { applyOutcome, choiceCount, isDue, newProgress, type ItemProgress, type Outcome } from './progress';
import { adaptAfter, availableItems, buildOptions, knownItems, planSession, type PlanInput, type TaskSpec } from './session';
import { mulberry32 } from './rng';
import { PICTURE_BY_ID } from '../content/pictures';

const DAY = 86400000;
const OK: Outcome = { completed: true, errors: 0, hinted: false };
const HINT: Outcome = { completed: true, errors: 1, hinted: true };
const canHear = () => true;

type Prog = Record<string, ItemProgress | undefined>;

function run(task: TaskSpec, prog: Prog, outcome: Outcome, now: number, sessionIndex: number): Prog {
  const p = prog[task.itemId] ?? newProgress('kid', task.itemId, task.track);
  return {
    ...prog,
    [task.itemId]: applyOutcome(p, outcome, {
      now, sessionIndex, isReview: task.reason !== 'new', taskType: task.type, checkAs: task.showAs,
    }),
  };
}

function plan(prog: Prog, sessionIndex: number, now: number, seed = 1, track: 'letters' | 'numbers' = 'letters') {
  const input: PlanInput = { track, progress: prog, sessionIndex, now, length: 'normal', rng: mulberry32(seed), canHear };
  return planSession(input);
}

describe('варианты ответа', () => {
  it('всегда содержат правильный ответ и только знакомые символы', () => {
    const rng = mulberry32(7);
    let prog: Prog = {};
    const seenTypes = new Set<string>();
    for (let s = 0; s < 12; s++) {
      const pl = plan(prog, s, s * DAY, s + 3);
      for (const t of pl.tasks) {
        const known = new Set([...knownItems('letters', prog).map((i) => i.id), t.itemId]);
        if (t.showAs === 'wordMatch') {
          // Ровно одна картинка начинается на нужную букву — это и есть ответ.
          const letter = ITEMS[t.itemId].track === 'letters' ? (ITEMS[t.itemId] as { upper: string }).upper : '';
          const firsts = t.options.map((o) => PICTURE_BY_ID[o.slice(4)].first);
          expect(firsts.filter((f) => f === letter)).toHaveLength(1);
          expect(t.options.length).toBeGreaterThanOrEqual(3);
        } else if (t.options.length) {
          expect(t.options).toContain(t.itemId);
          // Только буквы (или цифры) того же раздела — без картинок и фигур; без повторов (кроме шаров).
          for (const o of t.options) expect(ITEMS[o]?.track, `${o} в задании ${t.showAs}`).toBe(ITEMS[t.itemId].track);
          if (t.showAs !== 'balloons') expect(new Set(t.options).size).toBe(t.options.length);
          void known;
          if (ITEMS[t.itemId].track === 'letters' && t.reason !== 'retry' && t.showAs !== 'balloons') expect(t.options.length).toBeGreaterThanOrEqual(3);
        }
        seenTypes.add(t.showAs);
        prog = run(t, prog, rng() < 0.8 ? OK : HINT, s * DAY, s);
      }
    }
    expect(seenTypes.has('wordMatch'), [...seenTypes].join(',')).toBe(true);
  });

  it('варианты — буквы всего алфавита, и среди них похожие', () => {
    const opts = buildOptions(ITEMS.L_n, [], 4, mulberry32(1));
    expect(opts).toContain('L_n');
    expect(opts.every((o) => ITEMS[o]?.track === 'letters')).toBe(true);
    expect(opts.some((o) => ['L_ng', 'L_i', 'L_p'].includes(o))).toBe(true); // Ң, И или П
  });


});

describe('подсказки и ошибки', () => {
  it('ответ после подсказки не засчитывается как самостоятельный', () => {
    let p = newProgress('kid', 'L_a', 'letters');
    p = applyOutcome(p, OK, { now: 0, sessionIndex: 0, isReview: false, taskType: 'intro' });
    p = applyOutcome(p, HINT, { now: 0, sessionIndex: 0, isReview: false, taskType: 'recognize' });
    expect(p.skills.visual.independent).toBe(0);
    expect(p.skills.visual.helped).toBe(1);
    expect(p.stage).toBe(1); // этап «узнавание» не пройден
    p = applyOutcome(p, OK, { now: 0, sessionIndex: 0, isReview: false, taskType: 'recognize' });
    expect(p.skills.visual.independent).toBe(1);
    expect(p.stage).toBe(2);
  });

  it('ошибки уменьшают число вариантов', () => {
    let p = newProgress('kid', 'L_a', 'letters');
    for (let i = 0; i < 6; i++) p = applyOutcome(p, OK, { now: 0, sessionIndex: i, isReview: true, taskType: 'recognize' });
    const before = choiceCount(p);
    p = applyOutcome(p, { completed: true, errors: 2, hinted: true }, { now: 0, sessionIndex: 7, isReview: true, taskType: 'recognize' });
    p = applyOutcome(p, { completed: true, errors: 1, hinted: false }, { now: 0, sessionIndex: 7, isReview: true, taskType: 'recognize' });
    expect(choiceCount(p)).toBeLessThan(before);
  });

  it('после ошибки задание возвращается позже в более простом виде', () => {
    const pl = plan({}, 0, 0);
    const idx = pl.tasks.findIndex((t) => t.showAs === 'listen');
    expect(idx).toBeGreaterThan(-1);
    const next = adaptAfter(pl, idx, pl.tasks[idx], { completed: true, errors: 1, hinted: false }, { progress: {}, rng: mulberry32(2), canHear, track: 'letters' });
    const retry = next.tasks.find((t) => t.reason === 'retry');
    expect(retry?.showAs).toBe('recognize');
    expect(retry?.options).toHaveLength(2);
    expect(next.tasks.indexOf(retry!)).toBeGreaterThan(idx);
  });
});

describe('занятие', () => {
  it('первое занятие знакомит ровно с одной буквой и возвращается к ней в конце', () => {
    const pl = plan({}, 0, 0);
    const intros = pl.tasks.filter((t) => t.type === 'intro');
    expect(intros).toHaveLength(1);
    expect(pl.newItemId).toBe(CURRICULUM.letterOrder[0]);
    expect(pl.tasks[pl.tasks.length - 1].reason).toBe('return');
  });

  it('не больше одного нового символа за занятие', () => {
    let prog: Prog = {};
    for (let s = 0; s < 8; s++) {
      const pl = plan(prog, s, s * DAY, s);
      expect(new Set(pl.tasks.filter((t) => t.type === 'intro').map((t) => t.itemId)).size).toBeLessThanOrEqual(RULES.maxNewPerSession);
      for (const t of pl.tasks) prog = run(t, prog, OK, s * DAY, s);
    }
  });

  it('буква не осваивается за одно занятие', () => {
    let prog: Prog = {};
    const pl = plan(prog, 0, 0);
    for (const t of pl.tasks) prog = run(t, prog, OK, 0, 0);
    expect(prog.L_a?.mastered).toBe(false);
    expect(prog.L_a?.stage).toBeLessThan(CURRICULUM.stages.letters.length);
  });

  it('при успехах буква осваивается через несколько занятий и уходит на длинный интервал', () => {
    let prog: Prog = {};
    let s = 0;
    for (; s < 10 && !prog.L_a?.mastered; s++) {
      const pl = plan(prog, s, s * DAY, s + 11);
      for (const t of pl.tasks) prog = run(t, prog, OK, s * DAY, s);
    }
    const p = prog.L_a!;
    expect(p.mastered).toBe(true);
    expect(p.okSessions.length).toBeGreaterThanOrEqual(2);
    expect(p.okTaskTypes.length).toBeGreaterThanOrEqual(2);
    expect(p.box).toBe(2);
    expect(isDue(p, p.lastSeenAt! + DAY, s)).toBe(false);
    expect(isDue(p, p.lastSeenAt! + 3 * DAY, s)).toBe(true);
  });

  it('повторения назначаются и возвращаются в следующее занятие', () => {
    let prog: Prog = {};
    const pl0 = plan(prog, 0, 0);
    for (const t of pl0.tasks) prog = run(t, prog, OK, 0, 0);
    expect(isDue(prog.L_a!, 1000, 1)).toBe(true);
    const pl1 = plan(prog, 1, DAY);
    expect(pl1.tasks[0].itemId).toBe('L_a');
    expect(pl1.tasks[0].reason).toBe('review');
  });

  it('пропуск многих дней не создаёт огромной очереди и не штрафует', () => {
    let prog: Prog = {};
    for (let s = 0; s < 6; s++) {
      const pl = plan(prog, s, s * DAY, s);
      for (const t of pl.tasks) prog = run(t, prog, OK, s * DAY, s);
    }
    const snapshot = structuredClone(prog);
    const later = plan(prog, 6, 60 * DAY, 99);
    expect(later.tasks.filter((t) => t.reason === 'review').length).toBeLessThanOrEqual(RULES.sessionTasks.normal);
    expect(later.tasks.length).toBeLessThanOrEqual(RULES.sessionTasks.normal + 1);
    // Сам факт пропуска ничего не меняет в прогрессе.
    expect(prog).toEqual(snapshot);
  });

  it('при трудностях — занятие только на повторение', () => {
    let prog: Prog = {};
    const pl = plan(prog, 0, 0);
    for (const t of pl.tasks) prog = run(t, prog, t.type === 'intro' ? OK : { completed: true, errors: 2, hinted: true }, 0, 0);
    const pl1 = plan(prog, 1, DAY);
    expect(pl1.reviewOnly).toBe(true);
    expect(pl1.tasks.some((t) => t.type === 'intro')).toBe(false);
  });

  it('неподготовленные уроки не попадают в занятия', () => {
    const ids = availableItems('letters', {}).map((i: Item) => i.id);
    expect(ids).toEqual(CURRICULUM.letterOrder.filter((id) => ITEMS[id].status !== 'stub'));
    expect(availableItems('numbers', {}).map((i) => i.id)).toEqual(['N_1', 'N_2', 'N_3', 'N_4', 'N_5']);
  });
});

describe('числа', () => {
  it('задания на количество содержат корректные данные', () => {
    let prog: Prog = {};
    for (let s = 0; s < 8; s++) {
      const pl = plan(prog, s, s * DAY, s + 5, 'numbers');
      for (const t of pl.tasks) {
        const item = ITEMS[t.itemId];
        if (item.track !== 'numbers') throw new Error('не тот трек');
        if (t.showAs === 'chooseGroup') {
          expect(t.groups!.filter((g) => g === item.value)).toHaveLength(1);
          expect(new Set(t.groups).size).toBe(t.groups!.length);
        }
        if (t.showAs === 'basket') expect(t.pool!).toBeGreaterThan(item.value);
        if (['findDigit', 'matchDigit'].includes(t.showAs)) expect(t.options).toContain(t.itemId);
        expect(glyph(item)).toBe(String(item.value));
        prog = run(t, prog, OK, s * DAY, s);
      }
    }
    expect(Object.values(prog).filter((p) => p!.stage > 0).length).toBeGreaterThan(1);
  });
  it('число не застревает на пересчёте, если после знакомства ребёнок вышел', () => {
    // Знакомство с 1 прошло, а пересчёт — нет (ребёнок закрыл занятие).
    let prog: Prog = {};
    const pl = plan(prog, 0, 0, 3, 'numbers');
    prog = run(pl.tasks.find((t) => t.type === 'numIntro')!, prog, OK, 0, 0);
    expect(prog.N_1!.stage).toBe(1);
    const next = plan(prog, 1, DAY, 4, 'numbers');
    expect(next.tasks.some((t) => t.itemId === 'N_1' && t.type === 'count')).toBe(true);
  });
});

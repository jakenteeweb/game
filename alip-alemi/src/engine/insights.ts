// Понятные наблюдения для родителя. Без диагнозов, оценок скорости и сравнений с другими детьми.
import { ITEMS, glyph } from '../content';
import { CURRICULUM } from '../content/curriculum';
import { isDue, totalIndependent, type ItemProgress } from './progress';

export type ItemState = 'new' | 'learning' | 'mastered';

export function stateOf(p: ItemProgress | undefined): ItemState {
  if (!p || p.stage === 0) return 'new';
  return p.mastered ? 'mastered' : 'learning';
}

const STAGE_NAMES: Record<string, string> = {
  intro: 'знакомство', recognize: 'узнавание', listen: 'на слух', trace: 'обведение', balloons: 'игра-закрепление',
  check: 'проверка после перерыва', numIntro: 'знакомство', count: 'пересчёт', basket: 'корзина', chooseGroup: 'выбор группы',
  findDigit: 'поиск цифры',
};

export function stageLabel(p: ItemProgress): string {
  const stages = CURRICULUM.stages[p.track];
  if (p.mastered) return 'освоено';
  const next = stages[p.stage];
  return next ? `дальше: ${STAGE_NAMES[next] ?? next}` : 'почти освоено';
}

export function observations(progress: Record<string, ItemProgress>, canHear: (itemId: string) => boolean): string[] {
  const out: string[] = [];
  for (const p of Object.values(progress)) {
    if (p.stage === 0) continue;
    const item = ITEMS[p.itemId];
    if (!item) continue;
    const g = glyph(item);
    const { visual, audio, practice, quantity } = p.skills;
    const isLetter = p.track === 'letters';

    if (isLetter && visual.independent >= 2 && audio.errors > audio.independent && audio.errors >= 2) {
      out.push(`Узнаёт ${g} по виду, но пока путает на слух.`);
    } else if (isLetter && audio.independent >= 2 && visual.errors > visual.independent && visual.errors >= 2) {
      out.push(`Узнаёт ${g} на слух, но пока путает по виду.`);
    }
    if (isLetter && !canHear(p.itemId) && p.stage >= 3) {
      out.push(`Понимание ${g} на слух не проверялось: для этой буквы нет казахской озвучки.`);
    }
    if (!isLetter && visual.independent >= 2 && quantity.errors > quantity.independent && quantity.errors >= 2) {
      out.push(`Узнаёт цифру ${g}, но пока не всегда соотносит её с количеством.`);
    }
    if (!isLetter && quantity.independent >= 2 && visual.errors > visual.independent && visual.errors >= 2) {
      out.push(`Хорошо считает до ${g}, но цифру ${g} пока путает с другими.`);
    }
    if (practice.errors >= 3 && practice.independent === 0) {
      out.push(`Обведение ${g} пока даётся непросто — это нормально, мелкая моторика развивается постепенно.`);
    }
    const helped = Object.values(p.skills).reduce((a, s) => a + s.helped, 0);
    if (helped >= 3 && helped > totalIndependent(p)) {
      out.push(`С ${g} пока часто нужна подсказка — приложение чаще возвращается к этому символу в простых заданиях.`);
    }
    if (p.mastered) out.push(`${g} — освоено: самостоятельные ответы в разных заданиях и в разные дни.`);
  }
  return out;
}

export function dueSoon(progress: Record<string, ItemProgress>, now: number, nextSession: number): ItemProgress[] {
  return Object.values(progress).filter((p) => p.stage > 0 && isDue(p, now, nextSession));
}

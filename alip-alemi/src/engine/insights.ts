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
  intro: 'танысу', recognize: 'тану', listen: 'тыңдап тану', trace: 'бойлап сызу', write: 'өзі жазу', balloons: 'бекіту ойыны',
  check: 'үзілістен кейінгі тексеру', numIntro: 'танысу', count: 'санау', basket: 'себет', chooseGroup: 'топты таңдау',
  findDigit: 'цифрды табу', matchDigit: 'санға цифр табу', wordMatch: 'әріп пен сурет',
};

export function stageLabel(p: ItemProgress): string {
  const stages = CURRICULUM.stages[p.track];
  if (p.mastered) return 'меңгерді';
  const next = stages[p.stage];
  return next ? `келесі: ${STAGE_NAMES[next] ?? next}` : 'меңгеруге жақын';
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
      out.push(`${g} әрпін көргенде таниды, бірақ естігенде әлі шатастырады.`);
    } else if (isLetter && audio.independent >= 2 && visual.errors > visual.independent && visual.errors >= 2) {
      out.push(`${g} әрпін естігенде таниды, бірақ көргенде әлі шатастырады.`);
    }
    if (isLetter && !canHear(p.itemId) && p.stage >= 3) {
      out.push(`${g} әрпін тыңдап тану тексерілмеді: бұл әріпке қазақша дыбыстау жоқ.`);
    }
    if (!isLetter && visual.independent >= 2 && quantity.errors > quantity.independent && quantity.errors >= 2) {
      out.push(`${g} цифрын таниды, бірақ оны заттардың санымен әрдайым сәйкестендіре бермейді.`);
    }
    if (!isLetter && quantity.independent >= 2 && visual.errors > visual.independent && visual.errors >= 2) {
      out.push(`Заттарды жақсы санайды, бірақ ${g} цифрын басқа цифрлармен әлі шатастырады.`);
    }
    if (practice.errors >= 3 && practice.independent === 0) {
      out.push(`${g} таңбасын бойлап сызу әзірге қиындау — бұл қалыпты, қол моторикасы біртіндеп дамиды.`);
    }
    const helped = Object.values(p.skills).reduce((a, s) => a + s.helped, 0);
    if (helped >= 3 && helped > totalIndependent(p)) {
      out.push(`${g} таңбасында әзірге жиі көмек керек — қосымша оған қарапайым тапсырмаларда жиірек оралады.`);
    }
    if (p.mastered) out.push(`${g} — меңгерілді: әр түрлі тапсырмаларда және әр күні өз бетімен дұрыс жауап берді.`);
  }
  return out;
}

export function dueSoon(progress: Record<string, ItemProgress>, now: number, nextSession: number): ItemProgress[] {
  return Object.values(progress).filter((p) => p.stage > 0 && isDue(p, now, nextSession));
}

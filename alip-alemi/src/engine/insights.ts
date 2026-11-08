// Понятные наблюдения для родителя. Без диагнозов, оценок скорости и сравнений с другими детьми.
import { ITEMS, glyph } from '../content';
import { isDue, stagesOf, totalIndependent, type ItemProgress } from './progress';

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
  // Этапы именно этого символа: у чисел без прописи нет «обведи» и «напиши».
  const stages = stagesOf(p);
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

// ---------------- «Мектепке дайындық» ----------------

export type Readiness = 'none' | 'learning' | 'ready';
export interface ReadinessRow {
  key: string;
  title: string;
  status: Readiness;
  detail: string;
}
type Tally = { ok: number; tries: number } | undefined;

/** Статус навыка по играм: мало данных — «учится», 80% раундов без ошибок из ≥8 — «готов». */
export function tallyStatus(t: Tally): Readiness {
  if (!t || t.tries === 0) return 'none';
  return t.tries >= 8 && t.ok / t.tries >= 0.8 ? 'ready' : 'learning';
}

/** Карта готовности к школе: буквы, цифры, звуки, чтение, счёт, письмо. Без оценок — только что умеет и что повторить. */
export function readiness(
  progress: Record<string, ItemProgress | undefined>,
  skills: Partial<Record<string, { ok: number; tries: number }>>,
  available: { letters: number; numbers: number },
): ReadinessRow[] {
  const all = Object.values(progress).filter((p): p is ItemProgress => !!p);
  const count = (track: 'letters' | 'numbers') => {
    const ps = all.filter((p) => p.track === track && p.stage > 0);
    return { seen: ps.length, mastered: ps.filter((p) => p.mastered).length };
  };
  const trackRow = (key: string, title: string, track: 'letters' | 'numbers', total: number): ReadinessRow => {
    const c = count(track);
    const status: Readiness = c.seen === 0 ? 'none' : total > 0 && c.mastered >= total * 0.8 ? 'ready' : 'learning';
    return { key, title, status, detail: `меңгерді: ${c.mastered} / ${total}, танысты: ${c.seen}` };
  };
  const pct = (t: Tally) => (t && t.tries ? `${t.tries} раунд, ${Math.round((t.ok / t.tries) * 100)}% қатесіз` : 'әлі ойнаған жоқ');
  const wroteOk = all.filter((p) => p.okTaskTypes.includes('write')).length;
  const w = skills.writing;
  return [
    trackRow('letters', 'Әріптер', 'letters', available.letters),
    trackRow('numbers', 'Сандар (0–20)', 'numbers', available.numbers),
    { key: 'sounds', title: 'Дыбыстық талдау', status: tallyStatus(skills.sounds), detail: `«Дыбыстар» ойыны: ${pct(skills.sounds)}` },
    { key: 'reading', title: 'Буын және оқу', status: tallyStatus(skills.reading), detail: `«Буын», «Сөз құра»: ${pct(skills.reading)}` },
    { key: 'math', title: 'Есеп', status: tallyStatus(skills.math), detail: `«Есеп»: ${pct(skills.math)}` },
    {
      key: 'writing', title: 'Жазу', status: wroteOk === 0 && !w?.tries ? 'none' : tallyStatus(w) === 'ready' && wroteOk >= 5 ? 'ready' : 'learning',
      detail: `сабақта өзі жазды: ${wroteOk} таңба; «Диктант»: ${pct(w)}`,
    },
  ];
}

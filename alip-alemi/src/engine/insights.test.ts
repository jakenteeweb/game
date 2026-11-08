import { describe, expect, it } from 'vitest';
import { newProgress, type ItemProgress } from './progress';
import { readiness, stageLabel, tallyStatus } from './insights';

const prog = (id: string, track: 'letters' | 'numbers', extra: Partial<ItemProgress> = {}) =>
  ({ ...newProgress('p', id, track), stage: 1, ...extra }) as ItemProgress;

describe('отчёт «Мектепке дайындық»', () => {
  it('без занятий всё «әлі басталмады»', () => {
    const rows = readiness({}, {}, { letters: 40, numbers: 21 });
    expect(rows.map((r) => r.key)).toEqual(['letters', 'numbers', 'sounds', 'reading', 'math', 'writing']);
    expect(rows.every((r) => r.status === 'none')).toBe(true);
  });
  it('навык игр «меңгерді» только при достаточном числе раундов без ошибок', () => {
    expect(tallyStatus({ ok: 3, tries: 3 })).toBe('learning'); // мало данных
    expect(tallyStatus({ ok: 7, tries: 10 })).toBe('learning');
    expect(tallyStatus({ ok: 9, tries: 10 })).toBe('ready');
  });
  it('буквы: меңгерді, когда освоено 80% доступных', () => {
    const p: Record<string, ItemProgress> = {};
    for (let i = 0; i < 4; i++) p[`L${i}`] = prog(`L_a`, 'letters', { mastered: true });
    p.L4 = prog('L_n', 'letters');
    const r = readiness(p, {}, { letters: 5, numbers: 21 })[0];
    expect(r.status).toBe('ready');
    expect(r.detail).toContain('4 / 5');
  });
  it('этап числа без прописи не обещает «напиши»', () => {
    const p = prog('N_15', 'numbers', { stage: 3 });
    expect(stageLabel(p)).not.toContain('жазу');
  });
});

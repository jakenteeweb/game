import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDbHandle, type Profile } from './db';
import { applyOutcome, newProgress } from '../engine/progress';

const profile = (id: string, nickname: string): Profile => ({
  v: 1, id, nickname, avatar: '🐻', age: 5, length: 'normal', createdAt: Date.now(), sessionCount: 0, garden: [],
});

beforeEach(async () => {
  await resetDbHandle();
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase('alip-alemi');
    req.onsuccess = () => r();
    req.onerror = () => r();
  });
});

describe('хранилище', () => {
  it('профили детей не смешиваются', async () => {
    await db.putProfile(profile('p1', 'Айко'));
    await db.putProfile(profile('p2', 'Бота'));
    const a = applyOutcome(newProgress('p1', 'L_a', 'letters'), { completed: true, errors: 0, hinted: false },
      { now: 1, sessionIndex: 0, isReview: false, taskType: 'intro' });
    await db.putProgress(a);
    await db.putProgress(newProgress('p2', 'N_1', 'numbers'));
    expect(Object.keys(await db.progressFor('p1'))).toEqual(['L_a']);
    expect(Object.keys(await db.progressFor('p2'))).toEqual(['N_1']);
    expect((await db.progressFor('p1')).L_a.stage).toBe(1);
  });

  it('прогресс сохраняется после «перезапуска» (новое подключение к базе)', async () => {
    await db.putProfile(profile('p1', 'Айко'));
    await db.putProgress({ ...newProgress('p1', 'L_n', 'letters'), stage: 3 });
    await resetDbHandle();
    expect((await db.progressFor('p1')).L_n.stage).toBe(3);
    expect((await db.listProfiles())[0].nickname).toBe('Айко');
  });

  it('сброс и удаление касаются только одного ребёнка', async () => {
    await db.putProfile(profile('p1', 'Айко'));
    await db.putProfile(profile('p2', 'Бота'));
    await db.putProgress(newProgress('p1', 'L_a', 'letters'));
    await db.putProgress(newProgress('p2', 'L_a', 'letters'));
    await db.resetProgress('p1');
    expect(await db.progressFor('p1')).toEqual({});
    expect(Object.keys(await db.progressFor('p2'))).toEqual(['L_a']);
    await db.deleteProfile('p2');
    expect((await db.listProfiles()).map((p) => p.id)).toEqual(['p1']);
    expect(await db.progressFor('p2')).toEqual({});
  });
});

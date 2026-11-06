// Локальное хранилище в IndexedDB. Без регистрации; данные не покидают устройство.
import type { SessionLength } from '../content/curriculum';
import type { ReviewStatus } from '../content/types';
import { PROGRESS_VERSION, type ItemProgress } from '../engine/progress';

const DB_NAME = 'alip-alemi';
/** Версия схемы IndexedDB. Каждое изменение — новая ступень в upgrade(), старые данные сохраняются. */
const DB_VERSION = 1;
/** Версия формата записей. Миграции записей — в migrateRecord(). */
export const DATA_VERSION = 1;

export interface Profile {
  v: number;
  id: string;
  /** Только псевдоним — настоящее имя не нужно. */
  nickname: string;
  avatar: string;
  age: 4 | 5 | 6 | 7;
  length: SessionLength;
  createdAt: number;
  /** Номер следующего занятия (счётчик занятий ребёнка). */
  sessionCount: number;
  lastSessionAt?: number;
  /** Сад: награды за участие и старание. */
  garden: string[];
}

export interface SessionLog {
  id: string;
  profileId: string;
  track: 'letters' | 'numbers';
  index: number;
  startedAt: number;
  endedAt?: number;
  tasksDone: number;
  newItemId?: string;
  reviewOnly: boolean;
}

export interface Settings {
  key: 'settings';
  speechOn: boolean;
  speechVolume: number;
  musicOn: boolean;
  musicVolume: number;
  /** Использовать синтез речи с казахским голосом, если записи нет (помечается как непроверенный). */
  allowKazakhTts: boolean;
  /** Использовать встроенную ИИ-озвучку (Higgsfield), пока нет записей носителя. */
  allowAiVoice: boolean;
  /** Показывать детям уроки со статусом «черновик» (ещё не проверены педагогом). */
  showDrafts: boolean;
  activeProfileId?: string;
}

export interface Recording {
  clipId: string;
  blob: Blob;
  fileName: string;
  addedAt: number;
}

export interface ContentOverride {
  id: string;
  status: ReviewStatus;
  note?: string;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  key: 'settings',
  speechOn: true,
  speechVolume: 1,
  musicOn: false,
  musicVolume: 0.3,
  allowKazakhTts: true,
  allowAiVoice: true,
  showDrafts: true,
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => upgrade(req.result, e.oldVersion);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Только для тестов. */
export async function resetDbHandle() {
  const p = dbPromise;
  dbPromise = null;
  if (p) (await p).close();
}

function upgrade(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    db.createObjectStore('profiles', { keyPath: 'id' });
    const progress = db.createObjectStore('progress', { keyPath: 'key' });
    progress.createIndex('profileId', 'profileId');
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('profileId', 'profileId');
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('recordings', { keyPath: 'clipId' });
    db.createObjectStore('content', { keyPath: 'id' });
  }
  // if (oldVersion < 2) { … будущие изменения схемы … }
}

/** Миграция отдельных записей при чтении: старый прогресс не теряется после обновлений. */
export function migrateProgress(rec: ItemProgress): ItemProgress {
  const r = { ...rec } as ItemProgress & { v?: number };
  if (!r.v) r.v = 1;
  // if (r.v < 2) { … }
  r.v = PROGRESS_VERSION;
  return r;
}
export function migrateProfile(rec: Profile): Profile {
  return { ...rec, garden: rec.garden ?? [], v: DATA_VERSION };
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const req = fn(s);
        let result: T;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const db = {
  // Профили
  async listProfiles(): Promise<Profile[]> {
    const all = await tx<Profile[]>('profiles', 'readonly', (s) => s.getAll());
    return (all ?? []).map(migrateProfile).sort((a, b) => a.createdAt - b.createdAt);
  },
  async getProfile(id: string): Promise<Profile | undefined> {
    const p = await tx<Profile | undefined>('profiles', 'readonly', (s) => s.get(id));
    return p ? migrateProfile(p) : undefined;
  },
  putProfile(p: Profile) {
    return tx('profiles', 'readwrite', (s) => s.put(p));
  },
  /** Удалить профиль и все его данные. */
  async deleteProfile(id: string) {
    await this.resetProgress(id);
    await tx('profiles', 'readwrite', (s) => s.delete(id));
    const st = await this.getSettings();
    if (st.activeProfileId === id) await this.putSettings({ ...st, activeProfileId: undefined });
  },
  /** Сбросить прогресс ребёнка (профиль остаётся). */
  async resetProgress(profileId: string) {
    const d = await openDb();
    await new Promise<void>((resolve, reject) => {
      const t = d.transaction(['progress', 'sessions'], 'readwrite');
      for (const name of ['progress', 'sessions']) {
        const idx = t.objectStore(name).index('profileId');
        const req = idx.openKeyCursor(IDBKeyRange.only(profileId));
        req.onsuccess = () => {
          const c = req.result;
          if (c) {
            t.objectStore(name).delete(c.primaryKey);
            c.continue();
          }
        };
      }
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    const p = await this.getProfile(profileId);
    if (p) await this.putProfile({ ...p, sessionCount: 0, lastSessionAt: undefined, garden: [] });
  },

  // Прогресс
  async progressFor(profileId: string): Promise<Record<string, ItemProgress>> {
    const all = await tx<ItemProgress[]>('progress', 'readonly', (s) => s.index('profileId').getAll(IDBKeyRange.only(profileId)));
    return Object.fromEntries((all ?? []).map(migrateProgress).map((p) => [p.itemId, p]));
  },
  putProgress(p: ItemProgress) {
    return tx('progress', 'readwrite', (s) => s.put(p));
  },

  // Занятия
  putSession(s: SessionLog) {
    return tx('sessions', 'readwrite', (st) => st.put(s));
  },
  async sessionsFor(profileId: string): Promise<SessionLog[]> {
    const all = await tx<SessionLog[]>('sessions', 'readonly', (s) => s.index('profileId').getAll(IDBKeyRange.only(profileId)));
    return (all ?? []).sort((a, b) => a.startedAt - b.startedAt);
  },

  // Настройки
  async getSettings(): Promise<Settings> {
    const s = await tx<Settings | undefined>('settings', 'readonly', (st) => st.get('settings'));
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  },
  putSettings(s: Settings) {
    return tx('settings', 'readwrite', (st) => st.put(s));
  },

  // Записи диктора
  async listRecordings(): Promise<Recording[]> {
    return (await tx<Recording[]>('recordings', 'readonly', (s) => s.getAll())) ?? [];
  },
  putRecording(r: Recording) {
    return tx('recordings', 'readwrite', (s) => s.put(r));
  },
  deleteRecording(clipId: string) {
    return tx('recordings', 'readwrite', (s) => s.delete(clipId));
  },

  // Статусы проверки контента
  async listContentOverrides(): Promise<ContentOverride[]> {
    return (await tx<ContentOverride[]>('content', 'readonly', (s) => s.getAll())) ?? [];
  },
  putContentOverride(o: ContentOverride) {
    return tx('content', 'readwrite', (s) => s.put(o));
  },
};

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

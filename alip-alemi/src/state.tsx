import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { audio, music, setSfx } from './audio/audio';
import { ITEMS, type Item } from './content';
import { db, DEFAULT_SETTINGS, type ContentOverride, type Profile, type Settings } from './storage/db';

export type Screen =
  | { name: 'loading' }
  | { name: 'welcome' }
  | { name: 'pick' }
  | { name: 'home' }
  | { name: 'session'; track: 'letters' | 'numbers'; id: number }
  | { name: 'garden' }
  | { name: 'games' }
  | { name: 'game'; game: 'memory' | 'feed' | 'pop'; id: number }
  | { name: 'parent' };

interface AppState {
  screen: Screen;
  go: (s: Screen) => void;
  profiles: Profile[];
  profile?: Profile;
  settings: Settings;
  overrides: Record<string, ContentOverride>;
  refresh: () => Promise<void>;
  saveSettings: (s: Partial<Settings>) => Promise<void>;
  selectProfile: (id: string) => Promise<void>;
  /** Статус контента с учётом отметок педагога. */
  statusOf: (item: Item) => Item['status'];
  /** Можно ли показывать урок детям. */
  isAvailable: (item: Item) => boolean;
  canHear: (item: Item) => boolean;
}

const Ctx = createContext<AppState>(null as never);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [overrides, setOverrides] = useState<Record<string, ContentOverride>>({});

  const applyAudio = (s: Settings) => {
    audio.configure(s);
    setSfx(s.speechOn);
    music.setVolume(s.musicVolume);
    if (!s.musicOn) music.stop();
  };

  const refresh = useCallback(async () => {
    const [ps, st, ov] = await Promise.all([db.listProfiles(), db.getSettings(), db.listContentOverrides()]);
    setProfiles(ps);
    setSettings(st);
    setOverrides(Object.fromEntries(ov.map((o) => [o.id, o])));
    applyAudio(st);
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      const [ps, st] = await Promise.all([db.listProfiles(), db.getSettings()]);
      if (ps.length === 0) setScreen({ name: 'welcome' });
      else if (st.activeProfileId && ps.some((p) => p.id === st.activeProfileId)) setScreen({ name: 'home' });
      else setScreen({ name: 'pick' });
    })();
  }, [refresh]);

  const saveSettings = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    applyAudio(next);
    await db.putSettings(next);
  };

  const selectProfile = async (id: string) => {
    await saveSettings({ activeProfileId: id });
    setScreen({ name: 'home' });
  };

  const statusOf = (item: Item) => (item.status === 'stub' ? 'stub' : overrides[item.id]?.status ?? item.status);
  const isAvailable = (item: Item) => {
    const st = statusOf(item);
    if (st === 'stub') return false;
    return st !== 'draft' || settings.showDrafts;
  };
  const canHear = (item: Item) => {
    if (item.track === 'letters') return (!!item.soundClip && audio.canPlay(item.soundClip)) || (!!item.nameClip && audio.canPlay(item.nameClip));
    return !!item.nameClip && audio.canPlay(item.nameClip);
  };

  const profile = profiles.find((p) => p.id === settings.activeProfileId);
  const go = (s: Screen) => {
    audio.stop();
    setScreen(s);
  };

  return (
    <Ctx.Provider value={{ screen, go, profiles, profile, settings, overrides, refresh, saveSettings, selectProfile, statusOf, isAvailable, canHear }}>
      {children}
    </Ctx.Provider>
  );
}

export const canHearId = (canHear: (i: Item) => boolean) => (id: string) => (ITEMS[id] ? canHear(ITEMS[id]) : false);

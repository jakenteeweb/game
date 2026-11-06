import { useEffect, useMemo, useState } from 'react';
import { audio } from '../audio/audio';
import { ALL_ITEMS, CLIPS, ITEMS, LETTERS, NUMBERS, glyph, type Clip, type Item, type ReviewStatus } from '../content';
import type { SessionLength } from '../content/curriculum';
import type { ItemProgress } from '../engine/progress';
import { availableItems } from '../engine/session';
import { dueSoon, observations, stageLabel, stateOf } from '../engine/insights';
import { db, newId, type Profile, type SessionLog } from '../storage/db';
import { canHearId, useApp } from '../state';
import { useAudioVersion } from './Fox';

type Tab = 'kids' | 'progress' | 'sound' | 'content';
const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🦉', '🐼', '🐨', '🐯', '🦁', '🐸', '🐧', '🦄'];
const LENGTHS: { v: SessionLength; label: string }[] = [
  { v: 'short', label: '≈5 мин' },
  { v: 'normal', label: '≈6–7 мин' },
  { v: 'long', label: '≈8 мин' },
];
const STATUS_LABEL: Record<ReviewStatus, string> = { stub: 'не подготовлен', draft: 'черновик', reviewed: 'проверено', published: 'опубликовано' };

export function Parent() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>(app.profiles.length ? 'progress' : 'kids');
  return (
    <div className="parent">
      <header>
        <div className="row">
          <h1>Кабинет родителя</h1>
          <button className="btn" onClick={() => app.go(app.profile ? { name: 'home' } : app.profiles.length ? { name: 'pick' } : { name: 'welcome' })}>
            Выйти
          </button>
        </div>
        <nav className="tabs">
          {([['progress', 'Прогресс'], ['kids', 'Дети'], ['sound', 'Звук'], ['content', 'Контент и озвучка']] as [Tab, string][]).map(([t, l]) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'kids' && <Kids />}
        {tab === 'progress' && <ProgressTab />}
        {tab === 'sound' && <SoundTab />}
        {tab === 'content' && <ContentTab />}
      </main>
    </div>
  );
}

function Confirm({ text, action, onYes, onNo }: { text: string; action: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="modal-back">
      <div className="modal">
        <p style={{ marginTop: 0 }}>{text}</p>
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onNo}>Отмена</button>
          <button className="btn danger" onClick={onYes}>{action}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Дети ----------------

function Kids() {
  const app = useApp();
  const [edit, setEdit] = useState<Profile | null>(null);
  const [del, setDel] = useState<Profile | null>(null);
  const blank = (): Profile => ({
    v: 1, id: newId('p'), nickname: '', avatar: AVATARS[app.profiles.length % AVATARS.length], age: 5, length: 'normal',
    createdAt: Date.now(), sessionCount: 0, garden: [],
  });
  return (
    <>
      <div className="banner info">Для профиля достаточно псевдонима и картинки. Настоящее имя, фото, камера и микрофон не нужны. Все данные хранятся только на этом устройстве.</div>
      {app.profiles.map((p) => (
        <div key={p.id} className="card row-wrap">
          <span style={{ fontSize: 36 }}>{p.avatar}</span>
          <div style={{ flex: 1 }}>
            <strong>{p.nickname}</strong>
            <div className="muted">{p.age} лет · занятие {LENGTHS.find((l) => l.v === p.length)?.label} · занятий: {p.sessionCount}</div>
          </div>
          <button className="btn" onClick={() => setEdit(p)}>Изменить</button>
          <button className="btn danger" onClick={() => setDel(p)}>Удалить</button>
        </div>
      ))}
      <button className="btn primary" onClick={() => setEdit(blank())}>+ Добавить ребёнка</button>
      {edit && (
        <ProfileForm
          profile={edit}
          onCancel={() => setEdit(null)}
          onSave={async (p) => {
            await db.putProfile(p);
            if (!app.settings.activeProfileId) await app.saveSettings({ activeProfileId: p.id });
            await app.refresh();
            setEdit(null);
          }}
        />
      )}
      {del && (
        <Confirm
          text={`Удалить профиль «${del.nickname}» и весь его прогресс? Это нельзя отменить.`}
          action="Удалить"
          onNo={() => setDel(null)}
          onYes={async () => {
            await db.deleteProfile(del.id);
            await app.refresh();
            setDel(null);
          }}
        />
      )}
    </>
  );
}

function ProfileForm({ profile, onSave, onCancel }: { profile: Profile; onSave: (p: Profile) => void; onCancel: () => void }) {
  const [p, setP] = useState(profile);
  return (
    <div className="modal-back">
      <div className="modal">
        <div className="field-row">
          <label htmlFor="nick">Псевдоним</label>
          <input id="nick" type="text" maxLength={20} value={p.nickname} placeholder="например, Күншуақ" onChange={(e) => setP({ ...p, nickname: e.target.value })} />
        </div>
        <div className="field-row">
          <label>Картинка</label>
          <div className="avatars">
            {AVATARS.map((a) => <button key={a} className={p.avatar === a ? 'on' : ''} onClick={() => setP({ ...p, avatar: a })}>{a}</button>)}
          </div>
        </div>
        <div className="field-row">
          <label>Возраст</label>
          <div className="seg">
            {([4, 5, 6, 7] as const).map((a) => <button key={a} className={p.age === a ? 'on' : ''} onClick={() => setP({ ...p, age: a })}>{a}</button>)}
          </div>
        </div>
        <div className="field-row">
          <label>Длительность занятия</label>
          <div className="seg">
            {LENGTHS.map((l) => <button key={l.v} className={p.length === l.v ? 'on' : ''} onClick={() => setP({ ...p, length: l.v })}>{l.label}</button>)}
          </div>
          <span className="muted">Занятие можно закончить в любой момент. Для 4 лет лучше короткие занятия.</span>
        </div>
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Отмена</button>
          <button className="btn primary" disabled={!p.nickname.trim()} onClick={() => onSave({ ...p, nickname: p.nickname.trim() })}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Прогресс ----------------

function ProgressTab() {
  const app = useApp();
  const [pid, setPid] = useState(app.settings.activeProfileId ?? app.profiles[0]?.id);
  const [progress, setProgress] = useState<Record<string, ItemProgress>>({});
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [reset, setReset] = useState(false);
  const profile = app.profiles.find((p) => p.id === pid);

  const load = async () => {
    if (!pid) return;
    setProgress(await db.progressFor(pid));
    setSessions(await db.sessionsFor(pid));
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  if (!profile) return <p>Сначала добавьте ребёнка во вкладке «Дети».</p>;
  const now = Date.now();
  const due = dueSoon(progress, now, profile.sessionCount);
  const upcoming = Object.values(progress)
    .filter((p) => p.stage > 0 && !due.includes(p) && p.nextReviewAt)
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0));
  const notes = observations(progress, canHearId(app.canHear));
  const last = sessions.filter((s) => s.tasksDone > 0).slice(-1)[0];

  return (
    <>
      {app.profiles.length > 1 && (
        <div className="seg" style={{ marginBottom: 12 }}>
          {app.profiles.map((p) => <button key={p.id} className={p.id === pid ? 'on' : ''} onClick={() => setPid(p.id)}>{p.avatar} {p.nickname}</button>)}
        </div>
      )}
      <div className="card">
        <strong>{profile.avatar} {profile.nickname}</strong>
        <div className="muted">
          Занятий: {sessions.filter((s) => s.tasksDone > 0).length}
          {last && ` · последнее: ${new Date(last.startedAt).toLocaleDateString('ru-RU')} (${last.track === 'letters' ? 'буквы' : 'числа'}, заданий: ${last.tasksDone})`}
          {` · в саду: ${profile.garden.length}`}
        </div>
      </div>

      {(['letters', 'numbers'] as const).map((track) => {
        const items = availableItems(track, progress, app.isAvailable);
        const all = track === 'letters' ? LETTERS : NUMBERS;
        return (
          <div className="card" key={track}>
            <h3 style={{ marginTop: 0 }}>{track === 'letters' ? 'Буквы' : 'Числа'}</h3>
            <div className="sym-grid">
              {items.map((i) => {
                const p = progress[i.id];
                const st = stateOf(p);
                return (
                  <div key={i.id} className={`sym-cell ${st === 'mastered' ? 'ok' : st === 'learning' ? 'learn' : ''}`} title={p ? stageLabel(p) : 'ещё не знакомились'}>
                    {glyph(i)}
                    <small>{st === 'mastered' ? 'освоено' : st === 'learning' ? 'изучает' : '—'}</small>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Подготовлено уроков: {items.length} из {all.length}. Остальные появятся после подготовки и не показываются ребёнку.
            </p>
            {items.filter((i) => stateOf(progress[i.id]) === 'learning').map((i) => (
              <div key={i.id} className="muted">{glyph(i)}: {stageLabel(progress[i.id])}</div>
            ))}
          </div>
        );
      })}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Наблюдения</h3>
        {notes.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : <p className="muted">Пока мало данных. Наблюдения появятся после нескольких занятий.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Стоит повторить</h3>
        {due.length === 0 && upcoming.length === 0 && <p className="muted">Пока нечего повторять.</p>}
        <div className="row-wrap">
          {due.map((p) => <span key={p.key} className="chip learn">{glyph(ITEMS[p.itemId])} — в следующем занятии</span>)}
          {upcoming.slice(0, 8).map((p) => (
            <span key={p.key} className="chip">{glyph(ITEMS[p.itemId])} — {p.nextReviewAt! <= now + 36e5 ? 'в следующем занятии' : `с ${new Date(p.nextReviewAt!).toLocaleDateString('ru-RU')}`}</span>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>Пропуск дней не наказывается: приложение просто начнёт с повторения, не больше 3 символов за раз.</p>
      </div>

      <button className="btn danger" onClick={() => setReset(true)}>Сбросить прогресс {profile.nickname}</button>
      {reset && (
        <Confirm
          text={`Сбросить весь прогресс «${profile.nickname}»? Профиль останется, буквы, числа и сад начнутся заново.`}
          action="Сбросить"
          onNo={() => setReset(false)}
          onYes={async () => {
            await db.resetProgress(profile.id);
            await app.refresh();
            await load();
            setReset(false);
          }}
        />
      )}
    </>
  );
}

// ---------------- Звук ----------------

function SoundTab() {
  const app = useApp();
  const s = app.settings;
  useAudioVersion();
  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Речь (диктор)</h3>
        <label className="row-wrap"><input type="checkbox" checked={s.speechOn} onChange={(e) => void app.saveSettings({ speechOn: e.target.checked })} /> Включена</label>
        <label className="row-wrap">Громкость <input type="range" min={0} max={1} step={0.1} value={s.speechVolume} onChange={(e) => void app.saveSettings({ speechVolume: Number(e.target.value) })} /></label>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Музыка</h3>
        <label className="row-wrap"><input type="checkbox" checked={s.musicOn} onChange={(e) => void app.saveSettings({ musicOn: e.target.checked })} /> Включена (отдельно от речи)</label>
        <label className="row-wrap">Громкость <input type="range" min={0} max={1} step={0.1} value={s.musicVolume} onChange={(e) => void app.saveSettings({ musicVolume: Number(e.target.value) })} /></label>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>ИИ-озвучка</h3>
        <label className="row-wrap">
          <input type="checkbox" checked={s.allowAiVoice} onChange={(e) => void app.saveSettings({ allowAiVoice: e.target.checked })} />
          Использовать встроенную ИИ-озвучку, пока нет записей носителя
        </label>
        <p className="muted">Фразы сгенерированы нейросетью (Higgsfield, ElevenLabs) и работают без интернета. Произношение не проверено носителем казахского языка. Отдельные звуки согласных ([н], [т], [қ]) ИИ не озвучивает — их нужно записать диктору.</p>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Синтез речи устройства</h3>
        <p>Казахский голос на этом устройстве: {audio.hasKazakhVoice() ? <b>найден — {audio.kazakhVoiceName()}</b> : <b>не найден</b>}.</p>
        <label className="row-wrap">
          <input type="checkbox" checked={s.allowKazakhTts} onChange={(e) => void app.saveSettings({ allowKazakhTts: e.target.checked })} />
          Временно озвучивать казахским синтезом, если нет записи носителя
        </label>
        <p className="muted">Синтез не проверен носителем языка и не произносит отдельные звуки согласных. Русский голос никогда не используется вместо казахского — если озвучки нет, фраза не звучит, а Түлкі показывает её жестом.</p>
      </div>
    </>
  );
}

// ---------------- Контент и озвучка ----------------

function ContentTab() {
  const app = useApp();
  useAudioVersion();
  const [filter, setFilter] = useState<'all' | 'missing'>('missing');
  const prepared = ALL_ITEMS.filter((i) => i.status !== 'stub');
  const clips = useMemo(() => Object.values(CLIPS), []);
  const counts = clips.reduce((a, c) => ({ ...a, [audio.sourceOf(c.id)]: (a[audio.sourceOf(c.id)] ?? 0) + 1 }), {} as Record<string, number>);
  const stubs = ALL_ITEMS.filter((i) => i.status === 'stub');

  const setStatus = async (item: Item, status: ReviewStatus) => {
    await db.putContentOverride({ id: item.id, status, updatedAt: Date.now() });
    await app.refresh();
  };

  return (
    <>
      <div className={`banner ${counts.recording || counts.bundled ? 'info' : 'warn'}`}>
        <b>Статус озвучки.</b> Записи носителя: {(counts.recording ?? 0) + (counts.bundled ?? 0)} из {clips.length}. ИИ-озвучка (не проверена): {counts.ai ?? 0}. Синтез устройства: {counts.tts ?? 0}. Без звука: {counts.none ?? 0}.
        {!counts.recording && !counts.bundled && ' Проверенной записи носителя пока нет — загрузите записи ниже, они заменят ИИ-озвучку.'}
        {audio.bundledInfo.generator && <div className="muted">Встроенная ИИ-озвучка: {audio.bundledInfo.generator}. {audio.bundledInfo.note}</div>}
      </div>
      <div className="banner warn">
        <b>Все учебные тексты имеют статус «черновик»</b> и требуют проверки казахоязычным педагогом. Неподготовленные уроки ({stubs.length}: {stubs.slice(0, 10).map(glyph).join(' ')}…) детям не показываются.
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Подготовленные уроки</h3>
        <label className="row-wrap" style={{ marginBottom: 10 }}>
          <input type="checkbox" checked={app.settings.showDrafts} onChange={(e) => void app.saveSettings({ showDrafts: e.target.checked })} />
          Показывать ребёнку уроки со статусом «черновик»
        </label>
        <table className="clips">
          <tbody>
            {prepared.map((i) => (
              <tr key={i.id}>
                <td style={{ fontSize: 22, fontWeight: 700 }}>{glyph(i)}</td>
                <td>
                  {i.track === 'letters' && i.words[0] && <>{i.words[0].picture} {i.words[0].word}<br /></>}
                  {i.track === 'letters' && i.methodNote && <span className="muted">{i.methodNote}</span>}
                </td>
                <td>
                  <select value={app.statusOf(i)} onChange={(e) => void setStatus(i, e.target.value as ReviewStatus)}>
                    {(['draft', 'reviewed', 'published'] as ReviewStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Фразы и записи диктора</h3>
        <p className="muted">Загрузите запись носителя языка (mp3, m4a, ogg, wav) для каждой фразы. Записи хранятся на устройстве и работают без интернета. Название, звук, слово, инструкция и похвала записываются отдельно.</p>
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={filter === 'missing' ? 'on' : ''} onClick={() => setFilter('missing')}>Без записи</button>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Все</button>
        </div>
        <table className="clips">
          <thead><tr><th>Фраза</th><th>Тип</th><th>Источник</th><th /></tr></thead>
          <tbody>
            {clips.filter((c) => filter === 'all' || !['recording', 'bundled'].includes(audio.sourceOf(c.id))).map((c) => <ClipRow key={c.id} clip={c} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

const KIND_LABEL: Record<Clip['kind'], string> = { name: 'название', sound: 'звук', word: 'слово', instruction: 'инструкция', feedback: 'обратная связь' };
const SOURCE_LABEL = { recording: 'запись носителя', bundled: 'запись (встроенная, проверена)', ai: 'ИИ-озвучка — не проверено', tts: 'синтез устройства — не проверено', none: 'нет озвучки' };

function ClipRow({ clip }: { clip: Clip }) {
  const src = audio.sourceOf(clip.id);
  const upload = async (f: File | undefined) => {
    if (!f) return;
    await db.putRecording({ clipId: clip.id, blob: f, fileName: f.name, addedAt: Date.now() });
    await audio.reloadRecordings();
  };
  return (
    <tr>
      <td>
        <div>{clip.text}</div>
        <div className="muted" style={{ fontSize: 12 }}>{clip.id}{clip.note ? ` · ${clip.note}` : ''}</div>
      </td>
      <td>{KIND_LABEL[clip.kind]}</td>
      <td className={`src-${src === 'bundled' ? 'recording' : src === 'ai' ? 'tts' : src}`}>{SOURCE_LABEL[src]}</td>
      <td>
        <div className="row-wrap">
          <button className="btn" disabled={src === 'none'} onClick={() => void audio.play([clip.id])}>▶</button>
          <label className="btn">
            Загрузить
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
          {src === 'recording' && (
            <button className="btn danger" onClick={async () => { await db.deleteRecording(clip.id); await audio.reloadRecordings(); }}>✕</button>
          )}
        </div>
      </td>
    </tr>
  );
}

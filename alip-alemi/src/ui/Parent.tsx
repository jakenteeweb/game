import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { ALL_ITEMS, CLIPS, ITEMS, LETTERS, NUMBERS, glyph, type Clip, type Item, type ReviewStatus } from '../content';
import type { SessionLength } from '../content/curriculum';
import type { ItemProgress } from '../engine/progress';
import { availableItems } from '../engine/session';
import { dueSoon, observations, stageLabel, stateOf } from '../engine/insights';
import { db, newId, type Profile, type SessionLog } from '../storage/db';
import { canHearId, useApp } from '../state';
import { useAudioVersion } from './Mascot';

type Tab = 'kids' | 'progress' | 'sound' | 'content';
const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🦉', '🐼', '🐨', '🐯', '🦁', '🐸', '🐧', '🦄'];
const LENGTHS: { v: SessionLength; label: string }[] = [
  { v: 'short', label: '≈5 мин' },
  { v: 'normal', label: '≈6–7 мин' },
  { v: 'long', label: '≈8 мин' },
];
const STATUS_LABEL: Record<ReviewStatus, string> = { stub: 'дайын емес', draft: 'жоба', reviewed: 'тексерілді', published: 'жарияланды' };

export function Parent() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>(app.profiles.length ? 'progress' : 'kids');
  return (
    <div className="parent">
      <header>
        <div className="row">
          <h1>Ата-ана кабинеті</h1>
          <button className="btn" onClick={() => app.go(app.profile ? { name: 'home' } : app.profiles.length ? { name: 'pick' } : { name: 'welcome' })}>
            Шығу
          </button>
        </div>
        <nav className="tabs">
          {([['progress', 'Үлгерім'], ['kids', 'Балалар'], ['sound', 'Дыбыс'], ['content', 'Мазмұн']] as [Tab, string][]).map(([t, l]) => (
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
          <button className="btn" onClick={onNo}>Болдырмау</button>
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
      <div className="banner info">Профиль үшін лақап ат пен сурет жеткілікті. Шын есім, фото, камера мен микрофон қажет емес. Барлық деректер тек осы құрылғыда сақталады.</div>
      {app.profiles.map((p) => (
        <div key={p.id} className="card row-wrap">
          <span style={{ fontSize: 36 }}>{p.avatar}</span>
          <div style={{ flex: 1 }}>
            <strong>{p.nickname}</strong>
            <div className="muted">{p.age} жас · сабақ {LENGTHS.find((l) => l.v === p.length)?.label} · сабақтар: {p.sessionCount}</div>
          </div>
          <button className="btn" onClick={() => setEdit(p)}>Өзгерту</button>
          <button className="btn danger" onClick={() => setDel(p)}>Жою</button>
        </div>
      ))}
      <button className="btn primary" onClick={() => setEdit(blank())}>+ Бала қосу</button>
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
          text={`«${del.nickname}» профилін және оның барлық үлгерімін жою керек пе? Мұны қайтару мүмкін емес.`}
          action="Жою"
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
          <label htmlFor="nick">Лақап аты</label>
          <input id="nick" type="text" maxLength={20} value={p.nickname} placeholder="мысалы, Күншуақ" onChange={(e) => setP({ ...p, nickname: e.target.value })} />
        </div>
        <div className="field-row">
          <label>Сурет</label>
          <div className="avatars">
            {AVATARS.map((a) => <button key={a} className={p.avatar === a ? 'on' : ''} onClick={() => setP({ ...p, avatar: a })}>{a}</button>)}
          </div>
        </div>
        <div className="field-row">
          <label>Жасы</label>
          <div className="seg">
            {([4, 5, 6, 7] as const).map((a) => <button key={a} className={p.age === a ? 'on' : ''} onClick={() => setP({ ...p, age: a })}>{a}</button>)}
          </div>
        </div>
        <div className="field-row">
          <label>Сабақтың ұзақтығы</label>
          <div className="seg">
            {LENGTHS.map((l) => <button key={l.v} className={p.length === l.v ? 'on' : ''} onClick={() => setP({ ...p, length: l.v })}>{l.label}</button>)}
          </div>
          <span className="muted">Сабақты кез келген уақытта тоқтатуға болады. 4 жастағы балаларға қысқа сабақ қолайлы.</span>
        </div>
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Отмена</button>
          <button className="btn primary" disabled={!p.nickname.trim()} onClick={() => onSave({ ...p, nickname: p.nickname.trim() })}>Сақтау</button>
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

  const current = useRef(pid);
  current.current = pid;
  const load = async () => {
    if (!pid) return;
    const forPid = pid;
    const [pr, ss] = await Promise.all([db.progressFor(forPid), db.sessionsFor(forPid)]);
    if (current.current !== forPid) return; // пока грузилось, выбрали другого ребёнка
    setProgress(pr);
    setSessions(ss);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  if (!profile) return <p>Алдымен «Балалар» бөлімінде бала қосыңыз.</p>;
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
          Сабақтар: {sessions.filter((s) => s.tasksDone > 0).length}
          {last && ` · соңғысы: ${new Date(last.startedAt).toLocaleDateString('kk-KZ')} (${last.track === 'letters' ? 'әріптер' : 'сандар'}, тапсырмалар: ${last.tasksDone})`}
          {` · бақта: ${profile.garden.length}`}
        </div>
      </div>

      {(['letters', 'numbers'] as const).map((track) => {
        const items = availableItems(track, progress, app.isAvailable);
        const all = track === 'letters' ? LETTERS : NUMBERS;
        return (
          <div className="card" key={track}>
            <h3 style={{ marginTop: 0 }}>{track === 'letters' ? 'Әріптер' : 'Сандар'}</h3>
            <div className="sym-grid">
              {items.map((i) => {
                const p = progress[i.id];
                const st = stateOf(p);
                return (
                  <div key={i.id} className={`sym-cell ${st === 'mastered' ? 'ok' : st === 'learning' ? 'learn' : ''}`} title={p ? stageLabel(p) : 'әлі танысқан жоқ'}>
                    {glyph(i)}
                    <small>{st === 'mastered' ? 'меңгерді' : st === 'learning' ? 'үйреніп жүр' : '—'}</small>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Дайын сабақтар: {all.length} ішінен {items.length}. Қалғандары дайындалған соң қосылады, балаға әзірге көрсетілмейді.
            </p>
            {items.filter((i) => stateOf(progress[i.id]) === 'learning').map((i) => (
              <div key={i.id} className="muted">{glyph(i)}: {stageLabel(progress[i.id])}</div>
            ))}
          </div>
        );
      })}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Байқаулар</h3>
        {notes.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : <p className="muted">Әзірге дерек аз. Байқаулар бірнеше сабақтан кейін пайда болады.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Қайталау керек</h3>
        {due.length === 0 && upcoming.length === 0 && <p className="muted">Әзірге қайталайтын ештеңе жоқ.</p>}
        <div className="row-wrap">
          {due.map((p) => <span key={p.key} className="chip learn">{glyph(ITEMS[p.itemId])} — келесі сабақта</span>)}
          {upcoming.slice(0, 8).map((p) => (
            <span key={p.key} className="chip">{glyph(ITEMS[p.itemId])} — {p.nextReviewAt! <= now + 36e5 ? 'келесі сабақта' : `${new Date(p.nextReviewAt!).toLocaleDateString('kk-KZ')} бастап`}</span>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>Күн өткізіп алу айыппұлсыз: қосымша жай ғана қайталаудан бастайды, бір жолы 3 таңбадан аспайды.</p>
      </div>

      <button className="btn danger" onClick={() => setReset(true)}>{profile.nickname}: үлгерімді тазарту</button>
      {reset && (
        <Confirm
          text={`«${profile.nickname}» үлгерімін толық тазарту керек пе? Профиль сақталады, әріптер, сандар мен бақ қайтадан басталады.`}
          action="Тазарту"
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
        <h3 style={{ marginTop: 0 }}>Сөз (диктор)</h3>
        <label className="row-wrap"><input type="checkbox" checked={s.speechOn} onChange={(e) => void app.saveSettings({ speechOn: e.target.checked })} /> Қосулы</label>
        <label className="row-wrap">Дыбыс деңгейі <input type="range" min={0} max={1} step={0.1} value={s.speechVolume} onChange={(e) => void app.saveSettings({ speechVolume: Number(e.target.value) })} /></label>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Әуен</h3>
        <label className="row-wrap"><input type="checkbox" checked={s.musicOn} onChange={(e) => void app.saveSettings({ musicOn: e.target.checked })} /> Қосулы (сөзден бөлек)</label>
        <label className="row-wrap">Дыбыс деңгейі <input type="range" min={0} max={1} step={0.1} value={s.musicVolume} onChange={(e) => void app.saveSettings({ musicVolume: Number(e.target.value) })} /></label>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>ЖИ дыбыстауы</h3>
        <label className="row-wrap">
          <input type="checkbox" checked={s.allowAiVoice} onChange={(e) => void app.saveSettings({ allowAiVoice: e.target.checked })} />
          Тіл иесінің жазбалары болмаса, кірістірілген ЖИ дыбыстауын пайдалану
        </label>
        <p className="muted">Фразаларды нейрожелі жасады (Higgsfield, ElevenLabs), олар интернетсіз жұмыс істейді. Айтылуын тіл иесі әлі тексерген жоқ. Дауыссыз дыбыстарды ([н], [т], [қ]) ЖИ жеке айтпайды — оларды дикторға жаздыру керек.</p>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Құрылғының сөз синтезі</h3>
        <p>Осы құрылғыдағы қазақша дауыс: {audio.hasKazakhVoice() ? <b>табылды — {audio.kazakhVoiceName()}</b> : <b>табылмады</b>}.</p>
        <label className="row-wrap">
          <input type="checkbox" checked={s.allowKazakhTts} onChange={(e) => void app.saveSettings({ allowKazakhTts: e.target.checked })} />
          Тіл иесінің жазбасы болмаса, уақытша қазақша синтезбен дыбыстау
        </label>
        <p className="muted">Синтезді тіл иесі тексерген жоқ, ол дауыссыз дыбыстарды жеке айта алмайды. Қазақ дауысының орнына орыс дауысы ешқашан қолданылмайды: дыбыстау болмаса, фраза айтылмайды.</p>
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
        <b>Дыбыстау күйі.</b> Тіл иесінің жазбалары: {clips.length} ішінен {(counts.recording ?? 0) + (counts.bundled ?? 0)}. ЖИ дыбыстауы (тексерілмеген): {counts.ai ?? 0}. Құрылғы синтезі: {counts.tts ?? 0}. Дыбыссыз: {counts.none ?? 0}.
        {!counts.recording && !counts.bundled && ' Тіл иесінің тексерілген жазбасы әзірге жоқ — төменде жазбаларды жүктеңіз, олар ЖИ дыбыстауын алмастырады.'}
        {audio.bundledInfo.generator && <div className="muted">Кірістірілген ЖИ дыбыстауы: {audio.bundledInfo.generator}. {audio.bundledInfo.note}</div>}
      </div>
      <div className="banner warn">
        <b>Барлық оқу мәтіндері «жоба» күйінде</b> және қазақ тілді педагогтің тексеруін қажет етеді. Дайын емес сабақтар ({stubs.length}: {stubs.slice(0, 10).map(glyph).join(' ')}…) балаларға көрсетілмейді.
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Дайын сабақтар</h3>
        <label className="row-wrap" style={{ marginBottom: 10 }}>
          <input type="checkbox" checked={app.settings.showDrafts} onChange={(e) => void app.saveSettings({ showDrafts: e.target.checked })} />
          Балаға «жоба» күйіндегі сабақтарды көрсету
        </label>
        {!app.settings.showDrafts && prepared.every((i) => app.statusOf(i) === 'draft') && (
          <div className="banner warn">Барлық сабақ «жоба» күйінде — бұл белгі алынса, балаға бірде-бір сабақ көрсетілмейді. Сабақтарды «тексерілді» деп белгілеңіз немесе белгіні қайта қойыңыз.</div>
        )}
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
        <h3 style={{ marginTop: 0 }}>Фразалар және диктор жазбалары</h3>
        <p className="muted">Әр фразаға тіл иесінің жазбасын жүктеңіз (mp3, m4a, ogg, wav). Жазбалар құрылғыда сақталады және интернетсіз жұмыс істейді. Әріптің аты, дыбысы, сөз, нұсқау мен мадақ бөлек жазылады.</p>
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={filter === 'missing' ? 'on' : ''} onClick={() => setFilter('missing')}>Жазбасыз</button>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Барлығы</button>
        </div>
        <table className="clips">
          <thead><tr><th>Фраза</th><th>Түрі</th><th>Көзі</th><th /></tr></thead>
          <tbody>
            {clips.filter((c) => filter === 'all' || !['recording', 'bundled'].includes(audio.sourceOf(c.id))).map((c) => <ClipRow key={c.id} clip={c} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

const KIND_LABEL: Record<Clip['kind'], string> = { name: 'аты', sound: 'дыбысы', word: 'сөз', instruction: 'нұсқау', feedback: 'кері байланыс' };
const SOURCE_LABEL = { recording: 'тіл иесінің жазбасы', bundled: 'жазба (кірістірілген, тексерілген)', ai: 'ЖИ дыбыстауы — тексерілмеген', tts: 'құрылғы синтезі — тексерілмеген', none: 'дыбыстау жоқ' };

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
            Жүктеу
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

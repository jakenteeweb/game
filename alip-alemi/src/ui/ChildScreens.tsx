import { useEffect, useRef, useState } from 'react';
import { audio, music } from '../audio/audio';
import { useApp } from '../state';
import { Fox } from './Fox';
import { gardenSpot } from './garden';

/** Кнопка для взрослых: нужно удерживать 2 секунды, одно касание не сработает. */
export function HoldButton({ onHold, label, children }: { onHold: () => void; label: string; children: React.ReactNode }) {
  const [p, setP] = useState(0);
  const timer = useRef<number | null>(null);
  const start = () => {
    const t0 = Date.now();
    stop();
    timer.current = window.setInterval(() => {
      const v = Math.min(1, (Date.now() - t0) / 2000);
      setP(v);
      if (v >= 1) {
        stop();
        onHold();
      }
    }, 50);
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setP(0);
  };
  useEffect(() => stop, []);
  return (
    <button
      className="icon-btn small hold-btn"
      aria-label={label}
      title={label}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      {p > 0 && (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#ee8a3c" strokeWidth="3" strokeDasharray={`${p * 113} 113`} />
        </svg>
      )}
    </button>
  );
}

/** Взрослая проверка: пример на сложение с двузначным ответом и ввод цифрами. */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const make = () => {
    const a = 11 + Math.floor(Math.random() * 9);
    const b = 3 + Math.floor(Math.random() * 7);
    return { a, b };
  };
  const [q, setQ] = useState(make);
  const [val, setVal] = useState('');
  const [msg, setMsg] = useState('');
  const press = (d: string) => setVal((v) => (v + d).slice(0, 3));
  const submit = () => {
    if (Number(val) === q.a + q.b) onPass();
    else {
      setMsg('Неверно, попробуйте другой пример.');
      setQ(make());
      setVal('');
    }
  };
  return (
    <div className="modal-back">
      <div className="modal parent">
        <div className="gate">
          <strong>Для взрослых</strong>
          <div>Сколько будет {q.a} + {q.b}?</div>
          <div className="answer">{val || ' '}</div>
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
            <button onClick={() => setVal('')}>⌫</button>
            <button onClick={() => press('0')}>0</button>
            <button onClick={submit} style={{ background: '#ee8a3c', color: '#fff' }}>OK</button>
          </div>
          {msg && <div className="muted">{msg}</div>}
          <button className="btn" onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

export function ParentEntry() {
  const app = useApp();
  const [gate, setGate] = useState(false);
  return (
    <>
      <HoldButton label="Для родителей: удерживайте" onHold={() => { audio.stop(); setGate(true); }}>⚙️</HoldButton>
      {gate && <ParentGate onPass={() => { setGate(false); app.go({ name: 'parent' }); }} onCancel={() => setGate(false)} />}
    </>
  );
}

export function Welcome() {
  return (
    <div className="screen">
      <div className="topbar"><span className="spacer" /><ParentEntry /></div>
      <div className="center">
        <Fox size="big" />
        <h1 style={{ margin: 0, fontSize: 34 }}>Әріп әлемі</h1>
        <p className="muted" style={{ maxWidth: 360, fontSize: 16 }}>
          Взрослым: удерживайте ⚙️ две секунды, чтобы создать профиль ребёнка.
        </p>
      </div>
    </div>
  );
}

export function ProfilePicker() {
  const app = useApp();
  return (
    <div className="screen">
      <div className="topbar"><span className="spacer" /><ParentEntry /></div>
      <div className="center">
        <Fox />
        <div className="profiles">
          {app.profiles.map((p) => (
            <button key={p.id} className="big-btn profile-btn" onClick={() => void app.selectProfile(p.id)}>
              <span className="avatar">{p.avatar}</span>
              <span className="nick">{p.nickname}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const app = useApp();
  const profile = app.profile;
  const musicOn = app.settings.musicOn;
  useEffect(() => {
    if (musicOn) music.start();
  }, [musicOn]);
  if (!profile) return null;
  const toggleMusic = () => {
    const on = !musicOn;
    void app.saveSettings({ musicOn: on });
    if (on) music.start();
    else music.stop();
  };
  const start = (track: 'letters' | 'numbers') => app.go({ name: 'session', track, id: Date.now() });
  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label={profile.nickname} onClick={() => app.go({ name: 'pick' })}>
          <span className="avatar">{profile.avatar}</span>
        </button>
        <span className="spacer" />
        <button className={`icon-btn small ${musicOn ? '' : 'off'}`} aria-label="Музыка" onClick={toggleMusic}>{musicOn ? '🎵' : '🔇'}</button>
        <ParentEntry />
      </div>
      <div className="home-hero">
        <Fox size="big" />
      </div>
      <div className="home-tracks">
        <button className="big-btn track-card letters" onClick={() => start('letters')} aria-label="Әріптер">
          <span className="sym">Аа</span>
          <span className="label">Әріптер</span>
        </button>
        <button className="big-btn track-card numbers" onClick={() => start('numbers')} aria-label="Сандар">
          <span className="sym">123</span>
          <span className="label">Сандар</span>
        </button>
      </div>
      <button className="big-btn garden-btn" onClick={() => app.go({ name: 'garden' })} aria-label="Менің бағым">
        <span className="preview">{profile.garden.slice(-5).join('') || '🌱'}</span>
        <span>Менің бағым</span>
      </button>
    </div>
  );
}

export function Garden() {
  const app = useApp();
  const profile = app.profile;
  useEffect(() => {
    void audio.play(['c.my_garden']);
  }, []);
  if (!profile) return null;
  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Үйге" onClick={() => app.go({ name: 'home' })}>🏡</button>
        <span className="spacer" />
        <span className="avatar">{profile.avatar}</span>
      </div>
      <div className="garden">
        <span className="sun">☀️</span>
        {profile.garden.length === 0 && <div className="empty">🌱</div>}
        {profile.garden.map((g, i) => {
          const s = gardenSpot(i);
          return <span key={i} className="item" style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size }}>{g}</span>;
        })}
      </div>
    </div>
  );
}

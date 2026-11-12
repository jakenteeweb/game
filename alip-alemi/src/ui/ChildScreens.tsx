import { useEffect, useRef, useState } from 'react';
import { audio, music } from '../audio/audio';
import { useApp } from '../state';
import { Mascot } from './Mascot';
import { Icon } from './Icon';
import { gardenSpot } from './garden';
import { levelOf, levelProgress } from '../engine/stars';

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
      setMsg('Қате. Басқа мысалды шешіп көріңіз.');
      setQ(make());
      setVal('');
    }
  };
  return (
    <div className="modal-back">
      <div className="modal parent">
        <div className="gate">
          <strong>Ересектерге арналған</strong>
          <div>{q.a} + {q.b} неше болады?</div>
          <div className="answer">{val || ' '}</div>
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
            <button onClick={() => setVal('')}>⌫</button>
            <button onClick={() => press('0')}>0</button>
            <button onClick={submit} style={{ background: '#ee8a3c', color: '#fff' }}>OK</button>
          </div>
          {msg && <div className="muted">{msg}</div>}
          <button className="btn" onClick={onCancel}>Болдырмау</button>
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
      <HoldButton label="Ата-аналарға: басып тұрыңыз" onHold={() => { audio.stop(); setGate(true); }}>⚙️</HoldButton>
      {gate && <ParentGate onPass={() => { setGate(false); app.go({ name: 'parent' }); }} onCancel={() => setGate(false)} />}
    </>
  );
}

export function Welcome() {
  return (
    <div className="screen">
      <div className="topbar"><span className="spacer" /><ParentEntry /></div>
      <div className="center">
        <Mascot size="big" />
        <h1 style={{ margin: 0, fontSize: 34 }}>Әріп әлемі</h1>
        <p className="muted" style={{ maxWidth: 360, fontSize: 16 }}>
          Ересектерге: баланың профилін ашу үшін ⚙️ батырмасын екі секунд басып тұрыңыз.
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
        <Mascot />
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
    <div className="screen home-screen">
      <header className="home-header">
        <div className="brand"><span className="brand-mark">Ә</span><span>Әріп әлемі<small>Ханшайыммен бірге үйрен</small></span></div>
        <div className="home-tools">
          <button className="icon-btn small" aria-label={profile.nickname} onClick={() => app.go({ name: 'pick' })}><span className="profile-initial">{profile.nickname.slice(0, 1)}</span></button>
          <button className={`icon-btn small ${musicOn ? '' : 'off'}`} aria-label="Әуен" aria-pressed={musicOn} onClick={toggleMusic}>♪</button>
          <ParentEntry />
        </div>
      </header>
      <main className="home-content">
        <div className="home-greeting"><div><p className="eyebrow">БҮГІНГІ КІШКЕНТАЙ ЖЕҢІСІҢ</p><h1>Сәлем, {profile.nickname}!</h1></div><StarsPill stars={profile.stars ?? 0} /></div>
        <section className="learning-hero" aria-label="Ханшайыммен үйрен">
          <div className="hero-copy"><span className="lesson-badge"><span />{profile.sessionCount > 0 ? 'Жарайсың! Жалғастырайық' : 'Бірге бастайық'}</span><h2>Әріптен<br />үлкен әлемге!</h2><p>Тыңда, таңда, жаз.<br />Мен саған көмектесемін!</p><button className="continue-btn" onClick={() => start('letters')} aria-label="Оқуды жалғастыру">{profile.sessionCount > 0 ? 'Оқуды жалғастыру' : 'Оқуды бастау'}<Icon name="arrow" /></button></div>
          <div className="hero-art"><span className="floating-letter letter-a" aria-hidden="true">А</span><span className="floating-letter letter-ae" aria-hidden="true">Ә</span><span className="floating-letter letter-b" aria-hidden="true">Б</span><Mascot size="big" /><span className="mascot-caption">Сенің досың — Ханшайым</span></div>
        </section>
        <div className="section-heading"><h2>Бүгін не үйренеміз?</h2><span>Өзің таңда</span></div>
        <nav className="learning-grid" aria-label="Оқу бөлімдері">
          <button className="learning-card letter-link" onClick={() => start('letters')} aria-label="Әріптер"><span className="section-symbol">Әә</span><span className="card-copy"><strong>Әріптер</strong><small>Тыңдаймыз, оқимыз, жазамыз</small></span><Icon name="arrow" /></button>
          <button className="learning-card number-link" onClick={() => start('numbers')} aria-label="Сандар"><span className="section-symbol">123</span><span className="card-copy"><strong>Сандар</strong><small>Санаймыз, салыстырамыз</small></span><Icon name="arrow" /></button>
          <button className="learning-card games-link" onClick={() => app.go({ name: 'games' })} aria-label="Ойындар"><span className="section-symbol"><Icon name="game" /></span><span className="card-copy"><strong>Ойындар</strong><small>Ойнап үйренейік!</small></span><Icon name="arrow" /></button>
          <button className="learning-card garden-link" onClick={() => app.go({ name: 'garden' })} aria-label="Менің бағым"><span className="section-symbol"><Icon name="garden" /></span><span className="card-copy"><strong>Менің бағым</strong><small>{profile.garden.length ? `${profile.garden.length} сыйлық жинадың` : 'Әр сабақ — жаңа сыйлық'}</small></span><Icon name="arrow" /></button>
        </nav>
        <footer className="home-footer"><Icon name="garden" />Кішкентай қадамдар. Үлкен жетістіктер.</footer>
      </main>
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

/** Звёзды и уровень ребёнка. */
export function StarsPill({ stars }: { stars: number }) {
  return (
    <span className="stars-pill" aria-label={`${stars} жұлдыз`}>
      <Icon name="star" /> {stars}
      <span className="bar"><i style={{ width: `${Math.round(levelProgress(stars) * 100)}%` }} /></span>
      <span className="lvl">{levelOf(stars)}-деңгей</span>
    </span>
  );
}

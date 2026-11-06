import { useEffect, useMemo, useRef, useState } from 'react';
import { audio, chime, type Step } from '../audio/audio';
import { ITEMS, PRAISE, type LetterItem, type NumberItem } from '../content';
import { PICTURES } from '../content/pictures';
import { db } from '../storage/db';
import { useApp } from '../state';
import { Mascot } from '../ui/Mascot';
import { nextRewards } from '../ui/garden';
import { Pic } from '../tasks/objects';
import { isUnlocked, knownFor, memoryCards, rewardDue, shuffle, todayKey, type GameId, type Known, type MemoryCard } from './games';

const GAMES: { id: GameId; icon: string; title: string }[] = [
  { id: 'memory', icon: '🃏', title: 'Жұбын тап' },
  { id: 'feed', icon: '🍎', title: 'Ботақанды тамақтандыр' },
  { id: 'pop', icon: '🎈', title: 'Шарды жар' },
];

function useKnown(): Known | null {
  const app = useApp();
  const [known, setKnown] = useState<Known | null>(null);
  useEffect(() => {
    if (!app.profile) return;
    void db.progressFor(app.profile.id).then((p) => setKnown(knownFor(p)));
  }, [app.profile?.id]);
  return known;
}

/** Раздел «Ойнап үйрен»: список лёгких игр. */
export function GamesScreen() {
  const app = useApp();
  const known = useKnown();
  useEffect(() => {
    void audio.play(['c.play']);
  }, []);
  if (!known) return null;
  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Үйге" onClick={() => app.go({ name: 'home' })}>🏡</button>
        <span className="spacer" />
        <Mascot size="small" />
      </div>
      <div className="games-list">
        {GAMES.map((g) => {
          const open = isUnlocked(g.id, known);
          return (
            <button
              key={g.id}
              className={`big-btn game-card ${open ? '' : 'locked'}`}
              aria-label={g.title}
              data-game={g.id}
              onClick={() => (open ? app.go({ name: 'game', game: g.id, id: Date.now() }) : void audio.play(['c.lesson_first']))}
            >
              <span className="game-icon">{open ? g.icon : '🔒'}</span>
              <span className="label">{g.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Одна игра + спокойное завершение с наградой (не чаще раза в день на игру). */
export function GameScreen({ game }: { game: GameId }) {
  const app = useApp();
  const known = useKnown();
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState<string | null>(null);

  const finish = async () => {
    audio.stop();
    const profile = app.profile && (await db.getProfile(app.profile.id));
    let got: string | null = null;
    if (profile) {
      const today = todayKey();
      const rewards = profile.gameRewards ?? {};
      if (rewardDue(rewards[game], today)) {
        got = nextRewards(profile.garden, 1)[0];
        await db.putProfile({ ...profile, garden: [...profile.garden, got], gameRewards: { ...rewards, [game]: today } });
        await app.refresh();
      }
    }
    setReward(got);
    setDone(true);
    chime('tada');
    void audio.play([got ? 'c.garden' : PRAISE[0], { pause: 300 }, 'c.bye']);
  };

  if (!known) return null;
  if (done) {
    return (
      <div className="screen">
        <div className="center">
          <Mascot size="big" mood="cheer" />
          {reward && <div className="reward">{reward}</div>}
          <div className="row-wrap" style={{ gap: 18 }}>
            <button className="big-btn" style={{ width: 120, height: 110, fontSize: 48 }} aria-label="Үйге" onClick={() => app.go({ name: 'home' })}>🏡</button>
            <button className="big-btn" style={{ width: 120, height: 110, fontSize: 48 }} aria-label="Ойындар" onClick={() => app.go({ name: 'games' })}>🎲</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="screen">
      <div className="session-top">
        <button className="icon-btn small" aria-label="Шығу" onClick={() => app.go({ name: 'games' })}>✕</button>
        <span className="spacer" style={{ flex: 1 }} />
        <Mascot size="small" />
      </div>
      {game === 'memory' && <MemoryGame known={known} onFinish={() => void finish()} />}
      {game === 'feed' && <FeedGame known={known} onFinish={() => void finish()} />}
      {game === 'pop' && <PopGame known={known} onFinish={() => void finish()} />}
    </div>
  );
}

// ---------------- «Жұбын тап» ----------------

function CardFace({ card }: { card: MemoryCard }) {
  if (card.kind === 'glyph') return <span className="mem-glyph">{card.value}</span>;
  if (card.kind === 'picture') {
    const l = ITEMS[card.value] as LetterItem;
    return <Pic obj={l.words[0]} size={80} />;
  }
  const n = Number(card.value);
  return (
    <span className="mem-dots" aria-label={card.value}>
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </span>
  );
}

function MemoryGame({ known, onFinish }: { known: Known; onFinish: () => void }) {
  const cards = useMemo(() => memoryCards(known, Math.random), [known]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const busy = useRef(false);
  useEffect(() => {
    void audio.play(['c.memory']);
  }, []);

  const tap = (i: number) => {
    if (busy.current || open.includes(i) || matched.includes(cards[i].pair)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next.map((k) => cards[k]);
    busy.current = true;
    if (a.pair === b.pair) {
      chime('pop');
      const item = ITEMS[a.pair];
      if (item.nameClip) void audio.play([item.nameClip]);
      const m = [...matched, a.pair];
      setTimeout(() => {
        setMatched(m);
        setOpen([]);
        busy.current = false;
        if (m.length * 2 === cards.length) setTimeout(onFinish, 700);
      }, 500);
    } else {
      chime('soft');
      setTimeout(() => {
        setOpen([]);
        busy.current = false;
      }, 1000);
    }
  };

  return (
    <div className="stage">
      <div className={`memory n${cards.length}`}>
        {cards.map((c, i) => {
          const shown = open.includes(i) || matched.includes(c.pair);
          return (
            <button
              key={c.key}
              data-pair={c.pair}
              className={`mem-card ${shown ? 'open' : ''} ${matched.includes(c.pair) ? 'done' : ''}`}
              onClick={() => tap(i)}
              aria-label={shown ? c.value : 'карточка'}
            >
              {shown ? <CardFace card={c} /> : <img className="mem-back" src="img/botakan.webp" alt="" draggable={false} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- «Ботақанды тамақтандыр» ----------------

const FEED_ROUNDS = 3;

function FeedGame({ known, onFinish }: { known: Known; onFinish: () => void }) {
  const targets = useMemo(() => {
    const vals = known.numbers.map((n) => n.value);
    const out: number[] = [];
    for (let r = 0; r < FEED_ROUNDS; r++) {
      const options = vals.filter((v) => v !== out[out.length - 1]);
      out.push(shuffle(options.length ? options : vals, Math.random)[0]);
    }
    return out;
  }, [known]);
  const [round, setRound] = useState(0);
  const [given, setGiven] = useState(0);
  const n = targets[round];
  const pool = Math.max(n + 2, 5);
  const busy = useRef(false);
  const steps: Step[] = [`n.${n}.feed`];

  useEffect(() => {
    setGiven(0);
    busy.current = false;
    void audio.play(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const give = async () => {
    if (busy.current || given >= n) return;
    const g = given + 1;
    setGiven(g);
    chime('pop');
    if (g < n) {
      void audio.play([`n.${g}.name`]);
      return;
    }
    busy.current = true;
    await audio.play([`n.${g}.name`, { pause: 250 }, 'c.thanks']);
    if (round + 1 >= FEED_ROUNDS) onFinish();
    else setRound(round + 1);
  };

  return (
    <div className="stage">
      <div className="prompt-row">
        <button className="icon-btn speaker" aria-label="Тыңдау" onClick={() => void audio.play(steps)}>🔊</button>
        <span className="feed-goal">{(ITEMS[`N_${n}`] as NumberItem).digit}</span>
      </div>
      <div className="feed-scene">
        <Mascot size="big" mood={given >= n ? 'cheer' : 'calm'} bounceKey={given || undefined} />
        <div className="feed-plate" aria-label="берілді">
          {Array.from({ length: given }, (_, i) => <span key={i} className="fed"><Pic obj={PICTURES[0]} size={40} /></span>)}
        </div>
      </div>
      <div className="pile">
        {Array.from({ length: pool - given }, (_, i) => (
          <button key={`${round}-${i}`} aria-label="алма" onClick={() => void give()}><Pic obj={PICTURES[0]} size={72} /></button>
        ))}
      </div>
    </div>
  );
}

// ---------------- «Шарды жар» ----------------

const POP_ROUNDS = 4;
const COLORS = ['#e67a8f', '#7cbf7a', '#5aa9cf', '#f2a65a', '#b9a6e6', '#e8b84a'];

function PopGame({ known, onFinish }: { known: Known; onFinish: () => void }) {
  const rounds = useMemo(() => {
    return Array.from({ length: POP_ROUNDS }, (_, r) => {
      const target = known.letters[(r + Math.floor(Math.random() * known.letters.length)) % known.letters.length];
      const others = known.letters.filter((l) => l.id !== target.id).map((l) => ({ kind: 'letter' as const, id: l.id }));
      const pics = shuffle(PICTURES, Math.random).slice(0, 4).map((p) => ({ kind: 'pic' as const, id: p.id }));
      const fill = shuffle([...others, ...pics], Math.random).slice(0, 4);
      const balloons = shuffle([{ kind: 'letter' as const, id: target.id }, { kind: 'letter' as const, id: target.id }, ...fill], Math.random)
        .map((b, i) => ({ ...b, color: COLORS[(i + r) % COLORS.length], left: (i % 3) * 32 + 4 + Math.random() * 4, top: Math.floor(i / 3) * 46 + Math.random() * 8, delay: Math.random() * 2 }));
      return { target, balloons };
    });
  }, [known]);
  const [round, setRound] = useState(0);
  const [popped, setPopped] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const busy = useRef(false);
  const cur = rounds[round];
  const steps: Step[] = ['c.pop', { pause: 250 }, cur.target.nameClip!];

  useEffect(() => {
    setPopped([]);
    busy.current = false;
    void audio.play(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const tap = async (i: number) => {
    if (busy.current || popped.includes(i)) return;
    const b = cur.balloons[i];
    if (b.kind === 'letter' && b.id === cur.target.id) {
      chime('pop');
      const next = [...popped, i];
      setPopped(next);
      const left = cur.balloons.filter((x, k) => x.kind === 'letter' && x.id === cur.target.id && !next.includes(k)).length;
      if (left === 0) {
        busy.current = true;
        await audio.play([PRAISE[round % PRAISE.length]]);
        if (round + 1 >= POP_ROUNDS) onFinish();
        else setRound(round + 1);
      }
      return;
    }
    setWrong(i);
    chime('soft');
    setTimeout(() => setWrong(null), 450);
  };

  return (
    <div className="stage">
      <div className="prompt-row">
        <button className="icon-btn speaker" aria-label="Тыңдау" onClick={() => void audio.play(steps)}>🔊</button>
      </div>
      <div className="sky" data-target={cur.target.id}>
        {cur.balloons.map((b, i) => (
          <button
            key={`${round}-${i}`}
            data-opt={b.kind === 'letter' ? b.id : `pic:${b.id}`}
            className={`balloon ${popped.includes(i) ? 'popped' : ''} ${wrong === i ? 'wrong' : ''}`}
            style={{ left: `${b.left}%`, top: `${b.top}%`, animationDelay: `${b.delay}s`, width: '26%' }}
            onClick={() => void tap(i)}
            aria-label={b.kind === 'letter' ? (ITEMS[b.id] as LetterItem).upper : b.id}
          >
            <div className="b" style={{ background: b.color }}>
              {b.kind === 'letter' ? (ITEMS[b.id] as LetterItem).upper : <Pic obj={PICTURES.find((p) => p.id === b.id)} size={48} />}
            </div>
            <div className="string" />
          </button>
        ))}
      </div>
    </div>
  );
}

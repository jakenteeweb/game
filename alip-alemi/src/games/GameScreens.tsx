import { useEffect, useMemo, useRef, useState } from 'react';
import { audio, chime, type Step } from '../audio/audio';
import { ITEMS, NUMBERS, PRAISE, type LetterItem, type NumberItem } from '../content';
import { PICTURES, type Picture } from '../content/pictures';
import { db } from '../storage/db';
import { useApp } from '../state';
import { Mascot } from '../ui/Mascot';
import { nextRewards } from '../ui/garden';
import { giveStars, levelUpSteps } from '../ui/LevelToast';
import { Pic } from '../tasks/objects';
import { retryClip } from '../tasks/common';
import { WriteTask } from '../tasks/WriteTask';
import { levelOf } from '../engine/stars';
import { SYL_CONSONANTS, SYL_VOWELS } from '../content/syllables';
import {
  GAME_AREA, SOUND_LETTERS, isVowel, knownFor, letterOf, mathTask, memoryCards, missingLetter, pickSyllable, pictureOfWord,
  pictureOptions, readingWords, rewardDue, schemaOf, schemaOptions, shuffle, soundOptions, soundWords, syllableCountOptions,
  syllableOptions, todayKey, wordTiles, type GameId, type Known, type MemoryCard,
} from './games';

/** Ошибки в текущем раунде — для отчёта «Мектепке дайындық» (раунд без ошибок / с ошибками). */
let roundMisses = 0;
const noteMiss = () => { roundMisses += 1; };

const GAMES: { id: GameId; icon: string; title: string; color: string }[] = [
  { id: 'dyb', icon: '🔴', title: 'Дыбыстар', color: 'pink' },
  { id: 'syl', icon: '🔤', title: 'Буын', color: 'blue' },
  { id: 'word', icon: '🧩', title: 'Сөз құра', color: 'green' },
  { id: 'math', icon: '➕', title: 'Есеп', color: 'orange' },
  { id: 'dict', icon: '✍️', title: 'Диктант', color: 'yellow' },
  { id: 'memory', icon: '🃏', title: 'Жұбын тап', color: 'yellow' },
  { id: 'pop', icon: '🎈', title: 'Шарды жар', color: 'blue' },
  { id: 'feed', icon: '🍎', title: 'Ханшайымды тамақтандыр', color: 'green' },
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

/** Раздел «Ойындар»: все игры открыты. */
export function GamesScreen() {
  const app = useApp();
  useEffect(() => {
    void audio.play(['c.games']);
  }, []);
  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Үйге" onClick={() => app.go({ name: 'home' })}>🏡</button>
        <span className="spacer" />
        <Mascot size="small" />
      </div>
      <div className="games-list">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`big-btn game-card c-${g.color}`}
            aria-label={g.title}
            data-game={g.id}
            onClick={() => app.go({ name: 'game', game: g.id, id: Date.now() })}
          >
            <span className="game-icon">{g.icon}</span>
            <span className="label">{g.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface GameProps {
  known: Known;
  /** Раунд выигран: +1 звезда. */
  onWin: () => Promise<boolean>;
  onFinish: () => void;
}

/** Одна игра + спокойное завершение с наградой (не чаще раза в день на игру). */
export function GameScreen({ game }: { game: GameId }) {
  const app = useApp();
  const known = useKnown();
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const finishing = useRef(false);

  const alive = useRef(true);
  useEffect(() => {
    roundMisses = 0;
    return () => { alive.current = false; };
  }, []);
  /** Раунд выигран: звезда и итог для отчёта. Возвращает «новый уровень». */
  const onWin = async () => {
    // В «Жұбын тап» открывать несовпадающие карточки — часть игры, это не ошибка.
    const clean = game === 'memory' || roundMisses === 0;
    roundMisses = 0;
    if (!app.profile) return false;
    return (await giveStars(app.profile.id, 1, app.refresh, { area: GAME_AREA[game], clean })).levelUp;
  };

  const finish = async () => {
    // Ребёнок уже вышел из игры (✕ во время последней похвалы) — не завершаем за кадром.
    if (finishing.current || !alive.current) return;
    finishing.current = true;
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
  const props: GameProps = { known, onWin, onFinish: () => void finish() };
  return (
    <div className="screen">
      <div className="session-top">
        <button className="icon-btn small" aria-label="Шығу" onClick={() => app.go({ name: 'games' })}>✕</button>
        <span className="spacer" style={{ flex: 1 }} />
        <Mascot size="small" />
      </div>
      {game === 'memory' && <MemoryGame {...props} />}
      {game === 'feed' && <FeedGame {...props} />}
      {game === 'pop' && <PopGame {...props} />}
      {game === 'syl' && <SyllableGame {...props} />}
      {game === 'word' && <WordGame {...props} />}
      {game === 'math' && <MathGame {...props} level={levelOf(app.profile?.stars ?? 0)} />}
      {game === 'dict' && <DictationGame {...props} />}
      {game === 'dyb' && <SoundGame {...props} />}
    </div>
  );
}

// ---------------- Общие детали раундовых игр ----------------

/** Раунды: после победы — похвала, звезда и следующий раунд. */
function useRounds(total: number, onWin: () => Promise<boolean>, onFinish: () => void) {
  const [round, setRound] = useState(0);
  const busy = useRef(false);
  const win = async (extra: Step[] = []) => {
    if (busy.current) return;
    busy.current = true;
    chime('pop');
    const levelUp = await onWin();
    await audio.play([...extra, PRAISE[Math.floor(Math.random() * PRAISE.length)], ...levelUpSteps(levelUp)]);
    busy.current = false;
    if (round + 1 >= total) onFinish();
    else setRound(round + 1);
  };
  return { round, win, total };
}

function RoundDots({ round, total }: { round: number; total: number }) {
  return (
    <div className="dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <span key={i} className={`dot ${i < round ? 'done' : i === round ? 'now' : ''}`} />)}
    </div>
  );
}

/** Выбор из вариантов: первая ошибка — «попробуй ещё», вторая — подсказка. */
function useGameChoice(answer: string, onRight: () => void) {
  const [wrong, setWrong] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const errors = useRef(0);
  const tap = (key: string) => {
    if (right) return;
    if (key === answer) {
      setRight(key);
      setTimeout(onRight, 300);
      return;
    }
    errors.current += 1;
    noteMiss();
    setWrong(key);
    setTimeout(() => setWrong(null), 450);
    chime('soft');
    if (errors.current >= 2) {
      setHint(true);
      void audio.play(['c.hint']);
    } else void audio.play([retryClip()]);
  };
  const cls = (key: string) => ['choice', wrong === key ? 'wrong' : '', right === key ? 'right' : '', hint && key === answer && !right ? 'hint' : ''].join(' ');
  return { tap, cls };
}

function Speaker({ steps }: { steps: Step[] }) {
  return <button className="icon-btn speaker" aria-label="Тыңдау" onClick={() => void audio.play(steps)}>🔊</button>;
}

function Choices({ items, answer, onRight, size }: { items: { key: string; face: React.ReactNode; label: string }[]; answer: string; onRight: () => void; size?: 'big' | 'wide' }) {
  const { tap, cls } = useGameChoice(answer, onRight);
  return (
    <div className={`choices n${items.length} ${size ?? ''}`} data-answer={answer}>
      {items.map((it) => (
        <button key={it.key} data-opt={it.key} className={cls(it.key)} aria-label={it.label} onClick={() => tap(it.key)}>{it.face}</button>
      ))}
    </div>
  );
}

const picClip = (p: Picture) => `w.${p.id}`;
const numClip = (v: number) => `n.${v}.name`;

// ---------------- «Буын» ----------------

const SYL_PLAN = ['listen', 'build', 'read', 'listen', 'build', 'read'] as const;

function SyllableGame({ onWin, onFinish }: GameProps) {
  const { round, win, total } = useRounds(SYL_PLAN.length, onWin, onFinish);
  const kind = SYL_PLAN[round];
  return (
    <div className="stage">
      <RoundDots round={round} total={total} />
      {kind === 'listen' && <SylListen key={round} onRight={(s) => void win([s])} />}
      {kind === 'build' && <SylBuild key={round} onRight={(s) => void win([s])} />}
      {kind === 'read' && <ReadWord key={round} onRight={(s) => void win([s])} />}
    </div>
  );
}

function SylListen({ onRight }: { onRight: (clip: string) => void }) {
  const { target, options } = useMemo(() => {
    const t = pickSyllable(Math.random);
    return { target: t, options: syllableOptions(t, Math.random) };
  }, []);
  const steps: Step[] = ['c.syl_listen', { pause: 300 }, target.clip];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="prompt-row"><Speaker steps={steps} /></div>
      <Choices items={options.map((o) => ({ key: o.id, face: <span className="syl">{o.text}</span>, label: o.text }))} answer={target.id} onRight={() => onRight(target.clip)} />
    </>
  );
}

function SylBuild({ onRight }: { onRight: (clip: string) => void }) {
  const { target, cons } = useMemo(() => {
    const t = pickSyllable(Math.random);
    const others = shuffle(SYL_CONSONANTS.filter((c) => c !== t.c), Math.random).slice(0, 2);
    return { target: t, cons: shuffle([t.c, ...others], Math.random) };
  }, []);
  const [c, setC] = useState<string | null>(null);
  const [v, setV] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const errors = useRef(0);
  const steps: Step[] = ['c.syl_build', { pause: 300 }, target.clip];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (ch: string, isC: boolean) => {
    if (c && v) return;
    const ok = isC ? ch === target.c : ch === target.v;
    if (!ok) {
      errors.current += 1;
      noteMiss();
      setWrong(ch);
      setTimeout(() => setWrong(null), 450);
      chime('soft');
      void audio.play([errors.current >= 2 ? 'c.hint' : retryClip(), { pause: 200 }, target.clip]);
      return;
    }
    chime('pop');
    const nc = isC ? ch : c;
    const nv = isC ? v : ch;
    if (isC) setC(ch); else setV(ch);
    if (nc && nv) setTimeout(() => onRight(target.clip), 300);
    else { const l = letterOf(ch); if (l?.nameClip) void audio.play([l.nameClip]); }
  };
  const hintOn = errors.current >= 2;
  return (
    <>
      <div className="prompt-row"><Speaker steps={steps} /></div>
      <div className="slots" aria-label="буын" data-syl={target.c + target.v}>
        <span className={`slot ${c ? 'filled' : ''}`}>{c ?? ''}</span>
        <span className={`slot ${v ? 'filled' : ''}`}>{v ?? ''}</span>
      </div>
      <div className="tiles">
        {cons.map((ch) => (
          <button key={ch} data-tile={ch} className={`tile cons ${wrong === ch ? 'wrong' : ''} ${c === ch ? 'used' : ''} ${hintOn && !c && ch === target.c ? 'hint' : ''}`} onClick={() => tap(ch, true)}>{ch}</button>
        ))}
      </div>
      <div className="tiles">
        {SYL_VOWELS.map((ch) => (
          <button key={ch} data-tile={ch} className={`tile vow ${wrong === ch ? 'wrong' : ''} ${v === ch ? 'used' : ''} ${hintOn && !v && ch === target.v ? 'hint' : ''}`} onClick={() => tap(ch, false)}>{ch}</button>
        ))}
      </div>
    </>
  );
}

function ReadWord({ onRight }: { onRight: (clip: string) => void }) {
  const { word, options } = useMemo(() => {
    const w = shuffle(readingWords(6), Math.random)[0];
    return { word: w, options: pictureOptions(w, Math.random) };
  }, []);
  const right = pictureOfWord(word)!;
  const steps: Step[] = ['c.read_word'];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="prompt-row"><Speaker steps={steps} /><span className="word-card" data-word={word}>{word.toUpperCase()}</span></div>
      <Choices items={options.map((p) => ({ key: p.id, face: <Pic obj={p} size={96} />, label: p.word }))} answer={right.id} onRight={() => onRight(picClip(right))} />
    </>
  );
}

// ---------------- «Сөз құра» ----------------

const WORD_PLAN = ['build', 'missing', 'build', 'missing', 'build'] as const;

function WordGame({ onWin, onFinish }: GameProps) {
  const { round, win, total } = useRounds(WORD_PLAN.length, onWin, onFinish);
  const words = useMemo(() => shuffle(readingWords(5), Math.random), []);
  const word = words[round % words.length];
  const pic = pictureOfWord(word)!;
  return (
    <div className="stage">
      <RoundDots round={round} total={total} />
      {WORD_PLAN[round] === 'build'
        ? <BuildWord key={round} word={word} pic={pic} onRight={() => void win([picClip(pic)])} />
        : <MissingLetter key={round} word={word} pic={pic} onRight={() => void win([picClip(pic)])} />}
    </div>
  );
}

function BuildWord({ word, pic, onRight }: { word: string; pic: Picture; onRight: () => void }) {
  const letters = [...word.toUpperCase()];
  const tiles = useMemo(() => wordTiles(word, Math.random), [word]);
  const [filled, setFilled] = useState(0);
  const [used, setUsed] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const errors = useRef(0);
  const steps: Step[] = ['c.build_word', { pause: 200 }, picClip(pic)];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (i: number) => {
    if (filled >= letters.length || used.includes(i)) return;
    if (tiles[i] !== letters[filled]) {
      errors.current += 1;
      noteMiss();
      setWrong(i);
      setTimeout(() => setWrong(null), 450);
      chime('soft');
      if (errors.current === 3) void audio.play(['c.hint']);
      return;
    }
    chime('pop');
    const f = filled + 1;
    setFilled(f);
    setUsed([...used, i]);
    if (f >= letters.length) setTimeout(onRight, 300);
    else { const l = letterOf(tiles[i]); if (l?.nameClip) void audio.play([l.nameClip]); }
  };
  const hintIdx = errors.current >= 3 ? tiles.findIndex((t, i) => t === letters[filled] && !used.includes(i)) : -1;
  return (
    <>
      <div className="prompt-row">
        <Speaker steps={steps} />
        <button className="picture-card" aria-label={pic.word} onClick={() => void audio.play([picClip(pic)])}><Pic obj={pic} size={88} /></button>
      </div>
      <div className="slots" data-word={word}>
        {letters.map((ch, i) => <span key={i} className={`slot ${i < filled ? 'filled' : ''}`}>{i < filled ? ch : ''}</span>)}
      </div>
      <div className="tiles">
        {tiles.map((ch, i) => (
          <button key={i} data-tile={ch} className={`tile ${used.includes(i) ? 'used' : ''} ${wrong === i ? 'wrong' : ''} ${hintIdx === i ? 'hint' : ''}`} onClick={() => tap(i)}>{ch}</button>
        ))}
      </div>
    </>
  );
}

function MissingLetter({ word, pic, onRight }: { word: string; pic: Picture; onRight: () => void }) {
  const letters = [...word.toUpperCase()];
  const m = useMemo(() => missingLetter(word, Math.random), [word]);
  const [done, setDone] = useState(false);
  const steps: Step[] = ['c.missing_letter'];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="prompt-row">
        <Speaker steps={steps} />
        <button className="picture-card" aria-label={pic.word} onClick={() => void audio.play([picClip(pic)])}><Pic obj={pic} size={88} /></button>
      </div>
      <div className="slots" data-word={word}>
        {letters.map((ch, i) => <span key={i} className={`slot filled ${i === m.pos ? (done ? 'gap ok' : 'gap') : ''}`}>{i === m.pos && !done ? '?' : ch}</span>)}
      </div>
      <Choices
        items={m.options.map((u) => ({ key: u, face: <span className="syl">{u}</span>, label: u }))}
        answer={letters[m.pos]}
        onRight={() => { setDone(true); onRight(); }}
      />
    </>
  );
}

// ---------------- «Есеп» ----------------

const MATH_PLAN = ['add', 'more', 'sub', 'missing', 'add', 'sub'] as const;
const APPLE = PICTURES.find((p) => p.id === 'apple') ?? PICTURES[0];

function MathGame({ onWin, onFinish, level }: GameProps & { level: number }) {
  const { round, win, total } = useRounds(MATH_PLAN.length, onWin, onFinish);
  // Сложность фиксируется при входе: новый уровень посреди игры не подменяет решённый пример.
  const [max] = useState(() => (level >= 3 ? 20 : 10));
  const t = useMemo(() => mathTask(MATH_PLAN[round], max, Math.random), [round, max]);
  let steps: Step[];
  let show: React.ReactNode;
  if (t.kind === 'add' || t.kind === 'sub') {
    steps = [numClip(t.a), t.kind === 'add' ? 'p.plus' : 'p.minus', numClip(t.b), 'p.equals'];
    show = (
      <div className="equation" data-answer={t.answer}>
        <span>{t.a}</span><span className="op">{t.kind === 'add' ? '+' : '−'}</span><span>{t.b}</span><span className="op">=</span><span className="q">?</span>
        {t.a <= 10 && (
          <div className="eq-pics" aria-hidden="true">
            {Array.from({ length: t.a }, (_, i) => <span key={`a${i}`} className={t.kind === 'sub' && i >= t.a - t.b ? 'out' : ''}><Pic obj={APPLE} size={30} /></span>)}
            {t.kind === 'add' && <span className="plus">+</span>}
            {t.kind === 'add' && Array.from({ length: t.b }, (_, i) => <span key={`b${i}`}><Pic obj={APPLE} size={30} /></span>)}
          </div>
        )}
      </div>
    );
  } else if (t.kind === 'more') {
    steps = ['c.which_more'];
    show = null;
  } else {
    steps = ['c.missing_number'];
    const seq = (t as { seq: (number | null)[] }).seq;
    show = <div className="equation seq">{seq.map((v, i) => <span key={i} className={v === null ? 'q' : ''}>{v ?? '?'}</span>)}</div>;
  }
  useEffect(() => void audio.play(steps), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stage">
      <RoundDots round={round} total={total} />
      <div className="prompt-row"><Speaker steps={steps} /></div>
      {show}
      <Choices
        key={round}
        size={t.kind === 'more' ? 'big' : undefined}
        items={t.options.map((v) => ({ key: String(v), face: <span className="num">{v}</span>, label: String(v) }))}
        answer={String(t.answer)}
        onRight={() => void win([numClip(t.answer)])}
      />
    </div>
  );
}

// ---------------- «Диктант» ----------------

function DictationGame({ known, onWin, onFinish }: GameProps) {
  const items = useMemo(() => {
    const letters = shuffle(known.letters.filter((l) => l.strokes.length), Math.random).slice(0, 3);
    const digits = shuffle(NUMBERS.filter((n) => n.value <= 9 && n.strokes.length && known.numbers.some((k) => k.id === n.id)), Math.random).slice(0, 1);
    return [...letters, ...digits];
  }, [known]);
  const { round, win, total } = useRounds(items.length, onWin, onFinish);
  const item = items[round];
  const spec = useMemo(() => ({ uid: `dict-${round}`, type: 'write' as const, showAs: 'write' as const, itemId: item.id, track: item.track, reason: 'review' as const, options: [], seed: round }), [round, item]);
  return (
    <div className="stage">
      <RoundDots round={round} total={total} />
      <WriteTask key={round} spec={spec} steps={['c.dictation', { pause: 300 }, item.nameClip!]} setReplay={() => {}} onDone={(o) => { if (o.errors > 0 || o.hinted) noteMiss(); void win(); }} />
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

function MemoryGame({ known, onWin, onFinish }: GameProps) {
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
      void Promise.all([onWin(), item.nameClip ? audio.play([item.nameClip]) : Promise.resolve(true)])
        .then(([levelUp]) => levelUp && void audio.play(['c.level_up']));
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
              {shown ? <CardFace card={c} /> : <img className="mem-back" src="img/hanshaiym.webp" alt="" draggable={false} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- «Ханшайымды тамақтандыр» ----------------

const FEED_ROUNDS = 3;

function FeedGame({ known, onWin, onFinish }: GameProps) {
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
    const levelUp = await onWin();
    await audio.play([`n.${g}.name`, { pause: 250 }, 'c.thanks', ...levelUpSteps(levelUp)]);
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

function PopGame({ known, onWin, onFinish }: GameProps) {
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
        const levelUp = await onWin();
        await audio.play([PRAISE[round % PRAISE.length], ...levelUpSteps(levelUp)]);
        if (round + 1 >= POP_ROUNDS) onFinish();
        else setRound(round + 1);
      }
      return;
    }
    setWrong(i);
    noteMiss();
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

// ---------------- «Дыбыстар»: звуковой анализ ----------------

const DYB_PLAN = ['vc', 'syl', 'first', 'schema', 'vc', 'last', 'syl', 'schema'] as const;

function Schema({ s }: { s: string }) {
  return (
    <span className="schema" aria-hidden="true">
      {[...s].map((c, i) => <i key={i} className={c === 'д' ? 'v' : 'c'} />)}
    </span>
  );
}

function SoundGame({ onWin, onFinish }: GameProps) {
  const { round, win, total } = useRounds(DYB_PLAN.length, onWin, onFinish);
  const kind = DYB_PLAN[round];
  const words = useMemo(() => shuffle(soundWords(6), Math.random), []);
  const word = words[round % words.length];
  return (
    <div className="stage">
      <RoundDots round={round} total={total} />
      {kind === 'vc' && <VowelOrConsonant key={round} onRight={(s) => void win(s)} />}
      {kind === 'syl' && <SyllableCount key={round} pic={word} onRight={(s) => void win(s)} />}
      {(kind === 'first' || kind === 'last') && <EdgeSound key={round} pic={word} pos={kind} onRight={(s) => void win(s)} />}
      {kind === 'schema' && <SoundSchema key={round} pic={shuffle(soundWords(5), Math.random)[0]} onRight={(s) => void win(s)} />}
    </div>
  );
}

function PicButton({ pic }: { pic: Picture }) {
  return <button className="picture-card" aria-label={pic.word} onClick={() => void audio.play([picClip(pic)])}><Pic obj={pic} size={88} /></button>;
}

function VowelOrConsonant({ onRight }: { onRight: (s: Step[]) => void }) {
  const l = useMemo(() => shuffle(SOUND_LETTERS, Math.random)[0], []);
  const v = isVowel(l.lower);
  const steps: Step[] = [l.nameClip!, { pause: 300 }, 'c.vowel_or_cons'];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="prompt-row">
        <Speaker steps={steps} />
        <button className="picture-card letter-card" aria-label={l.upper} data-letter={l.upper} onClick={() => void audio.play([l.nameClip!])}>{l.upper}</button>
      </div>
      <Choices
        size="big"
        items={[
          { key: 'v', face: <span className="vc"><i className="vc-dot v" /><small>дауысты</small></span>, label: 'дауысты' },
          { key: 'c', face: <span className="vc"><i className="vc-dot c" /><small>дауыссыз</small></span>, label: 'дауыссыз' },
        ]}
        answer={v ? 'v' : 'c'}
        onRight={() => onRight([l.nameClip!, v ? 'c.vowel' : 'c.consonant'])}
      />
    </>
  );
}

function SyllableCount({ pic, onRight }: { pic: Picture; onRight: (s: Step[]) => void }) {
  const opts = useMemo(() => syllableCountOptions(pic.word), [pic]);
  const n = [...pic.word].filter((ch) => isVowel(ch)).length;
  const steps: Step[] = ['c.how_many_syl', { pause: 300 }, picClip(pic)];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="prompt-row"><Speaker steps={steps} /><PicButton pic={pic} /></div>
      <Choices
        items={opts.map((v) => ({ key: String(v), face: <span className="num">{v}</span>, label: String(v) }))}
        answer={String(n)}
        onRight={() => onRight([picClip(pic), numClip(n)])}
      />
    </>
  );
}

function EdgeSound({ pic, pos, onRight }: { pic: Picture; pos: 'first' | 'last'; onRight: (s: Step[]) => void }) {
  const opts = useMemo(() => soundOptions(pic.word, pos, Math.random), [pic, pos]);
  const right = (pos === 'first' ? pic.word[0] : pic.word[pic.word.length - 1]).toUpperCase();
  const steps: Step[] = [pos === 'first' ? 'c.first_sound' : 'c.last_sound', { pause: 300 }, picClip(pic)];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  const name = letterOf(right)?.nameClip;
  return (
    <>
      <div className="prompt-row"><Speaker steps={steps} /><PicButton pic={pic} /></div>
      <Choices
        items={opts.map((u) => ({ key: u, face: <span className="syl">{u}</span>, label: u }))}
        answer={right}
        onRight={() => onRight(name ? [name] : [])}
      />
    </>
  );
}

function SoundSchema({ pic, onRight }: { pic: Picture; onRight: (s: Step[]) => void }) {
  const opts = useMemo(() => schemaOptions(pic.word, Math.random), [pic]);
  const steps: Step[] = ['c.schema', { pause: 300 }, picClip(pic)];
  useEffect(() => void audio.play(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="prompt-row"><Speaker steps={steps} /><PicButton pic={pic} /></div>
      <div className="schema-legend"><span><i className="vc-dot v" /> дауысты</span><span><i className="vc-dot c" /> дауыссыз</span></div>
      <Choices
        size="wide"
        items={opts.map((sch) => ({ key: sch, face: <Schema s={sch} />, label: sch }))}
        answer={schemaOf(pic.word)}
        onRight={() => onRight([picClip(pic)])}
      />
    </>
  );
}

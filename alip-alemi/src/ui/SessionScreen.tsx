import { useEffect, useRef, useState } from 'react';
import { audio, chime, type Step } from '../audio/audio';
import { ITEMS, PRAISE } from '../content';
import { applyOutcome, isExposure, isIndependent, newProgress, type ItemProgress, type Outcome } from '../engine/progress';
import { adaptAfter, planSession, type SessionPlan, type TaskSpec } from '../engine/session';
import { db, newId, type Profile, type SessionLog } from '../storage/db';
import { useApp } from '../state';
import { LetterIntro, NumberIntro } from '../tasks/IntroTask';
import { ChoiceTask } from '../tasks/ChoiceTask';
import { TraceTask } from '../tasks/TraceTask';
import { WriteTask } from '../tasks/WriteTask';
import { BalloonsTask } from '../tasks/BalloonsTask';
import { BasketTask, ChooseGroupTask, CountTask } from '../tasks/NumberTasks';
import { Mascot } from './Mascot';
import { nextRewards } from './garden';
import { giveStars, levelUpSteps } from './LevelToast';

type Phase = 'greet' | 'task' | 'end';

export function SessionScreen({ track }: { track: 'letters' | 'numbers' }) {
  const app = useApp();
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('greet');
  const [praise, setPraise] = useState(0);
  const [rewards, setRewards] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const progress = useRef<Record<string, ItemProgress>>({});
  const log = useRef<SessionLog | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const done = useRef(0);
  const effort = useRef(false);
  const replay = useRef<Step[]>([]);
  const finished = useRef(false);

  // Начало занятия: номер занятия увеличиваем сразу, чтобы прерванное занятие тоже считалось отдельной встречей.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const profile = await db.getProfile(app.profile!.id);
      if (!profile || !alive) return;
      const sessionIndex = profile.sessionCount;
      const now = Date.now();
      profileRef.current = { ...profile, sessionCount: sessionIndex + 1, lastSessionAt: now };
      await db.putProfile(profileRef.current);
      progress.current = await db.progressFor(profile.id);
      const p = planSession({
        track, progress: progress.current, sessionIndex, now, length: profile.length,
        rng: Math.random, canHear: app.canHear, isAvailable: app.isAvailable, maxNew: profile.age >= 6 ? 2 : 1,
      });
      log.current = { id: newId('s'), profileId: profile.id, track, index: sessionIndex, startedAt: now, tasksDone: 0, newItemId: p.newItemId, reviewOnly: p.reviewOnly };
      await db.putSession(log.current);
      if (!alive) return;
      setPlan(p);
      const greet: Step[] = ['c.hello'];
      if (p.reviewOnly && Object.keys(progress.current).length > 0) greet.push({ pause: 300 }, 'c.review_day');
      replay.current = greet;
      await audio.play(greet);
      if (!alive) return;
      if (p.tasks.length) setPhase('task');
      else void finish(); // нечего показывать (например, все уроки скрыты) — корректно закрываем занятие
    })();
    return () => {
      alive = false;
      audio.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Перед заданием: короткая связка «Знакомимся с новым» / «Помнишь?».
  // Вычисляется сразу при отрисовке, чтобы задание не мелькало и не обрывалось до связки.
  const task: TaskSpec | undefined = plan?.tasks[index];
  const lead: string | null = phase !== 'task' || !task ? null
    : task.reason === 'new' && (task.type === 'intro' || task.type === 'numIntro') ? (track === 'letters' ? 'c.new_letter' : 'c.new_number')
    : task.reason === 'return' ? 'c.remember' : null;
  const [leadDone, setLeadDone] = useState<string | null>(null);
  useEffect(() => {
    if (!lead || !task) return;
    let alive = true;
    void audio.play([lead]).then(() => alive && setLeadDone(task.uid));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, task?.uid]);
  const showTask = phase === 'task' && task && (!lead || leadDone === task.uid);

  const finish = async () => {
    if (finished.current) return;
    const profile = profileRef.current;
    if (!profile) {
      // Занятие ещё не загрузилось — просто выходим.
      audio.stop();
      app.go({ name: 'home' });
      return;
    }
    finished.current = true;
    audio.stop();
    // Награда — за участие и старание, а не за безошибочность.
    const got = done.current > 0 ? nextRewards(profile.garden, 1 + (effort.current ? 1 : 0)) : [];
    // Звёзды могли прибавиться за время занятия — берём свежую запись.
    const fresh = (await db.getProfile(profile.id)) ?? profile;
    const updated = { ...profile, stars: fresh.stars, garden: [...profile.garden, ...got] };
    profileRef.current = updated;
    await db.putProfile(updated);
    if (log.current) await db.putSession({ ...log.current, endedAt: Date.now(), tasksDone: done.current });
    await app.refresh();
    if (done.current === 0) {
      app.go({ name: 'home' });
      return;
    }
    setRewards(got);
    setPhase('end');
    chime('tada');
    void audio.play(['c.garden', { pause: 400 }, 'c.bye']);
  };

  const onDone = async (outcome: Outcome) => {
    // Ответ, пришедший после выхода из занятия, не сохраняем.
    if (!plan || !task || busy || finished.current) return;
    setBusy(true);
    const item = ITEMS[task.itemId];
    const prev = progress.current[item.id] ?? newProgress(profileRef.current!.id, item.id, item.track);
    const next = applyOutcome(prev, outcome, {
      now: Date.now(), sessionIndex: plan.sessionIndex, isReview: task.reason !== 'new', taskType: task.type, checkAs: task.showAs,
    });
    progress.current = { ...progress.current, [item.id]: next };
    await db.putProgress(next);
    done.current += 1;
    if (log.current && !finished.current) void db.putSession({ ...log.current, tasksDone: done.current });
    if (outcome.errors > 0 && outcome.completed) effort.current = true;
    const nextPlan = adaptAfter(plan, index, task, outcome, { progress: progress.current, rng: Math.random, canHear: app.canHear, track });

    if (!isExposure(task.showAs)) {
      setPraise((x) => x + 1);
      // Звезда — за самостоятельный правильный ответ. За ошибки ничего не отнимаем.
      const levelUp = isIndependent(outcome) ? (await giveStars(profileRef.current!.id, 1, app.refresh)).levelUp : false;
      const clip = isIndependent(outcome) || Math.random() < 0.5 ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : 'c.effort';
      await audio.play([clip, ...levelUpSteps(levelUp)]);
    }
    if (finished.current) return;
    setPlan(nextPlan);
    setBusy(false);
    if (index + 1 >= nextPlan.tasks.length) await finish();
    else setIndex(index + 1);
  };

  if (phase === 'end') {
    return (
      <div className="screen">
        <div className="center">
          <Mascot size="big" mood="cheer" />
          <div className="reward">{rewards.join(' ') || '🌱'}</div>
          <div className="row-wrap" style={{ gap: 18 }}>
            <button className="big-btn" style={{ width: 120, height: 110, fontSize: 48 }} aria-label="Үйге" onClick={() => app.go({ name: 'home' })}>🏡</button>
            <button className="big-btn" style={{ width: 120, height: 110, fontSize: 48 }} aria-label="Бақ" onClick={() => app.go({ name: 'garden' })}>🌳</button>
          </div>
        </div>
      </div>
    );
  }

  const setReplay = (s: Step[]) => (replay.current = s);
  const total = plan?.tasks.length ?? 0;
  return (
    <div className="screen">
      <div className="session-top">
        <button className="icon-btn small" aria-label="Шығу" onClick={() => void finish()}>✕</button>
        <div className="dots" aria-hidden="true">
          {[...Array(total)].map((_, i) => <span key={i} className={`dot ${i < index ? 'done' : i === index ? 'now' : ''}`} />)}
        </div>
        <Mascot size="small" bounceKey={praise || undefined} />
        <button className="icon-btn small" aria-label="Қайта тыңдау" onClick={() => void audio.play(replay.current)}>🔁</button>
      </div>
      {phase === 'greet' || !showTask ? (
        <div className="center">
          <Mascot size="big" />
        </div>
      ) : (
        <>
          <div data-uid={task!.uid} data-task={task!.showAs} data-item={task!.itemId} data-reason={task!.reason} style={{ display: 'contents' }} />
          <TaskView key={task!.uid} spec={task!} onDone={(o) => void onDone(o)} setReplay={setReplay} />
        </>
      )}
    </div>
  );
}

function TaskView(props: { spec: TaskSpec; onDone: (o: Outcome) => void; setReplay: (s: Step[]) => void }) {
  switch (props.spec.showAs) {
    case 'intro': return <LetterIntro {...props} />;
    case 'numIntro': return <NumberIntro {...props} />;
    case 'recognize': case 'listen': case 'findDigit': case 'matchDigit': case 'wordMatch': return <ChoiceTask {...props} />;
    case 'trace': return <TraceTask {...props} />;
    case 'write': return <WriteTask {...props} />;
    case 'balloons': return <BalloonsTask {...props} />;
    case 'count': return <CountTask {...props} />;
    case 'basket': return <BasketTask {...props} />;
    case 'chooseGroup': return <ChooseGroupTask {...props} />;
    default: return <ChoiceTask {...props} />;
  }
}

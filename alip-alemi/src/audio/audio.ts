// Единый аудиоканал: новая фраза всегда останавливает предыдущую, звук не накладывается.
// Источники по приоритету: запись носителя (загружена родителем) → проверенная запись в составе приложения →
// ИИ-озвучка в составе приложения (Higgsfield; помечается как непроверенная) →
// синтез речи устройства с казахским голосом (тоже непроверенный) → без звука.
// Русский голос никогда не используется как замена.
import { CLIPS } from '../content';
import { db, type Settings } from '../storage/db';

export type ClipSource = 'recording' | 'bundled' | 'ai' | 'tts' | 'none';
export type Step = string | { pause: number };

type Listener = () => void;

class AudioManager {
  private gen = 0;
  private el: HTMLAudioElement | null = null;
  private recordings = new Map<string, string>(); // clipId -> objectURL
  private bundled: Record<string, string> = {};
  /** Встроенные записи проверены носителем языка? ИИ-озвучка — нет. */
  private bundledVerified = false;
  /** Встроенные записи живого голоса (например, буквы, прочитанные ребёнком). */
  private bundledNative = new Set<string>();
  bundledInfo: { generator?: string; note?: string } = {};
  private kkVoice: SpeechSynthesisVoice | null = null;
  private settings: Pick<Settings, 'speechOn' | 'speechVolume' | 'allowKazakhTts' | 'allowAiVoice'> = { speechOn: true, speechVolume: 1, allowKazakhTts: true, allowAiVoice: true };
  private listeners = new Set<Listener>();
  /** Какая фраза сейчас «звучит» (для визуальной подсказки, даже если звука нет). */
  speaking: string | null = null;
  ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;
    this.detectVoice();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => this.detectVoice());
    try {
      const res = await fetch('audio/kk/manifest.json');
      if (res.ok) {
        const m = await res.json();
        this.bundled = m.files ?? {};
        this.bundledVerified = m.verified === true;
        this.bundledNative = new Set<string>(m.native ?? []);
        this.bundledInfo = { generator: m.generator, note: m.note };
      }
    } catch { /* офлайн без манифеста — просто нет встроенных записей */ }
    await this.reloadRecordings();
  }

  private detectVoice() {
    if (typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    this.kkVoice = voices.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('kk')) ?? null;
    this.emit();
  }

  async reloadRecordings() {
    for (const url of this.recordings.values()) URL.revokeObjectURL(url);
    this.recordings.clear();
    try {
      for (const r of await db.listRecordings()) this.recordings.set(r.clipId, URL.createObjectURL(r.blob));
    } catch { /* нет IndexedDB */ }
    this.emit();
  }

  configure(s: Pick<Settings, 'speechOn' | 'speechVolume' | 'allowKazakhTts' | 'allowAiVoice'>) {
    this.settings = s;
    this.emit();
  }

  hasKazakhVoice() {
    return !!this.kkVoice;
  }
  kazakhVoiceName() {
    return this.kkVoice ? `${this.kkVoice.name} (${this.kkVoice.lang})` : null;
  }

  sourceOf(clipId: string): ClipSource {
    if (this.recordings.has(clipId)) return 'recording';
    const parts = CLIPS[clipId]?.parts;
    if (parts && !this.bundled[clipId]) {
      // Составная фраза: звучит, если звучат все её части; источник — «худший» из частей.
      const order: ClipSource[] = ['none', 'tts', 'ai', 'bundled', 'recording'];
      return parts.map((p) => this.sourceOf(p)).reduce((a, b) => (order.indexOf(a) <= order.indexOf(b) ? a : b), 'recording' as ClipSource);
    }
    if (this.bundled[clipId]) {
      if (this.bundledVerified || this.bundledNative.has(clipId)) return 'bundled';
      if (this.settings.allowAiVoice) return 'ai';
    }
    const clip = CLIPS[clipId];
    if (clip?.ttsAllowed && this.kkVoice && this.settings.allowKazakhTts) return 'tts';
    return 'none';
  }

  /** Можно ли воспроизвести фразу звуком. */
  canPlay(clipId: string) {
    return this.sourceOf(clipId) !== 'none';
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  /** Остановить всё, что звучит. */
  stop() {
    this.gen++;
    this.halt();
    this.speaking = null;
    this.emit();
  }

  private halt() {
    if (this.el) {
      this.el.pause();
      this.el.src = '';
      this.el = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Проиграть последовательность фраз. Предыдущая последовательность прерывается. */
  async play(steps: Step[]): Promise<boolean> {
    await this.ready;
    const my = ++this.gen;
    this.halt();
    for (const step of steps) {
      if (my !== this.gen) return false;
      if (typeof step !== 'string') {
        await wait(step.pause);
        continue;
      }
      this.speaking = step;
      this.emit();
      await this.playOne(step, my);
    }
    if (my === this.gen) {
      this.speaking = null;
      this.emit();
    }
    return my === this.gen;
  }

  private async playOne(clipId: string, my: number): Promise<void> {
    const clip = CLIPS[clipId];
    // Составная фраза без своей записи — проигрываем части подряд (живое название буквы + «әрпін тап»).
    if (clip?.parts && !this.recordings.has(clipId) && !this.bundled[clipId]) {
      for (const part of clip.parts) {
        if (my !== this.gen) return;
        await this.playOne(part, my);
      }
      return;
    }
    const src = this.sourceOf(clipId);
    const silentMs = Math.max(700, (clip?.text.length ?? 6) * 55);
    if (!this.settings.speechOn || src === 'none') return wait(this.settings.speechOn ? silentMs : 350);

    if (src === 'recording' || src === 'bundled' || src === 'ai') {
      const url = src === 'recording' ? this.recordings.get(clipId)! : `audio/kk/${this.bundled[clipId]}`;
      return new Promise((resolve) => {
        const el = new Audio(url);
        el.volume = this.settings.speechVolume;
        this.el = el;
        const done = () => resolve();
        el.onended = done;
        el.onerror = done;
        el.play().catch(done);
        // Страховка, если событие окончания не придёт.
        setTimeout(() => my === this.gen && done(), 15000);
      });
    }
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(clip.text);
      u.voice = this.kkVoice;
      u.lang = this.kkVoice!.lang;
      u.rate = 0.85;
      u.volume = this.settings.speechVolume;
      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };
      u.onend = done;
      u.onerror = done;
      speechSynthesis.speak(u);
      setTimeout(done, silentMs * 3 + 2000);
    });
  }
}

export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export const audio = new AudioManager();

// ---------- Фоновая музыка (отдельно от речи) ----------

class Music {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: number | null = null;
  private volume = 0.3;
  on = false;

  setVolume(v: number) {
    this.volume = v;
    if (this.gain) this.gain.gain.value = v * 0.12;
  }

  start() {
    if (this.on) return;
    this.on = true;
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume * 0.12;
      this.gain.connect(this.ctx.destination);
      // Спокойная пентатоника, медленно.
      const notes = [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440];
      let i = 0;
      const tick = () => {
        if (!this.ctx || !this.gain) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = notes[i++ % notes.length] / 2;
        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(1, t + 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
        o.connect(g).connect(this.gain);
        o.start(t);
        o.stop(t + 2.8);
      };
      tick();
      this.timer = window.setInterval(tick, 1400);
    } catch {
      this.on = false;
    }
  }

  stop() {
    this.on = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.gain?.disconnect();
    this.gain = null;
  }
}

export const music = new Music();

// ---------- Короткие звуковые эффекты (не речь) ----------
let sfxCtx: AudioContext | null = null;
let sfxOn = true;
export function setSfx(on: boolean) {
  sfxOn = on;
}
export function chime(kind: 'pop' | 'soft' | 'tada') {
  if (!sfxOn) return;
  try {
    sfxCtx ??= new AudioContext();
    const ctx = sfxCtx;
    void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    o.type = 'triangle';
    const f = kind === 'pop' ? 660 : kind === 'tada' ? 784 : 330;
    o.frequency.setValueAtTime(f, t);
    if (kind !== 'soft') o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.12);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.32);
  } catch { /* без звука */ }
}

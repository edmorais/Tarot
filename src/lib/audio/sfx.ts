// Small synthesised sound set: no audio files needed, works offline.
import { settings } from '../state/settings.svelte';

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (!settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch {
    return null;
  }
}

function noise(opts: { at?: number; dur: number; freq: number; q?: number; gain: number; type?: BiquadFilterType; sweep?: number }) {
  const c = ac();
  if (!c || !noiseBuf) return;
  const t = c.currentTime + (opts.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? 'bandpass';
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + opts.dur);
  f.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + Math.min(0.012, opts.dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t, Math.random() * 0.5);
  src.stop(t + opts.dur + 0.05);
}

function tone(freq: number, at: number, dur: number, gain: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  for (const [mult, g0] of [[1, 1], [2.76, 0.35], [5.4, 0.12]] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * g0, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mult);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur);
  }
}

export const sfx = {
  /** riffle: a rapid series of card clicks */
  riffle(count = 26, span = 0.45) {
    for (let i = 0; i < count; i++) {
      noise({ at: (i / count) * span + Math.random() * 0.01, dur: 0.035, freq: 2400 + Math.random() * 1800, q: 1.4, gain: 0.08 });
    }
    noise({ at: span, dur: 0.09, freq: 900, q: 0.7, gain: 0.12 });
  },
  slide() {
    noise({ dur: 0.22, freq: 1800, sweep: 700, q: 0.6, gain: 0.06 });
  },
  deal() {
    noise({ dur: 0.16, freq: 3200, sweep: 1200, q: 0.9, gain: 0.07 });
    noise({ at: 0.14, dur: 0.05, freq: 700, q: 1, gain: 0.08 });
  },
  flip() {
    noise({ dur: 0.18, freq: 1200, sweep: 4200, q: 0.8, gain: 0.08 });
    noise({ at: 0.32, dur: 0.06, freq: 600, q: 1, gain: 0.1 });
  },
  tick() {
    noise({ dur: 0.02, freq: 4200, q: 2, gain: 0.03 });
  },
  chime() {
    tone(523.25, 0, 2.4, 0.05);
    tone(783.99, 0.12, 2.2, 0.035);
    tone(1046.5, 0.24, 2.0, 0.025);
  },
};

export function haptic(pattern: number | number[]) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

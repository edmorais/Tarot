// A quiet, synthesised soundscape for each table: a soft drone chord plus a
// texture of its own. Nothing is downloaded, and it starts only after the
// person has touched the page (browsers block sound before that).
import type { ThemeId } from '../data/themes';

interface Running {
  theme: ThemeId;
  stop: () => void;
}

let ctx: AudioContext | null = null;
let running: Running | null = null;
let wanted: ThemeId | null = null;
let noise: AudioBuffer | null = null;

const CHORDS: Record<ThemeId, number[]> = {
  velvet: [110, 130.81, 164.81, 220],         // A minor, warm and low
  starry: [164.81, 246.94, 329.63, 369.99],   // E with an added ninth, open and high
  parchment: [146.83, 220, 293.66, 369.99],   // D major, daylight
  stone: [65.41, 98, 130.81, 196],            // C fifths, a cool drone
};

function context() {
  try {
    ctx ??= new AudioContext();
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch {
    return null;
  }
}

function start(theme: ThemeId): Running | null {
  const c = context();
  if (!c || !noise) return null;
  const now = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.5, now + 4);
  master.connect(c.destination);

  const nodes: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];

  // drone: detuned voices through a slowly breathing low-pass filter
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = theme === 'starry' ? 1400 : 650;
  filter.Q.value = 0.6;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = c.createGain();
  lfoGain.gain.value = theme === 'starry' ? 500 : 220;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  nodes.push(lfo);
  filter.connect(master);
  for (const f of CHORDS[theme]) {
    for (const det of [-4, 4]) {
      const o = c.createOscillator();
      o.type = theme === 'stone' ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = det;
      const g = c.createGain();
      g.gain.value = 0.012;
      o.connect(g).connect(filter);
      o.start();
      nodes.push(o);
    }
  }

  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const burst = (at: number, dur: number, freq: number, q: number, gain: number) => {
    const s = c.createBufferSource();
    s.buffer = noise;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(bp).connect(g).connect(master);
    s.start(at, Math.random());
    s.stop(at + dur + 0.05);
  };

  if (theme === 'velvet') {
    // candle crackle: small irregular ticks, now and then a soft pop
    const crackle = () => {
      const t = c.currentTime + 0.02;
      burst(t, 0.02 + Math.random() * 0.03, 2500 + Math.random() * 2500, 1.2, 0.006 + Math.random() * 0.01);
      if (Math.random() < 0.08) burst(t + 0.03, 0.08, 900, 0.8, 0.02);
      later(60 + Math.random() * 380, crackle);
    };
    crackle();
  } else if (theme === 'stone') {
    // a drip in a cool room, with two fading echoes
    const drip = () => {
      const t = c.currentTime + 0.05;
      for (const [k, delay] of [[1, 0], [0.35, 0.32], [0.12, 0.64]] as const) {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(1100, t + delay);
        o.frequency.exponentialRampToValueAtTime(380, t + delay + 0.12);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.exponentialRampToValueAtTime(0.03 * k, t + delay + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.25);
        o.connect(g).connect(master);
        o.start(t + delay);
        o.stop(t + delay + 0.3);
      }
      later(3500 + Math.random() * 6000, drip);
    };
    later(2000, drip);
  } else if (theme === 'starry') {
    // distant chimes on a pentatonic scale, swelling in and out
    const notes = [987.77, 1108.73, 1244.51, 1479.98, 1661.22, 1975.53];
    const chime = () => {
      const t = c.currentTime + 0.05;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.008, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 5.2);
      later(1800 + Math.random() * 3500, chime);
    };
    later(1500, chime);
  } else {
    // soft wind past the window
    const s = c.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.9;
    const sweep = c.createOscillator();
    sweep.frequency.value = 0.07;
    const sweepGain = c.createGain();
    sweepGain.gain.value = 260;
    sweep.connect(sweepGain).connect(bp.frequency);
    const g = c.createGain();
    g.gain.value = 0.035;
    s.connect(bp).connect(g).connect(master);
    s.start();
    sweep.start();
    nodes.push(s, sweep);
  }

  return {
    theme,
    stop() {
      for (const id of timers) clearTimeout(id);
      timers.length = 0;
      const t = c.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      setTimeout(() => {
        for (const n of nodes) {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        }
        master.disconnect();
      }, 1700);
    },
  };
}

/** Play the ambience for a table, or none (null). Safe to call often. */
export function setAmbience(theme: ThemeId | null) {
  wanted = theme;
  if (running && running.theme === theme) return;
  running?.stop();
  running = null;
  if (!theme) return;
  const c = context();
  if (!c) return;
  if (c.state === 'suspended') {
    // wait for the first touch or click: browsers forbid sound before it
    const resume = () => {
      void c.resume().then(() => {
        if (wanted && !running) running = start(wanted);
      });
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    return;
  }
  running = start(theme);
}

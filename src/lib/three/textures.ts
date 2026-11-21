import * as THREE from 'three';
import { mulberry32 } from '../story/rng';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tex(c: HTMLCanvasElement, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// ───────────────────────── Table surfaces ─────────────────────────

export type TablePattern = 'velvet' | 'stars' | 'parchment' | 'stone';

export function tableTexture(pattern: TablePattern, base: string, accent: string): THREE.Texture {
  const S = 512;
  const [c, g] = canvas(S, S);
  const rng = mulberry32(42);
  const [r, gg, b] = hexToRgb(base);
  const img = g.createImageData(S, S);
  const d = img.data;
  const grain = pattern === 'velvet' ? 14 : pattern === 'stars' ? 8 : pattern === 'parchment' ? 18 : 22;
  for (let y = 0; y < S; y++) {
    // velvet nap: soft horizontal banding
    const band = pattern === 'velvet' ? Math.sin(y * 0.11 + Math.sin(y * 0.013) * 3) * 4 : 0;
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const n = (rng() - 0.5) * grain + band;
      d[i] = r + n;
      d[i + 1] = gg + n;
      d[i + 2] = b + n;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const wrapDraw = (fn: (ox: number, oy: number) => void) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy);
  };

  if (pattern === 'stars') {
    for (let k = 0; k < 260; k++) {
      const x = rng() * S, y = rng() * S, big = rng() < 0.06;
      const rad = big ? 1.6 + rng() : 0.4 + rng() * 0.7;
      g.fillStyle = `rgba(220,226,255,${big ? 0.75 : 0.25 + rng() * 0.35})`;
      wrapDraw((ox, oy) => { g.beginPath(); g.arc(x + ox, y + oy, rad, 0, Math.PI * 2); g.fill(); });
    }
    g.strokeStyle = 'rgba(190,200,255,0.10)';
    g.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      let x = rng() * S, y = rng() * S;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (rng() - 0.5) * 120; y += (rng() - 0.5) * 120; g.lineTo(x, y); }
      g.stroke();
    }
  } else if (pattern === 'parchment') {
    for (let k = 0; k < 40; k++) {
      const x = rng() * S, y = rng() * S, rad = 30 + rng() * 90;
      wrapDraw((ox, oy) => {
        const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        grd.addColorStop(0, `rgba(120,85,40,${0.05 + rng() * 0.05})`);
        grd.addColorStop(1, 'rgba(120,85,40,0)');
        g.fillStyle = grd; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      });
    }
    g.strokeStyle = 'rgba(90,60,30,0.07)';
    for (let k = 0; k < 300; k++) {
      const x = rng() * S, y = rng() * S, l = 6 + rng() * 22, a = rng() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  } else if (pattern === 'stone') {
    const [ar, ag, ab] = hexToRgb(accent);
    for (let k = 0; k < 9; k++) {
      let x = rng() * S, y = rng() * S;
      g.strokeStyle = `rgba(${ar},${ag},${ab},${0.10 + rng() * 0.14})`;
      g.lineWidth = 0.6 + rng() * 1.6;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 60; s++) { x += 6 + rng() * 4; y += (rng() - 0.5) * 9; g.lineTo(x % (S * 2), y); }
      g.stroke();
    }
    for (let k = 0; k < 60; k++) {
      const x = rng() * S, y = rng() * S, rad = 20 + rng() * 70;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(0,0,0,${rng() * 0.08})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  } else {
    // velvet: crushed highlights
    for (let k = 0; k < 70; k++) {
      const x = rng() * S, y = rng() * S, rad = 20 + rng() * 60;
      wrapDraw((ox, oy) => {
        const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        const a = (rng() - 0.4) * 0.07;
        grd.addColorStop(0, a > 0 ? `rgba(255,220,230,${a})` : `rgba(0,0,0,${-a * 2})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      });
    }
  }
  return tex(c, pattern === 'velvet' ? 10 : 5);
}

// ───────────────────────── Card backs ─────────────────────────

export const CARD_PX = { w: 600, h: 1050 };

function paperNoise(g: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 7) {
  const rng = mulberry32(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, points = 8, inner = 0.38) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

function roundRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function backRWS(): HTMLCanvasElement {
  const { w, h } = CARD_PX;
  const [c, g] = canvas(w, h);
  const gold = '#d8b66a';
  // night-blue field
  const grd = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, h * 0.7);
  grd.addColorStop(0, '#26306a');
  grd.addColorStop(1, '#0e1230');
  g.fillStyle = '#0c0f28';
  g.fillRect(0, 0, w, h);
  roundRectPath(g, 26, 26, w - 52, h - 52, 18);
  g.fillStyle = grd;
  g.fill();
  // star lattice
  g.fillStyle = 'rgba(216,182,106,0.55)';
  for (let y = 70; y < h - 50; y += 56) {
    for (let x = 60 + ((y / 56) % 2) * 28; x < w - 40; x += 56) {
      star(g, x, y, 7, 4, 0.3);
      g.fill();
    }
  }
  // central medallion
  g.save();
  g.translate(w / 2, h / 2);
  g.fillStyle = '#0e1230';
  g.beginPath(); g.arc(0, 0, 170, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gold; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, 170, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, 0, 158, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r1 = 70, r2 = i % 2 ? 120 : 145;
    g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); g.stroke();
  }
  g.fillStyle = gold;
  g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0e1230';
  g.beginPath(); g.arc(18, -8, 54, 0, Math.PI * 2); g.fill();
  g.fillStyle = gold;
  star(g, -14, 4, 14, 5, 0.45); g.fill();
  g.restore();
  // frames
  g.strokeStyle = gold;
  g.lineWidth = 4;
  roundRectPath(g, 40, 40, w - 80, h - 80, 14); g.stroke();
  g.lineWidth = 1.5;
  roundRectPath(g, 52, 52, w - 104, h - 104, 10); g.stroke();
  for (const [x, y] of [[52, 52], [w - 52, 52], [52, h - 52], [w - 52, h - 52]]) {
    g.fillStyle = gold; star(g, x, y, 16, 8, 0.4); g.fill();
  }
  paperNoise(g, w, h, 16, 3);
  return c;
}

export function backMarseille(): HTMLCanvasElement {
  const { w, h } = CARD_PX;
  const [c, g] = canvas(w, h);
  const red = '#a3352b', blue = '#2c4d83', cream = '#efe2c2';
  g.fillStyle = cream;
  g.fillRect(0, 0, w, h);
  // diamond lattice
  g.save();
  roundRectPath(g, 44, 44, w - 88, h - 88, 8);
  g.clip();
  g.strokeStyle = red;
  g.lineWidth = 5;
  const step = 52;
  for (let k = -h; k < w + h; k += step) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke();
    g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke();
  }
  g.fillStyle = blue;
  for (let y = 0; y < h + step; y += step) {
    for (let x = 0; x < w + step; x += step) {
      const ox = (Math.round(y / step) % 2) * (step / 2);
      g.beginPath(); g.arc(x + ox + 13, y + step / 2 - 13, 5, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
  g.strokeStyle = blue; g.lineWidth = 10;
  roundRectPath(g, 38, 38, w - 76, h - 76, 10); g.stroke();
  g.strokeStyle = red; g.lineWidth = 2.5;
  roundRectPath(g, 26, 26, w - 52, h - 52, 14); g.stroke();
  // woodcut wear
  paperNoise(g, w, h, 34, 11);
  const rng = mulberry32(5);
  g.fillStyle = 'rgba(239,226,194,0.5)';
  for (let k = 0; k < 900; k++) g.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 2);
  return c;
}

export function cardBackTexture(deck: string): THREE.Texture {
  const c = deck === 'marseille' ? backMarseille() : backRWS();
  const t = tex(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ───────────────────────── Glow & dust ─────────────────────────

export function glowTexture(): THREE.Texture {
  const [c, g] = canvas(256, 256);
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,230,170,0.95)');
  grd.addColorStop(0.45, 'rgba(255,200,110,0.35)');
  grd.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = tex(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function dotTexture(): THREE.Texture {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = tex(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

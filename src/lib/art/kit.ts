// Vector art kit shared by the original decks. Everything is drawn in a local box
// centred on (0,0), roughly ±120 units, using four style classes that each
// deck styles differently:
//   ln – line only          fl – main filled shape
//   hl – secondary fill     ac – solid accent
// Celestial renders these as gold line art; Art Nouveau as inked pastel glass.

/** tn (thin rule), pa (pale panel) and gd (gold leaf) are used by the frames only */
export type Cls = 'ln' | 'fl' | 'hl' | 'ac' | 'tn' | 'pa' | 'gd';
type P = [number, number];

const n = (v: number) => +v.toFixed(1);
const pts = (ps: P[]) => ps.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

export const g = (inner: string, t = '') => `<g${t ? ` transform="${t}"` : ''}>${inner}</g>`;
export const circle = (cx: number, cy: number, r: number, c: Cls = 'ln') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" class="${c}"/>`;
export const ellipse = (cx: number, cy: number, rx: number, ry: number, c: Cls = 'ln', rot = 0) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" class="${c}"${rot ? ` transform="rotate(${n(rot)} ${n(cx)} ${n(cy)})"` : ''}/>`;
export const line = (x1: number, y1: number, x2: number, y2: number, c: Cls = 'ln') =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="${c}"/>`;
export const path = (d: string, c: Cls = 'ln') => `<path d="${d}" class="${c}"/>`;
export const poly = (ps: P[], c: Cls = 'fl') => `<polygon points="${pts(ps)}" class="${c}"/>`;
export const polyline = (ps: P[], c: Cls = 'ln') => `<polyline points="${pts(ps)}" class="${c}"/>`;
export const rect = (x: number, y: number, w: number, h: number, c: Cls = 'fl', r = 0) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${r ? ` rx="${r}"` : ''} class="${c}"/>`;

export function starPts(cx: number, cy: number, r: number, inner = 0.42, points = 8, rot = -90): P[] {
  const out: P[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((i / (points * 2)) * 360 + rot) * (Math.PI / 180);
    const rr = i % 2 ? r * inner : r;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}
export const star = (cx: number, cy: number, r: number, c: Cls = 'ac', points = 8, inner = 0.42, rot = -90) =>
  poly(starPts(cx, cy, r, inner, points, rot), c);

export function rays(cx: number, cy: number, r1: number, r2: number, count: number, c: Cls = 'ln', alt = 0, offset = 0) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = ((i / count) * 360 + offset) * (Math.PI / 180);
    const r = alt && i % 2 ? r2 - alt : r2;
    s += line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
  }
  return s;
}

/** rays over the upper half only, as for a sun on the horizon */
export function halfRays(cx: number, cy: number, r1: number, r2: number, count: number) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = Math.PI + ((i + 0.5) / count) * Math.PI;
    const r = i % 2 ? r2 - 6 : r2;
    s += line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 'ln');
  }
  return s;
}

export function petals(cx: number, cy: number, dist: number, len: number, w: number, count: number, c: Cls = 'fl', offset = 0) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 360 + offset;
    const rad = (a * Math.PI) / 180;
    s += ellipse(cx + Math.cos(rad) * dist, cy + Math.sin(rad) * dist, len, w, c, a);
  }
  return s;
}

export const rose = (cx: number, cy: number, r: number) =>
  petals(cx, cy, r * 0.55, r * 0.55, r * 0.38, 5, 'fl', -90) + circle(cx, cy, r * 0.32, 'ac');

export function crescent(cx: number, cy: number, r: number, c: Cls = 'fl', dir = 1) {
  // outer arc then inner arc, horns pointing right when dir = 1
  const t = r * 0.62;
  return path(
    `M${n(cx + dir * r * 0.35)} ${n(cy - r * 0.94)} A${n(r)} ${n(r)} 0 1 ${dir > 0 ? 0 : 1} ${n(cx + dir * r * 0.35)} ${n(cy + r * 0.94)} A${n(t * 1.25)} ${n(t * 1.25)} 0 1 ${dir > 0 ? 1 : 0} ${n(cx + dir * r * 0.35)} ${n(cy - r * 0.94)}Z`,
    c,
  );
}

export function leaf(x: number, y: number, len: number, angle: number, c: Cls = 'hl') {
  const r = (angle * Math.PI) / 180;
  const tx = x + Math.cos(r) * len, ty = y + Math.sin(r) * len;
  const nx = -Math.sin(r) * len * 0.32, ny = Math.cos(r) * len * 0.32;
  const mx = (x + tx) / 2, my = (y + ty) / 2;
  return path(`M${n(x)} ${n(y)} Q${n(mx + nx)} ${n(my + ny)} ${n(tx)} ${n(ty)} Q${n(mx - nx)} ${n(my - ny)} ${n(x)} ${n(y)}Z`, c);
}

// ───────────────────────── suits ─────────────────────────
// Each suit symbol is ~100 units tall, centred on the origin.

export function wand(): string {
  return (
    line(0, -44, 0, 50, 'ln') +
    rect(-5, -46, 10, 96, 'fl', 5) +
    circle(0, 50, 6, 'ac') +
    leaf(0, -10, 26, -35) +
    leaf(0, 12, 24, 210) +
    leaf(0, 30, 20, -30) +
    star(0, -54, 11, 'ac', 4, 0.35)
  );
}

export function cup(): string {
  return (
    path('M-34 -40 L34 -40 Q32 4 0 12 Q-32 4 -34 -40Z', 'fl') +
    path('M-34 -40 Q0 -30 34 -40', 'ln') +
    rect(-4, 12, 8, 22, 'fl') +
    ellipse(0, 22, 9, 4, 'ac') +
    path('M-26 46 Q0 30 26 46Z', 'fl') +
    circle(0, -18, 6, 'ac')
  );
}

export function sword(): string {
  return (
    poly([[0, -56], [8, -40], [7, 18], [-7, 18], [-8, -40]], 'fl') +
    line(0, -44, 0, 14, 'ln') +
    rect(-28, 18, 56, 8, 'fl', 4) +
    rect(-4, 26, 8, 20, 'hl') +
    circle(0, 51, 7, 'ac')
  );
}

export function pentacle(): string {
  const p = starPts(0, 0, 32, 0.38, 5, -90);
  const outer = [0, 2, 4, 6, 8].map((i) => p[i]);
  const pentagram = [outer[0], outer[2], outer[4], outer[1], outer[3], outer[0]];
  return circle(0, 0, 44, 'fl') + circle(0, 0, 38, 'ln') + polyline(pentagram, 'ln') + circle(0, 0, 5, 'ac');
}

export const SUIT_SYMBOL = { wands: wand, cups: cup, swords: sword, pentacles: pentacle } as const;

// ───────────────────────── astrological glyphs ─────────────────────────
// Drawn in a ±16 box. Golden Dawn attributions for the Major Arcana;
// the minors carry their suit's element.

const tri = (down: boolean, bar: boolean) =>
  poly(down ? [[-14, -11], [14, -11], [0, 13]] : [[0, -13], [14, 11], [-14, 11]], 'ln') +
  (bar ? line(-10, down ? 1 : -1, 10, down ? 1 : -1, 'ln') : '');

export const GLYPHS: Record<string, () => string> = {
  fire: () => tri(false, false),
  water: () => tri(true, false),
  air: () => tri(false, true),
  earth: () => tri(true, true),
  sun: () => circle(0, 0, 13, 'ln') + circle(0, 0, 3, 'ac'),
  moon: () => crescent(0, 0, 13, 'ln', -1),
  mercury: () => circle(0, -1, 7, 'ln') + path('M-8 -15 Q0 -6 8 -15', 'ln') + line(0, 6, 0, 16, 'ln') + line(-5, 11, 5, 11, 'ln'),
  venus: () => circle(0, -5, 8, 'ln') + line(0, 3, 0, 16, 'ln') + line(-6, 10, 6, 10, 'ln'),
  mars: () => circle(-4, 4, 9, 'ln') + path('M3 -3 L13 -13 M5 -13 L13 -13 L13 -5', 'ln'),
  jupiter: () => path('M-13 -6 Q-8 -16 -3 -9 Q2 -2 -13 7 L13 7 M7 -15 L7 15', 'ln'),
  saturn: () => path('M-6 -15 L-6 6 Q-6 -3 3 -3 Q11 -3 7 7 Q4 14 10 15 M-12 -10 L0 -10', 'ln'),
  aries: () => path('M-14 -1 C-19 -15 -3 -18 0 -5 L0 14 M0 -5 C3 -18 19 -15 14 -1', 'ln'),
  taurus: () => circle(0, 5, 9, 'ln') + path('M-14 -14 Q0 2 14 -14', 'ln'),
  gemini: () => path('M-12 -13 Q0 -8 12 -13 M-12 13 Q0 8 12 13 M-6 -10 L-6 10 M6 -10 L6 10', 'ln'),
  cancer: () => path('M14 -6 C6 -15 -9 -14 -14 -4 M-14 6 C-6 15 9 14 14 4', 'ln') + circle(-9, -3, 4.5, 'ln') + circle(9, 3, 4.5, 'ln'),
  leo: () => circle(-8, 5, 5, 'ln') + path('M-4 3 C-7 -16 14 -16 10 0 C8 8 9 14 16 12', 'ln'),
  virgo: () => path('M-15 -10 L-15 10 M-15 -6 Q-10 -12 -6 -6 L-6 10 M-6 -6 Q-1 -12 4 -6 L4 8 Q7 14 13 6 M4 1 Q15 -6 9 13', 'ln'),
  libra: () => path('M-15 10 L15 10 M-15 2 L-6 2 A7.5 7.5 0 1 1 6 2 L15 2', 'ln'),
  scorpio: () => path('M-15 -10 L-15 8 M-15 -6 Q-10 -12 -6 -6 L-6 8 M-6 -6 Q-1 -12 4 -6 L4 8 L13 8 M9 4 L13 8 L9 12', 'ln'),
  sagittarius: () => path('M-12 12 L12 -12 M2 -12 L12 -12 L12 -2 M-8 -4 L4 8', 'ln'),
  capricorn: () => path('M-15 -10 L-9 7 L-3 -10 Q1 -14 2 0 Q2 12 8 12 A5 5 0 1 0 6 2', 'ln'),
  aquarius: () => path('M-15 -2 L-10 -8 L-5 -2 L0 -8 L5 -2 L10 -8 L15 -2 M-15 8 L-10 2 L-5 8 L0 2 L5 8 L10 2 L15 8', 'ln'),
  pisces: () => path('M-13 -14 Q-4 0 -13 14 M13 -14 Q4 0 13 14 M-10 0 L10 0', 'ln'),
};

const MAJOR_GLYPH = [
  'air', 'mercury', 'moon', 'venus', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'jupiter',
  'libra', 'water', 'scorpio', 'sagittarius', 'capricorn', 'mars', 'aquarius', 'pisces', 'sun', 'fire', 'saturn',
];
const ELEMENT_GLYPH = { Fire: 'fire', Water: 'water', Air: 'air', Earth: 'earth' } as const;

export function glyphFor(arcana: 'major' | 'minor', rank: number, element: keyof typeof ELEMENT_GLYPH): string {
  return GLYPHS[arcana === 'major' ? MAJOR_GLYPH[rank] : ELEMENT_GLYPH[element]]();
}

// ───────────────────────── pip layouts ─────────────────────────

const L = -58, R = 58;
export const PIP_LAYOUT: Record<number, P[]> = {
  1: [[0, 0]],
  2: [[0, -95], [0, 95]],
  3: [[0, -115], [0, 0], [0, 115]],
  4: [[L, -85], [R, -85], [L, 85], [R, 85]],
  5: [[L, -95], [R, -95], [0, 0], [L, 95], [R, 95]],
  6: [[L, -110], [R, -110], [L, 0], [R, 0], [L, 110], [R, 110]],
  7: [[L, -115], [R, -115], [0, -58], [L, 0], [R, 0], [L, 115], [R, 115]],
  8: [[L, -120], [R, -120], [0, -62], [L, 0], [R, 0], [0, 62], [L, 120], [R, 120]],
  9: [[L, -126], [R, -126], [L, -42], [R, -42], [0, 0], [L, 42], [R, 42], [L, 126], [R, 126]],
  10: [[L, -126], [R, -126], [0, -84], [L, -42], [R, -42], [L, 42], [R, 42], [0, 84], [L, 126], [R, 126]],
};

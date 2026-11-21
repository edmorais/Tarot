// The Celestial deck draws from the sky itself: each Major Arcana card is its
// traditional constellation or planet (Golden Dawn attributions), the courts
// are celestial bodies, and the pips are joined like stars in an asterism.
// Same coordinate box and style classes as kit.ts.
import { circle, crescent, ellipse, g, halfRays, line, path, poly, rays, star, type Cls } from './kit';

type P = [number, number];
type S = [number, number, number]; // x, y, magnitude (1 = brightest)
const n = (v: number) => +v.toFixed(1);

/** A bright star gets eight points and a soft disc; fainter stars are small four-point sparks. */
function starAt(x: number, y: number, mag: number) {
  if (mag <= 1) return circle(x, y, 9, 'hl') + star(x, y, 15, 'ac', 8, 0.28);
  if (mag <= 2) return star(x, y, 10, 'ac', 4, 0.3);
  return star(x, y, 6, 'ac', 4, 0.32);
}

/** Stars joined by fine lines, drawn under the stars themselves. */
export function constellation(stars: S[], links: [number, number][]) {
  let s = '';
  for (const [a, b] of links) s += line(stars[a][0], stars[a][1], stars[b][0], stars[b][1], 'tn');
  for (const [x, y, m] of stars) s += starAt(x, y, m);
  return s;
}

/** A dotted guide line: the figure the ancients saw, traced faintly. */
const dotted = (d: string) => `<path d="${d}" class="tn" style="stroke-dasharray:2 6;opacity:0.7"/>`;
const orbit = (cx: number, cy: number, rx: number, ry: number, rot = 0) => ellipse(cx, cy, rx, ry, 'tn', rot);

/** A tiny cluster of faint stars, like the Pleiades or the Beehive. */
function cluster(cx: number, cy: number, r: number, count: number, seed = 1) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = i * 2.399 + seed, d = r * Math.sqrt((i + 0.5) / count);
    s += star(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3.5, 'ac', 4, 0.35);
  }
  return s;
}

/** A comet: a bright head and a tail of fine, fanning lines. */
function comet(hx: number, hy: number, tx: number, ty: number, w = 14) {
  const dx = tx - hx, dy = ty - hy, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  let s = '';
  for (const k of [-1, -0.6, -0.25, 0, 0.25, 0.6, 1]) {
    const reach = 1 - Math.abs(k) * 0.3;
    s += line(hx, hy, hx + dx * reach + nx * w * k, hy + dy * reach + ny * w * k, 'tn');
  }
  return s + circle(hx, hy, 10, 'hl') + star(hx, hy, 9, 'ac', 4, 0.3);
}

/** A falling star: a single fine streak with a small bright head. */
const meteor = (x1: number, y1: number, x2: number, y2: number) =>
  line(x1, y1, x2, y2, 'tn') + line(x1 + 3, y1 + 2, (x1 + x2) / 2 + 3, (y1 + y2) / 2 + 2, 'tn') + star(x2, y2, 6, 'ac', 4, 0.3);

/** A planet with optional bands, ring and moons. */
function planet(cx: number, cy: number, r: number, o: { bands?: number; ring?: boolean; cap?: boolean } = {}) {
  let s = '';
  if (o.ring) s += ellipse(cx, cy, r * 2, r * 0.55, 'tn', -18) + ellipse(cx, cy, r * 1.75, r * 0.45, 'tn', -18);
  s += circle(cx, cy, r, 'fl');
  for (let i = 1; i <= (o.bands ?? 0); i++) {
    const y = cy - r + (2 * r * i) / ((o.bands ?? 0) + 1);
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) ** 2));
    s += path(`M${n(cx - half)} ${n(y)} Q${n(cx)} ${n(y + 4)} ${n(cx + half)} ${n(y)}`, 'tn');
  }
  if (o.cap) s += path(`M${n(cx - r * 0.5)} ${n(cy - r * 0.86)} Q${n(cx)} ${n(cy - r * 0.6)} ${n(cx + r * 0.5)} ${n(cy - r * 0.86)}`, 'ln');
  if (o.ring) s += path(`M${n(cx - r * 1.95)} ${n(cy + r * 0.25)} Q${n(cx)} ${n(cy + r * 0.85)} ${n(cx + r * 1.9)} ${n(cy - r * 0.35)}`, 'ln');
  return s;
}

const MOON_PHASES = (cy: number, r: number, count = 7, spread = 190) => {
  let s = '';
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1), x = -spread / 2 + t * spread, y = cy - Math.sin(t * Math.PI) * 18;
    s += circle(x, y, r, 'tn');
    const lit = Math.cos(t * Math.PI * 2); // 1 new → -1 full → 1 new
    if (lit > 0.95) continue;
    if (lit < -0.95) s += circle(x, y, r, 'ac');
    else s += crescent(x, y, r, lit < 0 ? 'ac' : 'hl', t < 0.5 ? 1 : -1);
  }
  return s;
};

const lemniscate = (cx: number, cy: number, w: number) => {
  const h = w * 0.45;
  return path(`M${cx} ${cy} C${n(cx + w * 0.3)} ${n(cy - h)} ${n(cx + w)} ${n(cy - h)} ${n(cx + w)} ${cy} C${n(cx + w)} ${n(cy + h)} ${n(cx + w * 0.3)} ${n(cy + h)} ${cx} ${cy} C${n(cx - w * 0.3)} ${n(cy - h)} ${n(cx - w)} ${n(cy - h)} ${n(cx - w)} ${cy} C${n(cx - w)} ${n(cy + h)} ${n(cx - w * 0.3)} ${n(cy + h)} ${cx} ${cy}Z`, 'tn');
};

const tri = (cx: number, cy: number, r: number, down: boolean, bar: boolean, c: Cls = 'tn') => {
  const pts: P[] = down ? [[cx - r, cy - r * 0.7], [cx + r, cy - r * 0.7], [cx, cy + r]] : [[cx, cy - r], [cx + r, cy + r * 0.7], [cx - r, cy + r * 0.7]];
  return poly(pts, c) + (bar ? line(cx - r * 0.7, cy + (down ? -0.1 : 0.1) * r, cx + r * 0.7, cy + (down ? -0.1 : 0.1) * r, c === 'tn' ? 'tn' : 'ln') : '');
};

export const CELESTIAL_EMBLEMS: (() => string)[] = [
  // 0 The Fool — the Wanderer: a figure of stars at the edge of the sky, a comet overhead, the small dog
  () =>
    comet(52, -66, 112, -112) +
    dotted('M-118 64 Q-40 50 16 62 L28 96') +
    constellation(
      [[-30, -56, 2], [-30, -38, 3], [-58, -28, 3], [-4, -50, 3], [-30, 2, 2], [-52, 46, 3], [-6, 38, 3], [22, -78, 1], [-84, 44, 3], [-74, 34, 3], [-94, 34, 3]],
      [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5], [4, 6], [3, 7], [8, 9], [8, 10]],
    ),
  // 1 The Magician — Mercury: a small, quick orbit around the sun; the lemniscate of stars; the four elements
  () =>
    lemniscate(0, -96, 34) +
    orbit(0, 6, 82, 32, -18) + orbit(0, 6, 46, 18, -18) +
    circle(0, 6, 15, 'fl') + rays(0, 6, 19, 28, 12, 'tn') +
    circle(76, -20, 8, 'ac') + circle(-42, 20, 5, 'hl') +
    tri(-84, 88, 13, false, false) + tri(-28, 92, 13, true, false) + tri(28, 88, 13, false, true) + tri(84, 92, 13, true, true) +
    star(-34, -96, 5, 'ac', 4) + star(34, -96, 5, 'ac', 4) + star(0, -96, 7, 'ac', 4),
  // 2 The High Priestess — the Moon: its phases arched above, the crescent between two columns of stars
  () =>
    MOON_PHASES(-92, 11) +
    crescent(4, 14, 52, 'fl', -1) +
    constellation([[-92, -50, 2], [-92, -6, 3], [-92, 38, 3], [-92, 82, 2]], [[0, 1], [1, 2], [2, 3]]) +
    `<g>${[[92, -50], [92, -6], [92, 38], [92, 82]].map(([x, y]) => circle(x, y, 6, 'tn')).join('')}</g>` +
    line(92, -50, 92, 82, 'tn') +
    dotted('M-80 -20 Q0 4 80 -20'),
  // 3 The Empress — Venus: the morning star, and the five-petalled rose its orbit traces over eight years
  () => {
    let s = '';
    for (let i = 0; i < 5; i++) s += ellipse(Math.cos((i * 72 - 90) * Math.PI / 180) * 34, 18 + Math.sin((i * 72 - 90) * Math.PI / 180) * 34, 46, 24, 'tn', i * 72 - 90);
    s += circle(0, 18, 84, 'tn') + circle(0, 18, 10, 'fl');
    for (let i = 0; i < 12; i++) {
      const a = ((-160 + (i * 140) / 11) * Math.PI) / 180;
      s += star(Math.cos(a) * 104, 18 + Math.sin(a) * 104, 5, 'ac', 4, 0.35);
    }
    return s + circle(0, -84, 9, 'hl') + star(0, -84, 16, 'ac', 8, 0.28);
  },
  // 4 The Emperor — Aries: Hamal, Sheratan, Mesarthim, and the ram's horn the figure suggests
  () =>
    dotted('M-60 6 C-100 -40 -40 -100 0 -62 C30 -36 4 -6 -16 -22') +
    dotted('M-30 30 Q20 70 80 56') +
    constellation([[-88, 22, 2], [-26, -6, 1], [18, -22, 2], [36, -12, 3], [92, 24, 3], [64, 70, 3]], [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5]]),
  // 5 The Hierophant — Taurus: the Hyades' V, red Aldebaran, the long horns and the Pleiades
  () =>
    constellation(
      [[0, 24, 3], [-36, -8, 1], [-18, 6, 3], [26, -10, 3], [44, -24, 3], [-96, -86, 2], [104, -74, 2], [-10, 62, 3], [-40, 96, 3]],
      [[0, 2], [2, 1], [0, 3], [3, 4], [1, 5], [4, 6], [0, 7], [7, 8]],
    ) + cluster(78, 46, 18, 7, 2) + dotted('M-36 -8 Q-60 30 -40 96'),
  // 6 The Lovers — Gemini: the twins Castor and Pollux, hand in hand
  () =>
    constellation(
      [[-38, -86, 1], [-42, -50, 3], [-48, -6, 3], [-70, 40, 3], [-40, 70, 3], [-64, -30, 3],
       [34, -80, 1], [38, -44, 3], [44, 0, 3], [70, 44, 3], [34, 74, 3], [62, -24, 3], [0, -18, 3]],
      [[0, 1], [1, 2], [2, 3], [2, 4], [1, 5], [6, 7], [7, 8], [8, 9], [8, 10], [7, 11], [1, 12], [12, 7]],
    ),
  // 7 The Chariot — Cancer: the crab's inverted Y around the Beehive cluster, under a canopy of stars
  () =>
    dotted('M-96 -64 Q0 -128 96 -64') +
    constellation([[0, -6, 3], [-10, -62, 3], [-66, 70, 3], [70, 76, 3], [8, 26, 2]], [[1, 0], [0, 4], [4, 2], [4, 3]]) +
    cluster(4, 8, 22, 11, 3) +
    star(-50, -88, 4, 'ac', 4) + star(0, -98, 5, 'ac', 4) + star(50, -88, 4, 'ac', 4),
  // 8 Strength — Leo: the Sickle with Regulus at its foot, the lion's back to Denebola; the lemniscate above
  () =>
    lemniscate(0, -100, 28) +
    constellation(
      [[-52, 52, 1], [-58, 14, 3], [-44, -22, 2], [-16, -42, 3], [6, -30, 3], [2, -6, 3], [62, -2, 3], [104, 34, 2], [62, 40, 3]],
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8], [8, 0]],
    ),
  // 9 The Hermit — Virgo: the maiden's long figure, Spica held low like a lantern
  () =>
    dotted('M-120 112 L-50 40 L-10 70 L50 10 L120 112') +
    constellation(
      [[24, 64, 1], [8, 18, 3], [-40, -4, 3], [-84, -18, 3], [34, -34, 3], [64, -74, 3], [-12, -44, 3], [-24, -92, 3]],
      [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [1, 6], [6, 7]],
    ) + rays(24, 64, 20, 30, 8, 'tn', 0, 22.5),
  // 10 Wheel of Fortune — Jupiter: the banded giant, its four great moons in a line, the turning zodiac
  () => {
    let s = circle(0, 0, 104, 'tn') + circle(0, 0, 92, 'tn');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += line(Math.cos(a) * 92, Math.sin(a) * 92, Math.cos(a) * 104, Math.sin(a) * 104, 'tn');
      s += star(Math.cos(a + Math.PI / 12) * 98, Math.sin(a + Math.PI / 12) * 98, 3, 'ac', 4);
    }
    s += planet(0, 0, 40, { bands: 4 }) + ellipse(14, 12, 9, 5, 'hl');
    for (const x of [-78, -60, 58, 76]) s += circle(x, 0, 4, 'ac');
    return s;
  },
  // 11 Justice — Libra: the balance, its two pans level under the pivot star
  () =>
    constellation(
      [[0, -72, 2], [-70, -16, 1], [72, -24, 2], [-58, 54, 3], [-82, 54, 3], [60, 50, 3], [84, 50, 3], [0, 30, 3]],
      [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [0, 7]],
    ) + path('M-92 54 Q-70 72 -48 54', 'tn') + path('M50 50 Q72 68 94 50', 'tn') + line(0, -72, 0, 110, 'tn'),
  // 12 The Hanged Man — Water: a figure of stars hanging from the beam, the sea below
  () =>
    line(-104, -92, 104, -92, 'ln') +
    constellation(
      [[-90, -92, 3], [-30, -92, 3], [30, -92, 3], [90, -92, 3], [0, -72, 3], [-22, -50, 3], [0, -28, 3], [0, 12, 3], [-16, 18, 3], [16, 18, 3], [0, 40, 1]],
      [[0, 1], [1, 2], [2, 3], [2, 4], [4, 6], [6, 5], [5, 4], [6, 7], [7, 8], [7, 9], [7, 10]],
    ) + circle(0, 40, 24, 'tn') +
    path('M-110 92 q14 -8 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0', 'tn') +
    path('M-96 108 q14 -8 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0', 'tn'),
  // 13 Death — Scorpio: the claws, red Antares at the heart, the long tail curling to the sting
  () =>
    constellation(
      [[-86, -62, 3], [-62, -84, 3], [-74, -36, 3], [-42, -40, 3], [-18, -14, 1], [-4, 14, 3], [4, 46, 3], [20, 76, 3], [52, 92, 3], [82, 78, 3], [92, 50, 3], [78, 34, 2]],
      [[0, 3], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]],
    ) + halfRays(0, 112, 30, 44, 7) + path('M-34 112 A34 34 0 0 1 34 112', 'tn'),
  // 14 Temperance — Sagittarius: the Teapot, with the Milky Way rising like steam from its spout
  () =>
    constellation(
      [[-46, -6, 3], [18, -14, 2], [26, 34, 3], [-40, 40, 3], [-12, -50, 3], [-80, -20, 3], [-82, 28, 3], [62, -8, 3]],
      [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 1], [0, 5], [5, 6], [6, 3], [1, 7], [7, 2]],
    ) +
    dotted('M66 -12 C96 -50 50 -70 76 -104 C92 -124 70 -132 82 -140') +
    cluster(78, -70, 26, 14, 5),
  // 15 The Devil — Capricorn: the sea-goat's wedge, its horns drawn faint
  () =>
    dotted('M-82 -46 C-112 -92 -68 -118 -54 -86') + dotted('M-70 -40 C-90 -100 -40 -110 -40 -78') +
    constellation(
      [[-78, -44, 2], [-40, -20, 3], [0, 0, 3], [42, -14, 3], [86, -46, 2], [60, 30, 3], [18, 56, 3], [-30, 44, 3]],
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]],
    ),
  // 16 The Tower — Mars: a tower of stars, its crown knocked askew, falling stars striking it under the red planet
  () =>
    planet(66, -72, 26, { cap: true }) + circle(104, -98, 3.5, 'ac') + circle(30, -104, 3, 'ac') +
    constellation(
      [[-62, 100, 3], [-14, 100, 3], [-60, 40, 3], [-16, 40, 3], [-58, -20, 2], [-18, -20, 3], [-56, -62, 3], [-20, -62, 3], [-44, -96, 3], [-6, -88, 3]],
      [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6], [5, 7], [6, 7], [6, 8], [8, 9], [9, 7]],
    ) +
    meteor(-110, -120, -66, -70) + meteor(60, -10, 0, 24) + meteor(104, 40, 30, 70) + meteor(-118, 10, -78, 30) +
    star(-90, -40, 4, 'ac', 4) + star(18, -50, 4, 'ac', 4),
  // 17 The Star — Aquarius: the great star above, the water-bearer's stream pouring down in stars
  () => {
    let s = star(0, -56, 54, 'fl', 8, 0.4) + star(0, -56, 22, 'hl', 8, 0.5);
    s += constellation([[-92, 8, 3], [-58, 20, 3], [-30, 4, 2], [8, 24, 3], [40, 10, 3], [74, 28, 3]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]);
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      s += circle(40 + Math.sin(t * 5) * 18 + t * 20, 34 + t * 78, 2.2 + (i % 3), i % 2 ? 'ac' : 'hl');
    }
    return s;
  },
  // 18 The Moon — Pisces: two fish bound by a cord, under a waning moon
  () =>
    crescent(0, -60, 44, 'hl', -1) +
    constellation(
      [[-86, 88, 2], [-50, 56, 3], [-10, 28, 3], [30, 4, 3], [62, -2, 3], [88, 18, 3], [74, 46, 3], [44, 40, 3], [-62, 30, 3], [-70, -10, 3], [-58, -44, 3]],
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 3], [0, 8], [8, 9], [9, 10]],
    ),
  // 19 The Sun — the orrery: the sun at the centre, the planets on their rings
  () => {
    let s = '';
    const rings = [34, 52, 70, 88, 106];
    rings.forEach((r, i) => {
      s += circle(0, 0, r, 'tn');
      const a = (i * 137 + 20) * (Math.PI / 180);
      s += i === 4 ? planet(Math.cos(a) * r, Math.sin(a) * r, 7, { ring: true }) : circle(Math.cos(a) * r, Math.sin(a) * r, 4 + (i % 2) * 2, i === 2 ? 'hl' : 'ac');
    });
    return s + rays(0, 0, 18, 28, 16, 'ln', 4) + circle(0, 0, 15, 'fl') + circle(0, 0, 6, 'ac');
  },
  // 20 Judgement — Fire: a new star bursting into light, its shells expanding, small stars rising
  () => {
    let s = circle(0, -10, 34, 'tn') + circle(0, -10, 54, 'tn') + circle(0, -10, 76, 'tn');
    s += rays(0, -10, 12, 30, 16, 'ln', 8) + star(0, -10, 16, 'ac', 8, 0.25);
    for (const x of [-70, 0, 70]) {
      s += line(x, 112, x, 86, 'tn') + star(x, 80, 6, 'ac', 4) + line(x - 8, 92, x, 84, 'tn') + line(x + 8, 92, x, 84, 'tn');
    }
    return s + rays(0, -10, 84, 92, 32, 'tn');
  },
  // 21 The World — Saturn: the ringed planet within a wreath of stars, the four royal stars at the corners
  () => {
    let s = '';
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      s += star(Math.cos(a) * 70, Math.sin(a) * 100, i % 5 ? 2.6 : 4.5, 'ac', 4, 0.35);
    }
    s += ellipse(0, 0, 70, 100, 'tn') + planet(0, 0, 26, { ring: true, bands: 2 });
    for (const [x, y] of [[-104, -112], [104, -112], [-104, 112], [104, 112]] as P[]) s += starAt(x, y, 1);
    return s;
  },
];

/** The faint meridians and parallels of a star chart, inside a circle of radius r. */
export function atlasGrid(r: number) {
  let s = '';
  const faint = (d: string) => `<path d="${d}" class="tn" style="opacity:0.32"/>`;
  for (const k of [0.35, 0.72]) s += faint(`M0 ${-r} A${n(r * k)} ${r} 0 0 0 0 ${r} A${n(r * k)} ${r} 0 0 0 0 ${-r}`);
  s += faint(`M0 ${-r} L0 ${r}`);
  for (const y of [-0.66, -0.33, 0, 0.33, 0.66]) {
    const yy = y * r, half = Math.sqrt(r * r - yy * yy);
    s += faint(`M${n(-half)} ${n(yy)} Q0 ${n(yy + y * 22)} ${n(half)} ${n(yy)}`);
  }
  return s;
}

// ───────────────────────── courts: celestial bodies ─────────────────────────

export function celestialCourt(rank: number, symbol: () => string): string {
  const sym = (x: number, y: number, s: number) => g(symbol(), `translate(${x} ${y}) scale(${s})`);
  switch (rank) {
    case 11: // Page — the morning star rising over the horizon
      return (
        path('M-140 86 Q0 52 140 86', 'tn') + halfRays(0, 80, 40, 74, 13) +
        circle(0, -94, 14, 'hl') + star(0, -94, 30, 'ac', 8, 0.22) + rays(0, -94, 34, 44, 8, 'tn', 0, 22.5) +
        sym(0, 20, 1.3)
      );
    case 12: // Knight — the comet, charging across the sky
      return comet(86, -94, -128, 70, 30) + sym(-6, 18, 1.3) + star(-110, -100, 5, 'ac', 4) + star(118, 52, 4, 'ac', 4);
    case 13: { // Queen — the crescent moon cradling her suit, attended by stars
      let s = crescent(-6, 6, 128, 'hl', 1);
      for (const [x, y, r] of [[72, -96, 7], [104, -40, 5], [96, 40, 6], [62, 104, 4]] as [number, number, number][]) s += star(x, y, r, 'ac', 4, 0.3);
      return s + sym(18, 8, 1.25);
    }
    default: // King — the sun in glory
      return circle(0, 0, 112, 'tn') + rays(0, 0, 86, 128, 24, 'ln', 18) + circle(0, 0, 82, 'hl') + sym(0, 4, 1.3);
  }
}

// ───────────────────────── pips: joined like an asterism ─────────────────────────

/** Fine lines joining the pips, each to its nearest already-joined neighbour. */
export function asterismLinks(points: P[]): string {
  if (points.length < 2) return '';
  const done = [0];
  const rest = points.map((_, i) => i).slice(1);
  let s = '';
  while (rest.length) {
    let best = [0, 0, Infinity];
    for (const r of rest) for (const d of done) {
      const dist = Math.hypot(points[r][0] - points[d][0], points[r][1] - points[d][1]);
      if (dist < best[2]) best = [r, d, dist];
    }
    const [r, d] = best;
    const [x1, y1] = points[r], [x2, y2] = points[d];
    s += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="tn" style="stroke-width:1.8"/>`;
    s += star((x1 + x2) / 2, (y1 + y2) / 2, 4.5, 'ac', 4, 0.3);
    done.push(r);
    rest.splice(rest.indexOf(r), 1);
  }
  return s + points.map(([x, y]) => star(x, y, 4, 'ac', 4, 0.3)).join('');
}

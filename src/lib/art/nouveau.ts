// The Art Nouveau deck is a herbarium: each Major Arcana card is told through
// its flower in the Victorian language of flowers, each suit has its own plant,
// and the courts show that plant growing from bud to fruit.
// Same coordinate box and style classes as kit.ts.
import { circle, ellipse, g, leaf, line, path, petals, rect, star, cup, wand, sword, pentacle, rays, type Cls } from './kit';

type P = [number, number];
const n = (v: number) => +v.toFixed(1);
const at = (x: number, y: number, s = 1, r = 0) => `translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${n(s)})`;

/** One petal pointing up from its base at (0,0). */
const petal = (len: number, w: number, c: Cls = 'fl', tipCurl = 0) =>
  path(`M0 0 C${n(w * 0.95)} ${n(-len * 0.28)} ${n(w)} ${n(-len * 0.72)} ${n(tipCurl)} ${n(-len)} C${n(-w)} ${n(-len * 0.72)} ${n(-w * 0.95)} ${n(-len * 0.28)} 0 0Z`, c);

/** A smooth stem through points (Catmull-Rom as cubic Béziers). */
export function vine(pts: P[], c: Cls = 'ln') {
  if (pts.length < 2) return '';
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return path(d, c);
}

// ───────────────────────── the flowers ─────────────────────────

export function rose(x: number, y: number, r: number) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = i * 72 - 90, rad = (a * Math.PI) / 180;
    s += ellipse(x + Math.cos(rad) * r * 0.5, y + Math.sin(rad) * r * 0.5, r * 0.52, r * 0.42, 'fl', a);
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 72 - 54, rad = (a * Math.PI) / 180;
    s += ellipse(x + Math.cos(rad) * r * 0.26, y + Math.sin(rad) * r * 0.26, r * 0.32, r * 0.24, 'hl', a);
  }
  return s + circle(x, y, r * 0.16, 'fl') + path(`M${n(x - r * 0.1)} ${n(y)} a${n(r * 0.1)} ${n(r * 0.1)} 0 1 1 ${n(r * 0.14)} ${n(r * 0.06)}`, 'ln');
}

/** A trumpet lily seen from the side, mouth upward. */
export function lily(s = 1, open = 1) {
  let o = '';
  for (const [a, len, c] of [[-58, 66, 'hl'], [58, 66, 'hl'], [-28, 74, 'fl'], [28, 74, 'fl'], [0, 70, 'hl']] as [number, number, Cls][]) {
    o += g(petal(len, 13, c, a < 0 ? -10 : 10), `rotate(${a * open})`);
  }
  for (const a of [-18, -6, 6, 18]) {
    const r = (a * Math.PI) / 180;
    o += line(0, -10, Math.sin(r) * 70, -Math.cos(r) * 70, 'tn') + ellipse(Math.sin(r) * 72, -Math.cos(r) * 72, 3, 6, 'ac', a);
  }
  return g(o + ellipse(0, 6, 8, 14, 'fl'), `scale(${s})`);
}

export function iris(s = 1) {
  let o = '';
  // the falls hang down and out; the standards rise
  o += g(petal(66, 24, 'fl'), 'rotate(150)') + g(petal(66, 24, 'fl'), 'rotate(210)') + g(petal(56, 20, 'fl'), 'rotate(180)');
  o += g(petal(64, 17, 'hl'), 'rotate(-24)') + g(petal(64, 17, 'hl'), 'rotate(24)') + g(petal(70, 15, 'hl'), 'rotate(0)');
  o += line(-6, 14, -18, 40, 'ac') + line(6, 14, 18, 40, 'ac') + circle(0, 4, 7, 'ac');
  return g(o, `scale(${s})`);
}

export function poppy(s = 1) {
  let o = '';
  for (let i = 0; i < 4; i++) {
    const a = i * 90 + 45, rad = (a * Math.PI) / 180;
    o += ellipse(Math.cos(rad) * 22, Math.sin(rad) * 22, 34, 28, 'fl', a);
  }
  o += circle(0, 0, 18, 'ac') + rays(0, 0, 16, 30, 24, 'tn') + circle(0, 0, 11, 'hl') + rays(0, 0, 2, 10, 8, 'ln');
  return g(o, `scale(${s})`);
}

export function sunflower(s = 1) {
  let o = '';
  for (let i = 0; i < 22; i++) o += g(petal(36, 7, 'hl'), `rotate(${i * (360 / 22)}) translate(0 -26)`);
  o += circle(0, 0, 30, 'fl');
  for (let i = 0; i < 60; i++) {
    const r = 2.6 * Math.sqrt(i), a = i * 2.39996;
    o += circle(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4, 1.6, 'ac');
  }
  return g(o, `scale(${s})`);
}

/** A water lily: pointed petals fanned over a round pad. */
export function waterLily(s = 1, pad = true) {
  let o = pad ? path('M-70 26 A74 22 0 1 0 70 26 L6 22 Z', 'hl') : '';
  for (const a of [-70, -45, -22, 0, 22, 45, 70]) o += g(petal(52, 12, 'hl'), `rotate(${a})`);
  for (const a of [-32, 0, 32]) o += g(petal(44, 13, 'fl'), `rotate(${a})`);
  return g(o + ellipse(0, 4, 12, 6, 'ac'), `scale(${s})`);
}

export function passionflower(s = 1) {
  let o = petals(0, 0, 40, 26, 11, 10, 'fl');
  o += circle(0, 0, 30, 'hl');
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, wob = i % 2 ? 4 : 0;
    o += path(`M${n(Math.cos(a) * 12)} ${n(Math.sin(a) * 12)} Q${n(Math.cos(a + 0.1) * (22 + wob))} ${n(Math.sin(a + 0.1) * (22 + wob))} ${n(Math.cos(a) * 34)} ${n(Math.sin(a) * 34)}`, 'tn');
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 72 - 90;
    o += g(ellipse(0, -14, 3.5, 7, 'ac'), `rotate(${a})`);
  }
  for (const a of [-90, 30, 150]) o += g(line(0, 0, 0, -10, 'ln') + circle(0, -11, 3, 'ac'), `rotate(${a + 60})`);
  return g(o + circle(0, 0, 5, 'fl'), `scale(${s})`);
}

export function pomegranate(s = 1) {
  let o = circle(0, 0, 44, 'fl');
  o += path('M-12 -40 L-8 -54 L-2 -44 L4 -56 L8 -44 L14 -54 L14 -40Z', 'hl');
  o += path('M-6 -10 L32 -26 A44 44 0 0 1 36 24 Z', 'hl');
  for (const [x, y] of [[12, -10], [22, -6], [30, -2], [16, 2], [26, 8], [32, 14], [20, 14]] as P[]) o += circle(x, y, 3.4, 'ac');
  return g(o, `scale(${s})`);
}

export function wheat(len = 110) {
  let o = line(0, 0, 0, -len, 'ln');
  for (let i = 0; i < 6; i++) {
    const y = -len + 8 + i * 10;
    o += ellipse(-6, y, 4, 8, 'hl', -25) + ellipse(6, y, 4, 8, 'hl', 25);
  }
  return o + ellipse(0, -len - 4, 3.5, 8, 'hl') + leaf(0, -len * 0.35, 26, -150, 'fl');
}

export function butterfly(s = 1) {
  const o =
    g(ellipse(-20, -14, 22, 15, 'hl', -30) + ellipse(-15, 12, 14, 11, 'fl', 30) + circle(-22, -16, 5, 'fl'), '') +
    g(ellipse(20, -14, 22, 15, 'hl', 30) + ellipse(15, 12, 14, 11, 'fl', -30) + circle(22, -16, 5, 'fl'), '') +
    ellipse(0, 0, 4, 20, 'ac') + path('M-2 -18 Q-10 -34 -16 -36 M2 -18 Q10 -34 16 -36', 'ln');
  return g(o, `scale(${s})`);
}

export function moth(s = 1) {
  const o = path('M0 -6 Q-46 -40 -60 -4 Q-40 6 0 4Z', 'hl') + path('M0 -6 Q46 -40 60 -4 Q40 6 0 4Z', 'hl') +
    path('M0 2 Q-30 30 -36 14 Q-20 4 0 2Z', 'fl') + path('M0 2 Q30 30 36 14 Q20 4 0 2Z', 'fl') +
    circle(-34, -14, 5, 'tn') + circle(34, -14, 5, 'tn') + ellipse(0, 4, 4, 16, 'ac') + path('M-2 -10 Q-12 -24 -20 -24 M2 -10 Q12 -24 20 -24', 'ln');
  return g(o, `scale(${s})`);
}

export const oakLeaf = (len: number) =>
  path(`M0 0 C${n(len * 0.12)} ${n(-len * 0.12)} ${n(len * 0.3)} ${n(-len * 0.06)} ${n(len * 0.24)} ${n(-len * 0.24)} C${n(len * 0.36)} ${n(-len * 0.26)} ${n(len * 0.36)} ${n(-len * 0.44)} ${n(len * 0.2)} ${n(-len * 0.5)} C${n(len * 0.32)} ${n(-len * 0.6)} ${n(len * 0.26)} ${n(-len * 0.8)} 0 ${n(-len)} C${n(-len * 0.26)} ${n(-len * 0.8)} ${n(-len * 0.32)} ${n(-len * 0.6)} ${n(-len * 0.2)} ${n(-len * 0.5)} C${n(-len * 0.36)} ${n(-len * 0.44)} ${n(-len * 0.36)} ${n(-len * 0.26)} ${n(-len * 0.24)} ${n(-len * 0.24)} C${n(-len * 0.3)} ${n(-len * 0.06)} ${n(-len * 0.12)} ${n(-len * 0.12)} 0 0Z`, 'fl') +
  line(0, 0, 0, -len * 0.92, 'tn');

export const acorn = (x: number, y: number, s = 1) =>
  g(ellipse(0, 6, 9, 12, 'fl') + path('M-11 2 Q0 -12 11 2 Z', 'hl') + line(0, -8, 0, -14, 'ln'), at(x, y, s));

/** A six-pointed star flower (star of Bethlehem). */
export const starFlower = (x: number, y: number, r: number) =>
  g(petals(0, 0, r * 0.5, r * 0.5, r * 0.18, 6, 'fl', -90) + circle(0, 0, r * 0.18, 'hl') + circle(0, 0, r * 0.07, 'ac'), at(x, y));

/** A drooping snowdrop bell on a curved stalk. */
export const snowdrop = (x: number, y: number, s = 1) =>
  g(path('M0 -60 Q14 -70 22 -54', 'ln') + line(0, -60, 0, 0, 'ln') +
    g(petal(30, 9, 'fl'), 'translate(22 -54) rotate(160)') + g(petal(30, 9, 'hl'), 'translate(22 -54) rotate(200)') +
    g(petal(26, 7, 'fl'), 'translate(22 -54) rotate(180)') + circle(22, -55, 3, 'ac'), at(x, y, s));

/** A trumpet flower seen face-on (moonflower, morning glory). */
export const trumpetFace = (x: number, y: number, r: number) => {
  let o = circle(0, 0, r, 'fl');
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * (Math.PI / 180);
    o += line(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, Math.cos(a) * r, Math.sin(a) * r, 'tn');
  }
  return g(o + circle(0, 0, r * 0.3, 'hl') + circle(0, 0, r * 0.1, 'ac'), at(x, y));
};

const willow = (x: number, y: number, len: number, sway: number) => {
  let o = path(`M${x} ${y} Q${n(x + sway)} ${n(y + len * 0.5)} ${n(x + sway * 0.4)} ${n(y + len)}`, 'ln');
  for (let i = 1; i < 6; i++) {
    const t = i / 6, px = x + sway * (2 * t * (1 - t)) * 1.2 + sway * 0.4 * t * t, py = y + len * t;
    o += leaf(px, py, 12, 100 + (i % 2) * -20, 'hl');
  }
  return o;
};

const keys = () =>
  g(circle(0, -38, 11, 'hl') + rect(-3.5, -27, 7, 64, 'fl') + rect(3.5, 26, 13, 5, 'ac') + rect(3.5, 35, 10, 5, 'ac'), 'translate(0 40) rotate(-35)') +
  g(circle(0, -38, 11, 'fl') + rect(-3.5, -27, 7, 64, 'hl') + rect(3.5, 26, 13, 5, 'ac') + rect(3.5, 35, 10, 5, 'ac'), 'translate(0 40) rotate(35)');

const laurel = (r: number, count = 22, from = 200, to = 520) => {
  let o = '';
  for (let i = 0; i < count; i++) {
    const a = from + ((to - from) * i) / (count - 1), rad = (a * Math.PI) / 180;
    o += leaf(Math.cos(rad) * r, Math.sin(rad) * r, 18, a + 90 + (i % 2 ? 25 : -25), 'hl');
  }
  return o;
};

// ───────────────────────── the 22 compositions ─────────────────────────

export const NOUVEAU_EMBLEMS: (() => string)[] = [
  // 0 The Fool — the white rose of innocence, and a butterfly taking flight
  () => vine([[-60, 110], [-40, 50], [-20, 10], [0, -10]]) + leaf(-42, 60, 34, 200, 'hl') + leaf(-30, 30, 30, -30, 'hl') +
    rose(0, -20, 52) + g(butterfly(1.1), at(70, -80, 1, 18)) + path('M40 -50 Q56 -60 62 -70', 'tn'),
  // 1 The Magician — the iris, messenger of the gods, rising from the four tools
  () => vine([[0, 110], [0, 40], [0, -30]]) + g(leaf(0, 70, 70, -100, 'hl'), '') + g(leaf(0, 70, 64, -80, 'hl'), '') +
    g(iris(1.15), at(0, -36)) +
    g(cup(), at(-84, 84, 0.34)) + g(wand(), at(-46, 92, 0.34)) + g(sword(), at(46, 92, 0.34)) + g(pentacle(), at(84, 84, 0.34)),
  // 2 The High Priestess — the lotus opening on still water, a reed on either side, the moon above
  () => path('M-10 -96 A26 26 0 1 0 14 -60 A20 20 0 1 1 -10 -96Z', 'hl') +
    line(-90, 110, -90, -40, 'ln') + ellipse(-90, -52, 7, 22, 'ac') + line(90, 110, 90, -40, 'ln') + ellipse(90, -52, 7, 22, 'fl') +
    g(waterLily(1.4), at(0, 34)) + path('M-110 92 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0', 'tn'),
  // 3 The Empress — the pomegranate of abundance between ripe wheat
  () => g(pomegranate(1.25), at(0, -6)) + g(wheat(130), at(-72, 112, 1, -8)) + g(wheat(130), at(72, 112, 1, 8)) +
    vine([[-30, 112], [-10, 70], [0, 50]]) + leaf(-16, 80, 26, 200, 'hl') + leaf(-8, 64, 22, -20, 'hl'),
  // 4 The Emperor — the oak: strength and steadfast rule, its acorns ripe
  () => vine([[-110, 30], [-60, -40], [0, -60], [60, -40], [110, 30]]) +
    g(oakLeaf(56), at(-62, -40, 1, -50)) + g(oakLeaf(60), at(0, -60, 1, 0)) + g(oakLeaf(56), at(62, -40, 1, 50)) +
    g(oakLeaf(46), at(-96, 6, 1, -100)) + g(oakLeaf(46), at(96, 6, 1, 100)) +
    acorn(-30, -10, 1.6) + acorn(30, -10, 1.6) + acorn(0, 20, 1.9) +
    path('M-40 96 L-40 60 L-20 76 L0 52 L20 76 L40 60 L40 96Z', 'fl'),
  // 5 The Hierophant — the olive branch of tradition across the keys
  () => keys() + vine([[-100, 70], [-50, 20], [0, 0], [50, -30], [100, -80]]) +
    [[-80, 46, 220], [-60, 24, -30], [-30, 8, 210], [10, -6, -40], [40, -22, 200], [70, -50, -50], [90, -70, 210]].map(([x, y, a]) => leaf(x, y, 30, a, 'hl')).join('') +
    ellipse(-14, 12, 7, 10, 'fl') + ellipse(56, -38, 7, 10, 'fl'),
  // 6 The Lovers — a red rose and a white, their stems twined into one
  () => vine([[-30, 112], [10, 70], [-20, 30], [-34, -20]]) + vine([[30, 112], [-10, 70], [20, 30], [34, -20]]) +
    leaf(-6, 86, 30, 200, 'hl') + leaf(6, 52, 30, -20, 'hl') +
    rose(-40, -46, 40) + g(rose(0, 0, 40).replace(/class="fl"/g, 'class="hl"'), at(40, -46)),
  // 7 The Chariot — the laurel of victory around a turning wheel
  () => laurel(92) + circle(0, 0, 50, 'fl') + circle(0, 0, 38, 'hl') + rays(0, 0, 10, 38, 8, 'ln', 0, 22.5) + circle(0, 0, 10, 'ac') +
    path('M-20 -100 L0 -118 L20 -100', 'ln'),
  // 8 Strength — the sunflower, a lion's mane of petals; the lemniscate of vine above
  () => vine([[0, 112], [0, 60], [0, 30]]) + leaf(0, 84, 40, 200, 'hl') + leaf(0, 70, 38, -20, 'hl') +
    g(sunflower(1.5), at(0, -10)) +
    path('M0 -104 C12 -120 40 -120 40 -104 C40 -88 12 -88 0 -104 C-12 -120 -40 -120 -40 -104 C-40 -88 -12 -88 0 -104Z', 'ln'),
  // 9 The Hermit — snowdrops, hope in winter, and a lantern hung from a bare branch
  () => path('M-110 -80 Q-30 -96 40 -70', 'ln') + line(10, -80, 10, -40, 'tn') +
    path('M-4 -40 L24 -40 L30 -30 L-10 -30Z', 'fl') + path('M-8 -30 L28 -30 L22 10 L-2 10Z', 'hl') + star(10, -10, 10, 'ac', 6, 0.55) +
    snowdrop(-60, 110, 1.4) + snowdrop(-20, 110, 1.1) + snowdrop(60, 110, 1.3) +
    path('M-120 110 Q0 96 120 110', 'tn'),
  // 10 Wheel of Fortune — the passionflower, its corona a turning wheel
  () => g(passionflower(2.1), at(0, 0)) + leaf(-80, 80, 34, 140, 'hl') + leaf(80, 80, 34, 40, 'hl') + path('M-90 -70 Q-110 -90 -96 -104 Q-80 -110 -84 -94', 'ln') + path('M90 -70 Q110 -90 96 -104 Q80 -110 84 -94', 'ln'),
  // 11 Justice — balance: a beam of living wood with a blossom in each pan, a slender iris leaf upright as the sword
  () => path('M0 112 C6 40 6 -40 0 -110 C-6 -40 -6 40 0 112Z', 'hl') + line(0, 104, 0, -100, 'tn') +
    path('M-40 112 Q-30 80 -16 60', 'ln') + path('M40 112 Q30 80 16 60', 'ln') + leaf(-24, 84, 30, 230, 'fl') + leaf(24, 84, 30, -50, 'fl') +
    path('M-90 -50 Q0 -70 90 -50', 'ln') + circle(0, -62, 6, 'ac') +
    line(-84, -50, -96, 0, 'tn') + line(-84, -50, -72, 0, 'tn') + line(84, -50, 72, 0, 'tn') + line(84, -50, 96, 0, 'tn') +
    path('M-104 0 Q-84 22 -64 0Z', 'fl') + path('M64 0 Q84 22 104 0Z', 'fl') +
    g(poppy(0.42), at(-84, -14)) + g(poppy(0.42), at(84, -14)),
  // 12 The Hanged Man — the weeping willow, and a single bud hanging upside down
  () => path('M-110 -100 Q0 -120 110 -100', 'ln') +
    willow(-90, -104, 170, -16) + willow(-60, -108, 150, 14) + willow(60, -108, 150, -14) + willow(90, -104, 170, 16) +
    line(0, -112, 0, -40, 'ln') + g(petal(44, 16, 'fl') + g(petal(40, 12, 'hl'), 'rotate(-20)') + g(petal(40, 12, 'hl'), 'rotate(20)'), at(0, -40, 1, 180)) +
    circle(0, 34, 26, 'tn'),
  // 13 Death — the poppy of sleep, a butterfly leaving its chrysalis
  () => vine([[0, 112], [10, 60], [0, 0]]) + leaf(6, 70, 40, 200, 'hl') + leaf(8, 50, 34, -30, 'hl') +
    g(poppy(1.5), at(0, -30)) +
    path('M70 30 Q76 52 70 74 Q62 52 70 30Z', 'hl') + line(70, 20, 70, 30, 'ln') + g(butterfly(0.9), at(74, -76, 1, 16)),
  // 14 Temperance — two water lilies, water poured between them, iris leaves standing by
  () => g(waterLily(0.95, false), at(-56, -16, 1, -20)) + g(waterLily(0.95, false), at(56, 46, 1, 14)) +
    path('M-40 -30 C0 -40 30 -10 46 24', 'tn') + path('M-36 -20 C0 -28 24 -2 38 26', 'tn') +
    g(leaf(0, 0, 90, -90, 'hl'), at(-96, 112)) + g(leaf(0, 0, 100, -84, 'hl'), at(96, 112)) +
    path('M-110 100 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0', 'tn'),
  // 15 The Devil — the bramble: a loop of thorns that binds, and berries that tempt
  () => {
    // two canes twisting into a binding loop
    const loop: P[] = [[-100, 112], [-86, 20], [-40, -70], [30, -84], [92, -20], [70, 70], [0, 96], [-60, 50], [-50, -20], [10, -40], [40, 10]];
    let o = vine(loop, 'ln') + vine(loop.map(([x, y], i) => [x + (i % 2 ? 7 : -7), y + 6] as P), 'tn');
    const thorns: P[] = [[-90, 64], [-70, -20], [-20, -78], [40, -80], [86, -46], [86, 30], [40, 88], [-30, 82], [-62, 20], [-30, -36], [26, -24]];
    thorns.forEach(([x, y], i) => (o += path(`M${x} ${y} l${i % 2 ? 7 : -7} -12 l${i % 2 ? 4 : -4} 13Z`, 'ac')));
    for (const [x, y, k] of [[-96, -10, 1], [64, -64, -1], [96, 50, 1], [-40, 96, -1], [-80, 80, 1]] as [number, number, number][])
      o += leaf(x, y, 30, k > 0 ? 200 : -20, 'hl');
    // a cluster of berries at the heart of the loop: the temptation
    for (const [x, y] of [[-4, 30], [12, 22], [6, 42], [-14, 46], [20, 40], [2, 58], [-8, 14]] as P[])
      o += circle(x, y, 9, 'fl') + circle(x - 3, y - 3, 2.2, 'hl');
    return o + path('M2 6 Q4 -6 14 -12', 'ln') + leaf(14, -12, 18, -40, 'hl');
  },
  // 16 The Tower — the oak struck by lightning, split, its leaves falling
  () => {
    // the trunk split in two by the strike, each half leaning away with its bare branches
    let o = path('M-44 112 L-22 112 L-8 30 L-14 -10 L-30 -4 Z', 'fl') + path('M22 112 L48 112 L30 40 L18 -16 L4 28 Z', 'fl');
    o += path('M-20 -4 L-46 -58 M-34 -32 L-70 -42 M-46 -58 L-56 -92 M-46 -58 L-20 -84', 'ln');
    o += path('M16 -12 L46 -70 M34 -46 L76 -48 M46 -70 L40 -104 M46 -70 L74 -92', 'ln');
    o += path('M-120 112 Q0 100 120 112', 'tn');
    // the lightning, forking into the split
    o += path('M-6 -130 L12 -76 L-2 -72 L16 -20 L-14 -70 L0 -74 Z', 'ac') + path('M12 -76 L36 -98', 'ln');
    return o + g(oakLeaf(26), at(-86, 10, 1, -40)) + g(oakLeaf(24), at(90, -4, 1, 60)) + g(oakLeaf(22), at(76, 66, 1, 140)) + g(oakLeaf(22), at(-80, 70, 1, -120)) + acorn(-60, 40, 1.1) + acorn(62, 30, 1.1);
  },
  // 17 The Star — the star of Bethlehem: one great bloom and seven small ones, dew falling
  () => {
    let o = vine([[0, 104], [0, 40], [0, -10]]) + leaf(0, 70, 36, 200, 'hl') + leaf(0, 56, 32, -20, 'hl');
    o += starFlower(0, -34, 84);
    for (const [x, y] of [[-96, -96], [-50, -118], [50, -118], [96, -96], [-106, -24], [106, -24], [0, -126]] as P[]) o += starFlower(x, y, 26);
    for (let i = 0; i < 9; i++) o += path(`M${-60 + i * 15} ${60 + (i % 3) * 14} q4 8 0 12 q-4 -4 0 -12Z`, 'hl');
    return o + path('M-110 104 Q0 88 110 104', 'tn');
  },
  // 18 The Moon — the moonflower, blooming only at night, a moth drawn to it under the crescent
  () => path('M-24 -110 A30 30 0 1 0 6 -64 A24 24 0 1 1 -24 -110Z', 'hl') +
    vine([[-100, 112], [-60, 60], [-10, 40], [10, 10]]) + leaf(-60, 60, 30, 200, 'hl') + leaf(-36, 46, 28, -40, 'hl') +
    trumpetFace(18, 6, 50) + g(moth(1.1), at(66, -60, 1, -14)),
  // 19 The Sun — the sunflower, turning to the light
  () => vine([[0, 112], [0, 70]]) + leaf(0, 96, 44, 200, 'hl') + leaf(0, 84, 40, -20, 'hl') +
    rays(0, -16, 96, 112, 24, 'tn', 6) + g(sunflower(2.1), at(0, -16)),
  // 20 Judgement — three Easter lilies, trumpets of resurrection, rising together
  () => vine([[-50, 112], [-40, 40], [-46, -10]]) + vine([[0, 112], [0, 20], [0, -50]]) + vine([[50, 112], [40, 40], [46, -10]]) +
    leaf(-44, 60, 34, 200, 'hl') + leaf(4, 60, 34, -20, 'hl') + leaf(44, 60, 34, -20, 'hl') +
    g(lily(0.9), at(-46, -10, 1, -18)) + g(lily(1.05), at(0, -50)) + g(lily(0.9), at(46, -10, 1, 18)),
  // 21 The World — a wreath with the four flowers of the elements: rose, lily, iris, poppy
  () => laurel(96, 30, 0, 360) + ellipse(0, 0, 70, 96, 'tn') +
    rose(0, -96, 20) + g(lily(0.4), at(96, 10, 1, 90)) + g(iris(0.5), at(0, 96, 1, 180)) + g(poppy(0.5), at(-96, 0)) +
    starFlower(0, 0, 60),
];

// ───────────────────────── courts: the suit's flower growing ─────────────────────────

const SUIT_FLOWER: Record<string, (s?: number) => string> = {
  wands: (s = 1) => lily(s),
  cups: (s = 1) => waterLily(s, false),
  swords: (s = 1) => iris(s),
  pentacles: (s = 1) => sunflower(s),
};

/** The suit flower at the rank's stage: Page a bud, Knight opening, Queen in bloom, King crowned with fruit. */
export function nouveauCourt(rank: number, suit: string, symbol: () => string): string {
  const flower = SUIT_FLOWER[suit] ?? SUIT_FLOWER.cups;
  const sym = (x: number, y: number, s: number) => g(symbol(), at(x, y, s));
  const stem = (bend: number) => vine([[0, 150], [bend * 0.3, 80], [bend * 0.8, 10], [bend, -40]]) +
    leaf(bend * 0.3, 90, 46, 200, 'hl') + leaf(bend * 0.45, 60, 42, -20, 'hl');
  switch (rank) {
    case 11: // Page: a closed bud, sepals still wrapped around it
      return stem(0) + g(petal(64, 22, 'fl') + g(petal(52, 12, 'hl'), 'rotate(-24)') + g(petal(52, 12, 'hl'), 'rotate(24)'), at(0, -36)) +
        sym(0, 92, 1.0);
    case 12: // Knight: half-open, bending in the wind
      return stem(36) + g(flower(0.85), at(36, -46, 1, 24)) +
        path('M-110 -90 Q-60 -100 -20 -84 M-120 -60 Q-70 -70 -30 -56 M-100 -30 Q-60 -38 -26 -26', 'tn') + sym(-50, 90, 1.0);
    case 13: // Queen: full bloom, ringed with small flowers
      return stem(0) + petals(0, -60, 84, 10, 7, 18, 'hl') + g(flower(1.2), at(0, -60)) + sym(0, 96, 1.0);
    default: // King: bloom and fruit, crowned with laurel
      return stem(0) + g(laurel(70, 18, 200, 340), at(0, -60)) + g(flower(1.15), at(0, -60)) +
        circle(-60, 10, 14, 'fl') + circle(60, 10, 14, 'fl') + circle(-60, 10, 5, 'ac') + circle(60, 10, 5, 'ac') +
        path('M-26 -150 L-26 -126 L-12 -138 L0 -124 L12 -138 L26 -126 L26 -150', 'ln') + sym(0, 96, 1.0);
  }
}

// ───────────────────────── pips: a vine through the suit ─────────────────────────

/** A vine winding through the pips in reading order, leaves along it, buds at the ends. */
export function pipVine(points: P[]): string {
  if (points.length < 2) return '';
  const rows = [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  // serpentine: alternate direction row by row so the vine never doubles back across itself
  const grouped = new Map<number, P[]>();
  for (const p of rows) grouped.set(Math.round(p[1]), [...(grouped.get(Math.round(p[1])) ?? []), p]);
  const order: P[] = [];
  [...grouped.values()].forEach((row, i) => order.push(...(i % 2 ? row.reverse() : row)));
  const pts: P[] = [[order[0][0], order[0][1] - 46], ...order, [order[order.length - 1][0], order[order.length - 1][1] + 46]];
  let s = vine(pts, 'ln');
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    s += leaf(mx, my, 22, a + (i % 2 ? 60 : -60), 'hl');
  }
  const [bx, by] = pts[0], [ex, ey] = pts[pts.length - 1];
  return s + g(petal(18, 7, 'fl'), at(bx, by, 1, 0)) + g(petal(18, 7, 'fl'), at(ex, ey, 1, 180));
}

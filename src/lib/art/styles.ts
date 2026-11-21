// The two original deck styles. Each produces complete card SVGs (600×1050)
// and draws its lettering on a canvas afterwards, so it can use the app fonts.
import { type CardDef, type Element, type Suit } from '../data/cards';
import { mulberry32, hashString } from '../story/rng';
import {
  circle, crescent, g, glyphFor, leaf, line, path, petals, PIP_LAYOUT, rays, rect, star, SUIT_SYMBOL,
} from './kit';
import { asterismLinks, atlasGrid, CELESTIAL_EMBLEMS, celestialCourt } from './celestial';
import { NOUVEAU_EMBLEMS, nouveauCourt, pipVine } from './nouveau';

export type ArtDeckId = 'celestial' | 'nouveau';
export type Mode = 'color' | 'mask';

export const W = 600;
export const H = 1050;
const CX = 300;
const CY = 490;

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

export interface ArtDeck {
  id: ArtDeckId;
  metal: boolean;
  face(card: CardDef, mode: Mode): string;
  back(mode: Mode): string;
  letter(ctx: CanvasRenderingContext2D, card: CardDef, mode: Mode): void;
}

const svgOpen = (defs: string, style: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs><style>${style}</style>`;

interface PictureOpts {
  majorScale: number;
  pipSpread: number;
  aceExtra: string;
  /** this deck's own drawings for the 22 Major Arcana */
  emblems: (() => string)[];
  /** this deck's court composition */
  court: (rank: number, suit: Suit, symbol: () => string) => string;
  /** drawn under the pips, given their positions (in the emblem box) */
  pipDecor?: (points: [number, number][]) => string;
}

/** The card's central picture: emblem, pips or court figure. */
function picture(card: CardDef, opts: PictureOpts): string {
  if (card.arcana === 'major') return g(opts.emblems[card.rank](), `translate(${CX} ${CY}) scale(${opts.majorScale})`);
  const suit = card.suit as Suit;
  const sym = SUIT_SYMBOL[suit];
  if (card.rank > 10) return g(opts.court(card.rank, suit, sym), `translate(${CX} ${CY}) scale(1.42)`);
  if (card.rank === 1) return opts.aceExtra + g(sym(), `translate(${CX} ${CY}) scale(2.5)`);
  const s = card.rank <= 3 ? 1.3 : card.rank <= 6 ? 1.08 : 0.88;
  const spread = opts.pipSpread * (card.rank >= 9 ? 0.92 : 1);
  const tilt = suit === 'swords' || suit === 'wands' ? 18 : 0;
  const layout = PIP_LAYOUT[card.rank];
  const points = layout.map(([x, y]) => [x * spread, y * spread] as [number, number]);
  return (
    (opts.pipDecor ? g(opts.pipDecor(points), `translate(${CX} ${CY})`) : '') +
    layout
      .map(([x, y]) => {
        // swords and wands lean outward, like crossed blades and staves
        const rot = x === 0 ? 0 : x < 0 ? -tilt : tilt;
        return g(sym(), `translate(${CX + x * spread} ${CY + y * spread}) rotate(${rot}) scale(${s})`);
      })
      .join('')
  );
}

/** The card's astrological glyph in a small medallion. */
function medallion(card: CardDef, y: number, r: number, ring: string) {
  return ring + g(glyphFor(card.arcana, card.rank, card.element), `translate(${CX} ${y}) scale(${(r / 22).toFixed(2)})`);
}

/** Cards are lettered in Marcellus SC, the app's heading face. */
export const LETTER_FONT = "'Marcellus SC', Georgia, serif";

/** Mixed case on purpose: Marcellus SC turns lowercase into true small capitals. */
function titleOf(card: CardDef) {
  return card.name;
}

function numeralOf(card: CardDef) {
  if (card.arcana === 'major') return ROMAN[card.rank];
  return card.rank <= 10 ? ROMAN[card.rank] : '';
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxW: number) {
  let px = start;
  ctx.font = font(px);
  while (ctx.measureText(text).width > maxW && px > 14) {
    px -= 1;
    ctx.font = font(px);
  }
}

function spaced(ctx: CanvasRenderingContext2D, px: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${px}px`;
}

// ───────────────────────────── Celestial ─────────────────────────────

const GOLD = ['#f8e7ad', '#d9b464', '#9e7632', '#e9cd85'];

function celestialStyle(mode: Mode) {
  const gold = mode === 'mask' ? '#fff' : 'url(#gold)';
  return `
    .ln{fill:none;stroke:${gold};stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .tn{fill:none;stroke:${gold};stroke-width:1.3;vector-effect:non-scaling-stroke}
    .fl{fill:${mode === 'mask' ? '#000' : 'rgba(217,180,100,0.10)'};stroke:${gold};stroke-width:3.2;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .hl{fill:${mode === 'mask' ? 'url(#hatchm)' : 'url(#hatch)'};stroke:${gold};stroke-width:2.2;vector-effect:non-scaling-stroke}
    .gd{fill:${gold};stroke:none}
    .ac{fill:${gold};stroke:none}
    .st{fill:${mode === 'mask' ? '#000' : '#fff'}}`;
}

function celestialDefs() {
  return `
    <!-- anchored to the card, not to each shape: a shape-relative gradient leaves
         perfectly horizontal or vertical lines (zero-height boxes) unpainted.
         Reflected bands give a foil-like sheen across the card. -->
    <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="170" y2="290" spreadMethod="reflect">
      <stop offset="0" stop-color="${GOLD[0]}"/><stop offset="0.45" stop-color="${GOLD[1]}"/>
      <stop offset="0.7" stop-color="${GOLD[2]}"/><stop offset="1" stop-color="${GOLD[3]}"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#0a0e2a"/><stop offset="0.5" stop-color="#18205a"/><stop offset="1" stop-color="#090c24"/>
    </linearGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#f3d58c" stop-opacity="0.22"/><stop offset="1" stop-color="#f3d58c" stop-opacity="0"/></radialGradient>
    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="6" height="6" fill="rgba(217,180,100,0.10)"/><line x1="1" y1="0" x2="1" y2="6" stroke="#d9b464" stroke-width="1.2" opacity="0.6"/>
    </pattern>
    <pattern id="hatchm" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="6" height="6" fill="#000"/><line x1="1" y1="0" x2="1" y2="6" stroke="#fff" stroke-width="1.2" opacity="0.6"/>
    </pattern>
    ${NEBULA.map((c, i) => `<radialGradient id="nb${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.38"/><stop offset="0.6" stop-color="${c}" stop-opacity="0.08"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}`;
}

/** Gold art over a soft blurred copy of itself, so it seems to give off light. */
const luminous = (art: string, mode: Mode) =>
  mode === 'color' ? `<g filter="url(#glow)" opacity="0.5">${art}</g>${art}` : art;

const NEBULA = ['#7a4cc0', '#2f8a9a', '#b0508a', '#4a5ad0'];

/** Soft clouds of colour behind the stars, different on every card. */
function nebula(seed: string) {
  const rng = mulberry32(hashString(seed + ':nebula'));
  let s = '';
  for (let i = 0; i < 3; i++) {
    const x = 60 + rng() * (W - 120), y = 80 + rng() * (H - 160);
    const rx = 140 + rng() * 160, ry = 90 + rng() * 120;
    s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="url(#nb${Math.floor(rng() * NEBULA.length)})" transform="rotate(${(rng() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
  }
  return s;
}

/** A filigree corner: two arcs, a curl and a star, drawn for the top-left. */
function filigree() {
  return (
    path('M32 92 A60 60 0 0 1 92 32', 'tn') + path('M32 70 A38 38 0 0 1 70 32', 'tn') +
    path('M44 104 Q44 60 64 52 Q74 48 72 58 Q70 66 62 62', 'tn') + path('M104 44 Q60 44 52 64 Q48 74 58 72 Q66 70 62 62', 'tn') +
    star(32, 32, 14, 'ac', 4, 0.3) + circle(54, 54, 3, 'ac')
  );
}

const corners = (draw: () => string) =>
  draw() + g(draw(), `translate(${W} 0) scale(-1 1)`) + g(draw(), `translate(0 ${H}) scale(1 -1)`) + g(draw(), `translate(${W} ${H}) scale(-1 -1)`);

function starfield(seed: string, count: number) {
  const rng = mulberry32(hashString(seed));
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = 30 + rng() * (W - 60), y = 30 + rng() * (H - 60);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.5 + rng() * 1.3).toFixed(2)}" class="st" opacity="${(0.25 + rng() * 0.65).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 7; i++) s += star(40 + rng() * (W - 80), 40 + rng() * (H - 80), 4 + rng() * 4, 'ac', 4, 0.3);
  return s;
}

function celestialFrame() {
  let s = rect(20, 20, W - 40, H - 40, 'ln', 22).replace('class="ln"', 'class="ln" style="stroke-width:3"') + rect(32, 32, W - 64, H - 64, 'tn', 14);
  s += corners(filigree);
  // zodiac ring
  s += circle(CX, CY, 238, 'tn') + circle(CX, CY, 224, 'tn');
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r2 = i % 6 === 0 ? 238 : 231;
    s += `<line x1="${(CX + Math.cos(a) * 224).toFixed(1)}" y1="${(CY + Math.sin(a) * 224).toFixed(1)}" x2="${(CX + Math.cos(a) * r2).toFixed(1)}" y2="${(CY + Math.sin(a) * r2).toFixed(1)}" class="tn"/>`;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    s += circle(CX + Math.cos(a) * 231, CY + Math.sin(a) * 231, 3, 'ac');
  }
  // numeral cartouche and title rules
  s += line(120, 116, 238, 116, 'tn') + line(362, 116, 480, 116, 'tn') + star(120, 116, 6, 'ac', 4, 0.3) + star(480, 116, 6, 'ac', 4, 0.3);
  s += line(80, 918, 520, 918, 'tn') + line(80, 1004, 520, 1004, 'tn') + star(CX, 918, 8, 'ac', 4, 0.3) + star(CX, 1004, 8, 'ac', 4, 0.3);
  return s;
}

const celestial: ArtDeck = {
  id: 'celestial',
  metal: true,
  face(card, mode) {
    return (
      svgOpen(celestialDefs(), celestialStyle(mode)) +
      `<rect width="${W}" height="${H}" fill="${mode === 'mask' ? '#000' : 'url(#sky)'}"/>` +
      (mode === 'color' ? nebula(card.id) : '') +
      starfield(card.id, 110) +
      (mode === 'color' ? `<circle cx="${CX}" cy="${CY}" r="260" fill="url(#halo)"/>` : '') +
      celestialFrame() +
      (card.arcana === 'major' ? g(atlasGrid(222), `translate(${CX} ${CY})`) : '') +
      luminous(
        picture(card, {
          majorScale: 1.82,
          pipSpread: 1.42,
          aceExtra: rays(CX, CY, 150, 200, 36, 'tn', 18) + circle(CX, CY, 150, 'tn'),
          emblems: CELESTIAL_EMBLEMS,
          court: (rank, _suit, sym) => celestialCourt(rank, sym),
          pipDecor: asterismLinks,
        }),
        mode,
      ) +
      // a faint arc of stars above the ring, the glyph medallion below it
      path(`M150 232 Q${CX} 150 450 232`, 'tn') + star(222, 196, 6, 'ac', 4, 0.3) + star(CX, 178, 8, 'ac', 4, 0.3) + star(378, 196, 6, 'ac', 4, 0.3) +
      medallion(
        card, 818, 30,
        circle(CX, 818, 42, 'tn') + circle(CX, 818, 35, 'tn') + line(180, 818, 252, 818, 'tn') + line(348, 818, 420, 818, 'tn') +
          star(174, 818, 5, 'ac', 4, 0.3) + star(426, 818, 5, 'ac', 4, 0.3),
      ) +
      '</svg>'
    );
  },
  back(mode) {
    let s = svgOpen(celestialDefs(), celestialStyle(mode)) +
      `<rect width="${W}" height="${H}" fill="${mode === 'mask' ? '#000' : 'url(#sky)'}"/>` +
      (mode === 'color' ? nebula('celestial-back') : '') + starfield('celestial-back', 150);
    s += rect(20, 20, W - 40, H - 40, 'ln', 22) + rect(32, 32, W - 64, H - 64, 'tn', 14) + corners(filigree);
    const cy = H / 2;
    s += circle(CX, cy, 236, 'ln') + circle(CX, cy, 222, 'tn') + circle(CX, cy, 130, 'tn');
    s += rays(CX, cy, 134, 214, 48, 'tn', 30);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += star(CX + Math.cos(a) * 229, cy + Math.sin(a) * 229, 8, 'ac', 4, 0.3);
    }
    s += circle(CX, cy, 76, 'fl') + rays(CX, cy, 82, 112, 16, 'ln', 10) + star(CX, cy, 46, 'hl', 8, 0.42) + circle(CX, cy, 12, 'ac');
    s += crescent(CX - 170, cy, 26, 'fl', -1) + crescent(CX + 170, cy, 26, 'fl', 1);
    s += star(CX, cy - 330, 22, 'ac', 8, 0.35) + star(CX, cy + 330, 22, 'ac', 8, 0.35);
    s += line(CX - 120, cy - 330, CX - 40, cy - 330, 'tn') + line(CX + 40, cy - 330, CX + 120, cy - 330, 'tn');
    s += line(CX - 120, cy + 330, CX - 40, cy + 330, 'tn') + line(CX + 40, cy + 330, CX + 120, cy + 330, 'tn');
    return s + '</svg>';
  },
  letter(ctx, card, mode) {
    const grad = ctx.createLinearGradient(0, 80, 0, 1010);
    if (mode === 'mask') {
      grad.addColorStop(0, '#fff');
      grad.addColorStop(1, '#fff');
    } else {
      grad.addColorStop(0, GOLD[0]);
      grad.addColorStop(0.5, GOLD[1]);
      grad.addColorStop(1, GOLD[3]);
    }
    ctx.fillStyle = grad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const num = numeralOf(card);
    if (num) {
      spaced(ctx, 4);
      ctx.font = `400 42px ${LETTER_FONT}`;
      ctx.fillText(num, CX, 118);
    } else {
      ctx.beginPath();
      ctx.arc(CX, 116, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    spaced(ctx, 3);
    fitFont(ctx, titleOf(card), (px) => `400 ${px}px ${LETTER_FONT}`, 40, 430);
    ctx.fillText(titleOf(card), CX, 962);
    spaced(ctx, 0);
  },
};

// ───────────────────────────── Art Nouveau ─────────────────────────────

const INK = '#4b3a2c';
const PAPER = '#f4ecd9';
const PALETTE: Record<Element, [string, string, string]> = {
  Fire: ['#e7a78c', '#f8e4d7', '#efcd85'],
  Water: ['#8ec6bc', '#e1f1ec', '#c8b5dc'],
  Air: ['#b7ade0', '#ece8f7', '#f1d48e'],
  Earth: ['#b8c48a', '#eef0dc', '#e4b88a'],
};

function nouveauStyle(_p: [string, string, string]) {
  return `
    .ln{fill:none;stroke:${INK};stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .tn{fill:none;stroke:${INK};stroke-width:1.4;vector-effect:non-scaling-stroke}
    .fl{fill:url(#wc1);stroke:${INK};stroke-width:3.4;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .hl{fill:url(#wc3);stroke:${INK};stroke-width:2.6;stroke-linejoin:round;vector-effect:non-scaling-stroke}
    .ac{fill:${INK};stroke:none}
    .pa{fill:url(#wc2);stroke:${INK};stroke-width:3.4;vector-effect:non-scaling-stroke}
    .gd{fill:url(#leaf);stroke:${INK};stroke-width:1.4;vector-effect:non-scaling-stroke}`;
}

/** Blend two hex colours; t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** A watercolour wash: light at the top of each shape, pooling deeper at the bottom. */
const wash = (id: string, c: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0" stop-color="${mix(c, '#ffffff', 0.38)}"/><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, INK, 0.16)}"/>
  </linearGradient>`;

function nouveauDefs(seed: number, p: [string, string, string]) {
  return `
    ${wash('wc1', p[0])}${wash('wc2', p[1])}${wash('wc3', p[2])}
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4dc98"/><stop offset="0.45" stop-color="#cfa452"/><stop offset="0.75" stop-color="#a77c30"/><stop offset="1" stop-color="#e2c27a"/>
    </linearGradient>
    <filter id="shade" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="${INK}" flood-opacity="0.22"/>
    </filter>
    <filter id="paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}"/>
      <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.26  0 0 0 0 0.15  0 0 0 0.11 0"/>
    </filter>
    <radialGradient id="wash" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
}

/** A whiplash curl with a bud, drawn for the top-left corner. */
function whiplash() {
  return (
    path('M46 360 C40 200 110 92 262 66', 'ln') +
    path('M262 66 C214 70 196 104 222 118 C244 128 252 100 236 96', 'ln') +
    path('M58 300 C70 230 96 190 130 170', 'tn') +
    leaf(70, 250, 34, -70, 'hl') + leaf(96, 182, 30, -30, 'fl') +
    circle(46, 372, 7, 'ac')
  );
}

function lily(x: number, y: number, flip: number) {
  return g(
    path('M0 0 C4 -40 -10 -80 6 -120', 'ln') +
    leaf(2, -20, 34, -150, 'fl') + leaf(0, -50, 30, -40, 'fl') +
    petals(6, -132, 12, 13, 6, 5, 'hl', -90) + circle(6, -132, 5, 'ac'),
    `translate(${x} ${y}) scale(${flip} 1)`,
  );
}

function nouveauFrame(card: CardDef, p: [string, string, string]) {
  let s = `<rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#paper)"/>`;
  s += rect(18, 18, W - 36, H - 36, 'ln', 22) + rect(30, 30, W - 60, H - 60, 'tn', 14);
  // arched window
  s += path('M86 868 L86 330 Q86 150 300 128 Q514 150 514 330 L514 868 Z', 'pa');
  s += `<path d="M86 868 L86 330 Q86 150 300 128 Q514 150 514 330 L514 868 Z" fill="url(#wash)"/>`;
  // mosaic halo
  s += `<circle cx="${CX}" cy="${CY}" r="196" fill="${p[0]}" fill-opacity="0.38" stroke="${INK}" stroke-width="2"/>`;
  s += circle(CX, CY, 170, 'tn');
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    s += `<circle cx="${(CX + Math.cos(a) * 183).toFixed(1)}" cy="${(CY + Math.sin(a) * 183).toFixed(1)}" r="5" class="gd"/>`;
  }
  // corner whiplashes, mirrored
  s += whiplash() + g(whiplash(), `translate(${W} 0) scale(-1 1)`);
  // lilies at the foot of the arch
  s += lily(122, 862, 1) + lily(478, 862, -1);
  // name plaque
  s += path('M74 884 L526 884 Q546 922 526 960 L74 960 Q54 922 74 884Z', 'fl');
  s += path('M74 884 C56 872 40 890 52 902 M526 884 C544 872 560 890 548 902', 'ln');
  // numeral medallion
  if (card.arcana === 'major' || card.rank <= 10) s += circle(CX, 128, 36, 'gd') + circle(CX, 128, 29, 'pa');
  else s += circle(CX, 128, 22, 'gd') + star(CX, 128, 11, 'ac', 4, 0.35);
  return s;
}

const nouveau: ArtDeck = {
  id: 'nouveau',
  metal: false,
  face(card) {
    const p = PALETTE[card.element];
    return (
      svgOpen(nouveauDefs(hashString(card.id) % 1000, p), nouveauStyle(p)) +
      nouveauFrame(card, p) +
      // the picture casts a soft shadow onto the halo, like a cut-paper layer
      `<g filter="url(#shade)">${picture(card, {
        majorScale: 1.7,
        pipSpread: 1.32,
        aceExtra: petals(CX, CY, 110, 46, 16, 12, 'hl') + circle(CX, CY, 120, 'tn'),
        emblems: NOUVEAU_EMBLEMS,
        court: (rank, suit, sym) => nouveauCourt(rank, suit, sym),
        pipDecor: pipVine,
      })}</g>` +
      medallion(card, 784, 25, circle(CX, 784, 36, 'gd') + circle(CX, 784, 30, 'pa') + leaf(CX - 38, 784, 30, 180, 'fl') + leaf(CX + 38, 784, 30, 0, 'fl')) +
      '</svg>'
    );
  },
  back() {
    const p: [string, string, string] = ['#d7a7a0', '#efe3cf', '#a9c9bd'];
    const cy = H / 2;
    let s = svgOpen(nouveauDefs(7, p), nouveauStyle(p)) + `<rect width="${W}" height="${H}" fill="${PAPER}"/><rect width="${W}" height="${H}" filter="url(#paper)"/>`;
    s += rect(18, 18, W - 36, H - 36, 'ln', 22) + rect(30, 30, W - 60, H - 60, 'tn', 14) + rect(56, 56, W - 112, H - 112, 'pa', 40);
    // a trellis of small flowers on a grid centred on the card, so it looks the same either way up
    for (let j = -6; j <= 6; j++) {
      const y = cy + j * 72;
      const off = Math.abs(j) % 2 ? 44 : 0;
      for (let i = -3; i <= 3; i++) {
        const x = CX + i * 88 + off;
        if (x < 96 || x > W - 96 || y < 100 || y > H - 100) continue;
        if (Math.hypot(x - CX, y - cy) < 236) continue;
        s += petals(x, y, 7, 7, 4, 4, 'hl', 45) + circle(x, y, 3, 'ac');
      }
    }
    // central rosette, symmetric under a half turn
    s += circle(CX, cy, 200, 'pa') + circle(CX, cy, 186, 'tn');
    s += petals(CX, cy, 120, 62, 22, 16, 'fl') + petals(CX, cy, 70, 40, 16, 8, 'hl', 22.5);
    s += circle(CX, cy, 34, 'fl') + star(CX, cy, 22, 'ac', 8, 0.45);
    for (const [ty, sy] of [[0, 1], [H, -1]]) {
      s += g(whiplash() + g(whiplash(), `translate(${W} 0) scale(-1 1)`), `translate(0 ${ty}) scale(1 ${sy})`);
    }
    return s + '</svg>';
  },
  letter(ctx, card) {
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const num = numeralOf(card);
    if (num) {
      spaced(ctx, 1);
      fitFont(ctx, num, (px) => `400 ${px}px ${LETTER_FONT}`, 30, 50);
      ctx.fillText(num, CX, 130);
    }
    spaced(ctx, 2);
    fitFont(ctx, titleOf(card), (px) => `400 ${px}px ${LETTER_FONT}`, 36, 410);
    ctx.fillText(titleOf(card), CX, 923);
    spaced(ctx, 0);
  },
};

export const ART_DECKS: Record<ArtDeckId, ArtDeck> = { celestial, nouveau };

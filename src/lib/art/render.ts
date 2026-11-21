// Renders the original decks at runtime: SVG art → canvas, then lettering
// with the app's fonts. Results are cached per card. Nothing is downloaded,
// so these decks are always available offline.
import { CARD_BY_ID } from '../data/cards';
import { ART_DECKS, H, W, type ArtDeckId, type Mode } from './styles';

export interface Rendered {
  color: HTMLCanvasElement;
  /** gold-foil decks only: white where the card is metallic */
  metal?: HTMLCanvasElement;
  /** gold-foil decks only: roughness map (dark = glossy) */
  rough?: HTMLCanvasElement;
}

const faces = new Map<string, Promise<Rendered>>();
const urls = new Map<string, Promise<string>>();
let fontsReady: Promise<unknown> | null = null;

function ensureFonts() {
  fontsReady ??= Promise.all([document.fonts.load('400 40px "Marcellus SC"')]).catch(() => null);
  return fontsReady;
}

async function svgToCanvas(svg: string): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.width = W;
    img.height = H;
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d')!.drawImage(img, 0, 0, W, H);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function roughFromMetal(metal: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.drawImage(metal, 0, 0);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 236 - d[i] * 0.78; // gold ≈ 0.16 roughness, night sky ≈ 0.93
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

async function build(deck: ArtDeckId, draw: (mode: Mode) => string, letter?: (ctx: CanvasRenderingContext2D, mode: Mode) => void): Promise<Rendered> {
  const art = ART_DECKS[deck];
  await ensureFonts();
  const color = await svgToCanvas(draw('color'));
  letter?.(color.getContext('2d')!, 'color');
  if (!art.metal) return { color };
  const metal = await svgToCanvas(draw('mask'));
  letter?.(metal.getContext('2d')!, 'mask');
  return { color, metal, rough: roughFromMetal(metal) };
}

export function renderFace(deck: ArtDeckId, cardId: string): Promise<Rendered> {
  const key = `${deck}:${cardId}`;
  let p = faces.get(key);
  if (!p) {
    const art = ART_DECKS[deck];
    const card = CARD_BY_ID[cardId];
    p = build(deck, (m) => art.face(card, m), (ctx, m) => art.letter(ctx, card, m));
    faces.set(key, p);
    p.catch(() => faces.delete(key));
  }
  return p;
}

export function renderBack(deck: ArtDeckId): Promise<Rendered> {
  const key = `${deck}:back`;
  let p = faces.get(key);
  if (!p) {
    p = build(deck, (m) => ART_DECKS[deck].back(m));
    faces.set(key, p);
  }
  return p;
}

/** An object URL of the card face, for <img> elements. */
export function faceObjectUrl(deck: ArtDeckId, cardId: string): Promise<string> {
  const key = `${deck}:${cardId}`;
  let p = urls.get(key);
  if (!p) {
    p = renderFace(deck, cardId).then(
      ({ color }) =>
        new Promise<string>((resolve, reject) =>
          color.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9),
        ),
    );
    urls.set(key, p);
    p.catch(() => urls.delete(key));
  }
  return p;
}

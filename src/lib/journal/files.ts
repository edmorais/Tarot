// Export, import and share-as-image for the journal.
import { CARD_BY_ID } from '../data/cards';
import { type DeckId } from '../data/decks';
import { faceImage } from '../art/faces';
import type { Theme } from '../data/themes';
import { synthesisFor } from '../story/story';
import { DECK_BY_ID } from '../data/decks';
import type { JournalEntry } from '../state/journal.svelte';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const today = () => new Date().toISOString().slice(0, 10);

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function formatDate(ms: number, withTime = true) {
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  if (!withTime) return date;
  return `${date} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

/** Plain-text version of a reading, used as the share text. */
export function readingText(e: JournalEntry, deck: DeckId): string {
  const input = { id: e.id, spread: e.spread, drawn: e.drawn, narrator: e.narrator, deck };
  const lines = [`${e.spread.name} — ${formatDate(e.createdAt, false)}`, ''];
  e.drawn.forEach((d, i) => {
    lines.push(`${e.spread.positions[i].label}: ${CARD_BY_ID[d.cardId].name}${d.reversed ? ' (reversed)' : ''}`);
  });
  const synth = synthesisFor(input).paragraphs;
  lines.push('', synth[synth.length - 1]);
  return lines.join('\n');
}

// ───────────────────────── share as image ─────────────────────────

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function grid(n: number): number {
  if (n <= 3) return n;
  if (n <= 4) return 2;
  if (n <= 6) return 3;
  if (n <= 10) return 5;
  return 5;
}

export async function renderShareImage(e: JournalEntry, deck: DeckId, theme: Theme): Promise<Blob> {
  const W = 1080, H = 1350, M = 72;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const ui = theme.ui;
  const accent = ui['--accent'];
  const text = ui['--text'];
  const muted = ui['--muted'];

  await Promise.all([
    document.fonts.load('600 64px "Crimson Pro Variable"'),
    document.fonts.load('italic 400 40px "Crimson Pro Variable"'),
    document.fonts.load('400 30px "Marcellus SC"'),
  ]).catch(() => null);

  // background
  const bg = g.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.5, H * 0.8);
  bg.addColorStop(0, theme.dark ? theme.table.base : ui['--panel-solid']);
  bg.addColorStop(1, theme.fog);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = accent;
  g.globalAlpha = 0.5;
  g.lineWidth = 2;
  g.strokeRect(30, 30, W - 60, H - 60);
  g.globalAlpha = 0.25;
  g.strokeRect(42, 42, W - 84, H - 84);
  g.globalAlpha = 1;

  // header
  g.textAlign = 'center';
  g.fillStyle = accent;
  g.font = '400 26px "Marcellus SC", serif';
  g.fillText(formatDate(e.createdAt, false).toUpperCase(), W / 2, M + 40);
  g.fillStyle = text;
  g.font = '600 62px "Crimson Pro Variable", serif';
  g.fillText(e.spread.name, W / 2, M + 116);

  // cards
  const n = e.drawn.length;
  const cols = grid(n);
  const rows = Math.ceil(n / cols);
  const areaTop = M + 160;
  const areaH = n > 10 ? 640 : 600;
  const gap = 26;
  const labelH = 34;
  let cw = (W - M * 2 - gap * (cols - 1)) / cols;
  let ch = cw * 1.75;
  const maxCh = (areaH - (rows - 1) * gap) / rows - labelH;
  if (ch > maxCh) {
    ch = maxCh;
    cw = ch / 1.75;
  }
  const imgs = await Promise.all(e.drawn.map((d) => faceImage(deck, d.cardId)));
  const blockH = rows * (ch + labelH) + (rows - 1) * gap;
  let y0 = areaTop + (areaH - blockH) / 2;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    const rowW = inRow * cw + (inRow - 1) * gap;
    let x = (W - rowW) / 2;
    for (let k = 0; k < inRow; k++) {
      const i = r * cols + k;
      const d = e.drawn[i];
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.45)';
      g.shadowBlur = 24;
      g.shadowOffsetY = 10;
      g.beginPath();
      g.roundRect(x, y0, cw, ch, cw * 0.06);
      g.fillStyle = '#efe6d2';
      g.fill();
      g.restore();
      g.save();
      g.beginPath();
      g.roundRect(x, y0, cw, ch, cw * 0.06);
      g.clip();
      const img = imgs[i];
      if (img) {
        if (d.reversed) {
          g.translate(x + cw / 2, y0 + ch / 2);
          g.rotate(Math.PI);
          g.drawImage(img, -cw / 2, -ch / 2, cw, ch);
        } else g.drawImage(img, x, y0, cw, ch);
      }
      g.restore();
      g.fillStyle = muted;
      g.font = `italic 400 ${Math.max(17, Math.min(24, cw / 6))}px "Crimson Pro Variable", serif`;
      const label = e.spread.positions[i].label;
      g.fillText(wrap(g, label, cw + gap)[0], x + cw / 2, y0 + ch + 26);
      x += cw + gap;
    }
    y0 += ch + labelH + gap;
  }

  // closing words
  const input = { id: e.id, spread: e.spread, drawn: e.drawn, narrator: e.narrator, deck };
  const synth = synthesisFor(input).paragraphs;
  const quote = synth[synth.length - 1];
  g.fillStyle = text;
  g.font = 'italic 400 35px "Crimson Pro Variable", serif';
  const lines = wrap(g, `“${quote}”`, W - M * 2 - 40).slice(0, 5);
  let ty = areaTop + areaH + 90;
  for (const l of lines) {
    g.fillText(l, W / 2, ty);
    ty += 50;
  }

  // footer
  g.fillStyle = accent;
  g.font = '400 28px "Marcellus SC", serif';
  g.fillText('✶  A R C A N A  ✶', W / 2, H - M + 8);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render image'))), 'image/jpeg', 0.9));
}

/** Share the image with the system share sheet, or download it. Returns how it was delivered. */
export async function shareReading(e: JournalEntry, deck: DeckId, theme: Theme): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderShareImage(e, deck, theme);
  const name = `arcana-${e.spread.id}-${new Date(e.createdAt).toISOString().slice(0, 10)}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: e.spread.name, text: readingText(e, deck) });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, name);
  return 'downloaded';
}

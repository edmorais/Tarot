// Renders the app icons from one SVG.  node scripts/make-icons.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const out = path.join(root, 'public', 'icons');

function star(cx, cy, r, inner, points) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** safe: fraction of the canvas the artwork may use (maskable icons need ~0.8) */
function svg(safe = 1, rounded = true) {
  const S = 512, c = S / 2, k = safe;
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 150 * k, r2 = (i % 2 ? 178 : 196) * k;
    return `<line x1="${c + Math.cos(a) * r1}" y1="${c + Math.sin(a) * r1}" x2="${c + Math.cos(a) * r2}" y2="${c + Math.sin(a) * r2}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#4a1630"/><stop offset="0.6" stop-color="#2a0b1e"/><stop offset="1" stop-color="#120509"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f3dc9c"/><stop offset="0.5" stop-color="#d8b66a"/><stop offset="1" stop-color="#a57d36"/>
    </linearGradient>
    <mask id="moon"><rect width="${S}" height="${S}" fill="#fff"/><circle cx="${c + 34 * k}" cy="${c - 16 * k}" r="${108 * k}" fill="#000"/></mask>
  </defs>
  <rect width="${S}" height="${S}" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <circle cx="${c}" cy="${c}" r="${206 * k}" fill="none" stroke="url(#gold)" stroke-width="${5 * k}" opacity="0.9"/>
  <circle cx="${c}" cy="${c}" r="${140 * k}" fill="none" stroke="url(#gold)" stroke-width="${2.5 * k}" opacity="0.7"/>
  <g stroke="url(#gold)" stroke-width="${4 * k}" stroke-linecap="round" opacity="0.85">${rays}</g>
  <circle cx="${c}" cy="${c}" r="${124 * k}" fill="url(#gold)" mask="url(#moon)"/>
  <polygon points="${star(c - 30 * k, c + 14 * k, 46 * k, 0.38, 8)}" fill="url(#gold)"/>
</svg>`;
}

await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(root, 'public', 'favicon.svg'), svg(1, true));
const jobs = [
  ['icon-192.png', 192, svg(1, true)],
  ['icon-512.png', 512, svg(1, true)],
  ['maskable-512.png', 512, svg(0.78, false)],
  ['apple-touch-icon.png', 180, svg(0.9, false)],
];
for (const [name, size, src] of jobs) {
  await sharp(Buffer.from(src)).resize(size, size).png().toFile(path.join(out, name));
}
console.log('icons written to', out);

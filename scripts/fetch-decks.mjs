// Downloads public-domain tarot scans from Wikimedia Commons and converts
// them into uniform WebP card faces under public/decks/<deck>/<cardId>.webp.
//
//   node scripts/fetch-decks.mjs [rws|marseille] [rawDir]
//
// Rider–Waite–Smith (1909, Pamela Colman Smith) and Jean Dodal's Tarot de
// Marseille (c. 1701) are both in the public domain.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'ArcanaTarotFetcher/0.1 (hobby project; deck assets)';
/** pause between downloads; Wikimedia penalises bursts with long 429 bans */
const PACE_MS = 20000;
const OUT_W = 600;
const OUT_H = 1050;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');

const SUITS = ['wands', 'cups', 'swords', 'pentacles'];
const pad = (n) => String(n).padStart(2, '0');

// Card ids follow RWS numbering: Strength = 08, Justice = 11.
const RWS_MAJORS = [
  'Fool', 'Magician', 'High Priestess', 'Empress', 'Emperor', 'Hierophant', 'Lovers', 'Chariot',
  'Strength', 'Hermit', 'Wheel of Fortune', 'Justice', 'Hanged Man', 'Death', 'Temperance', 'Devil',
  'Tower', 'Star', 'Moon', 'Sun', 'Judgement', 'World',
];

function rwsMap() {
  const m = {};
  RWS_MAJORS.forEach((n, i) => (m[`major-${pad(i)}`] = `RWS Tarot ${pad(i)} ${n}.jpg`));
  const prefix = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pents' };
  for (const s of SUITS) for (let r = 1; r <= 14; r++) m[`${s}-${pad(r)}`] = `${prefix[s]}${pad(r)}.jpg`;
  return m;
}

function marseilleMap() {
  const m = {};
  for (let i = 0; i <= 21; i++) {
    // Marseille: VIII = Justice, XI = Force. Swap into RWS ids.
    const id = i === 8 ? 11 : i === 11 ? 8 : i;
    m[`major-${pad(id)}`] = `Jean Dodal M${pad(i)}.jpg`;
  }
  const letter = { wands: 'B', cups: 'C', swords: 'E', pentacles: 'D' };
  // Dodal court order (11..14): Valet, Cavalier, Reine, Roi -> verified below.
  for (const s of SUITS) for (let r = 1; r <= 14; r++) m[`${s}-${pad(r)}`] = `Jean Dodal ${letter[s]}${pad(r)}.jpg`;
  return m;
}

const DECKS = { rws: rwsMap, marseille: marseilleMap };

async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function thumbUrls(files) {
  const out = {};
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const j = await api({
      action: 'query', prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '960',
      titles: batch.map((f) => 'File:' + f).join('|'),
    });
    const norm = Object.fromEntries((j.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of Object.values(j.query.pages)) {
      const name = (norm[p.title] ?? p.title).replace(/^File:/, '');
      if (!p.imageinfo) throw new Error('Missing on Commons: ' + name);
      // originals up to ~2000px are cached and less throttled than generated thumbnails
      const ii = p.imageinfo[0];
      out[name] = ii.height <= 2000 ? ii.url : ii.thumburl ?? ii.url;
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(deck, rawDir) {
  const map = DECKS[deck]();
  const outDir = path.join(root, 'public', 'decks', deck);
  const rawDeckDir = path.join(rawDir, deck);
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(rawDeckDir, { recursive: true });
  const urls = await thumbUrls(Object.values(map));
  let n = 0;
  for (const [id, file] of Object.entries(map)) {
    const outPath = path.join(outDir, id + '.webp');
    if (!REPROCESS && (await fs.stat(outPath).then(() => true, () => false))) {
      process.stdout.write(`\r${deck}: ${++n}/${Object.keys(map).length}`);
      continue;
    }
    const rawPath = path.join(rawDeckDir, id + '.jpg');
    let buf;
    try {
      buf = await fs.readFile(rawPath);
    } catch {
      // Be a polite client: one slow attempt per file, a short retry only for network
      // hiccups, and stop the whole run at the first 429 instead of hammering the servers.
      for (let attempt = 0; ; attempt++) {
        let status = 0;
        try {
          const res = await fetch(urls[file], { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
          if (res.ok) { buf = Buffer.from(await res.arrayBuffer()); break; }
          status = res.status;
        } catch (e) {
          status = String(e?.name ?? e);
        }
        if (status === 429) {
          console.log(`\nWikimedia asked us to slow down (429) at ${file}. Stopping; run again later to resume.`);
          process.exit(2);
        }
        if (attempt >= 2) throw new Error(`Download ${status}: ${file}`);
        process.stdout.write(`\n  retry ${file} after ${status} in 30s\n`);
        await sleep(30000);
      }
      await fs.writeFile(rawPath, buf);
      await sleep(PACE_MS);
    }
    // Dodal's cards are narrower than our card shape: fit the whole card and pad the
    // sides with paper, rather than cropping off the frame at top and bottom.
    const fit = deck === 'marseille'
      ? { fit: 'contain', background: { r: 241, g: 234, b: 219 } }
      : { fit: 'cover', position: 'centre' };
    await sharp(buf)
      .trim({ threshold: 30 })
      .resize(OUT_W, OUT_H, fit)
      .modulate({ saturation: deck === 'rws' ? 1.08 : 1.0 })
      // quality 68 at maximum effort: about a third smaller than q82, with no visible loss at card size
      .webp({ quality: 68, effort: 6, smartSubsample: true })
      .toFile(outPath);
    process.stdout.write(`\r${deck}: ${++n}/${Object.keys(map).length}`);
  }
  process.stdout.write('\n');
}

// --reprocess rebuilds the WebP files from the cached raw scans (no downloads for cached cards)
const REPROCESS = process.argv.includes('--reprocess');
const [only, rawArg] = process.argv.slice(2).filter((a) => a !== '--reprocess');
const rawDir = rawArg ?? path.join(root, '.cache', 'raw-decks');
for (const d of only ? [only] : Object.keys(DECKS)) await run(d, rawDir);

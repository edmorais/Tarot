# Arcana: developer notes

Tarot readings on a candlelit 3D table. Svelte 5, TypeScript, Vite and Threlte (three.js).

For what the app does from a reader's point of view, see [README.md](README.md).

## Run

```powershell
npm install
npm run dev
```

`npm run dev` listens on your network (`--host`), so you can open the printed `Network:` address on a phone on the same Wi-Fi.

```powershell
npm run build
```

`npm run build` produces an installable PWA in `dist/`, which you can host on any static host. `npm run preview` serves the build locally on port 4173, and `npm run check` runs the type checker (svelte-check).

## Card art

### Scanned decks

Card faces live in `public/decks/<deck>/<cardId>.webp` (600×1050). To fetch them again from Wikimedia Commons:

```powershell
npm run fetch-decks
```

- Add `-- marseille` or `-- rws` to fetch one deck.
- Cards already in `public/decks` are skipped, so an interrupted run can simply be started again.
- Wikimedia Commons rate-limits bursts. The script waits between downloads and stops at the first `429`. If that happens, wait about half an hour and run it again.
- `--reprocess` rebuilds the WebP files from scans already cached, without downloading.

Sources:

- Rider–Waite–Smith: Pamela Colman Smith, 1909. Public domain.
- Tarot de Marseille: Jean Dodal, Lyon, c. 1701. Public domain.

### Original decks

**Celestial** and **Art Nouveau** are drawn on the device at runtime, so they need no download and are always available offline. The two decks share the card layout, but each has its own drawings.

- `src/lib/art/kit.ts` is the shared drawing kit: SVG primitives, the four suit symbols, the astrological glyphs and the pip layouts. Every shape uses one of a small set of style classes (`ln`, `fl`, `hl`, `ac`, `tn`, `pa`, `gd`).
- `src/lib/art/celestial.ts` draws a star atlas: constellations and planets for the Major Arcana, and courts as celestial bodies (Page = morning star, Knight = comet, Queen = crescent moon, King = sun).
- `src/lib/art/nouveau.ts` draws a herbarium: flowers, moths and leaves for the Major Arcana, one flower per suit (lily, water lily, iris, sunflower), and courts as stages of growth.
- `src/lib/art/styles.ts` styles each deck: frame, back, lettering and colour (gold foil for Celestial, watercolour washes and gold leaf for Art Nouveau).
- `src/lib/art/render.ts` turns the SVG into a canvas and letters it in Marcellus SC. For Celestial it also renders a metal mask, which becomes the metalness and roughness maps in 3D, so the gold reflects light.

## Install and offline

- The app shell and fonts are precached.
- Scanned card art is cached as it is drawn (runtime cache `arcana-decks`), or all at once from **Settings → App & offline → Keep this deck offline**.
- App updates wait until the app is in the background on the home screen, or until the reader taps **Update** in Settings, so they never interrupt a reading.

## Around the table

- **Atmosphere:** each table has its own: candles on Candlelit Velvet and on Slate & Stone, twinkling star motes on Starry Night, window light on Parchment (`src/lib/three/atmosphere.ts`). An optional synthesised soundscape is in `src/lib/audio/ambience.ts`.
- **Graphics:** Auto, Full or Battery saver. Auto samples the frame rate early on and switches to the saver on slow devices. The saver turns off shadows and dust and renders at standard resolution.
- **Story scenes:** the narrators describe the picture on the card in front of you, per deck (`src/lib/data/scenes.ts`).
- **Daily ritual:** once drawn, today's Card of the Day stays on the home screen until midnight.
- **Journal:** saved in localStorage. Search across cards, spreads and notes, and an Insights view (cards that keep returning, the balance of suits against chance, favourite spreads).
- **First-run hints:** each tip shows once (`src/lib/state/hints.svelte.ts`).

## Layout

| Path | What it holds |
| --- | --- |
| `src/lib/data/cards.ts` | The 78 cards: keywords, scene, upright and reversed meanings, lesson, element |
| `src/lib/data/spreads.ts` | The 11 spreads, with table coordinates and what each position asks |
| `src/lib/data/decks.ts`, `themes.ts`, `scenes.ts` | Decks, table themes, and the per-deck picture descriptions |
| `src/lib/story/` | The story engine: seeded RNG, analysis of the spread, three narrator voices |
| `src/lib/three/TableRig.ts` | The 3D choreography: shuffle, cut, fan, deal, flip, camera framing and view limits |
| `src/lib/three/Scene.svelte` | The Threlte canvas and touch gestures |
| `src/lib/art/` | The procedural decks |
| `src/lib/audio/` | Synthesised sound effects, haptics and ambience |
| `src/lib/state/` | Settings, the reading state machine, journal, hints, PWA (all saved to localStorage) |
| `src/lib/ui/` | Sheets, dock, settings, journal, card inspector, table labels |

Card ids follow Rider–Waite–Smith numbering (Strength = 8, Justice = 11). The Marseille deck is mapped onto these ids.

## Storage keys

| Key | Holds |
| --- | --- |
| `arcana.settings.v1` | Settings |
| `arcana.journal.v1` | Journal entries |
| `arcana.hints.v1` | Hints already shown |

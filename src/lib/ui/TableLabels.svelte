<script lang="ts">
  // The name of each position, floating just below its place on the table.
  // Positions come from the 3D rig every frame, so labels follow the camera.
  // Where labels would collide (the Celtic Cross centre, the Year Ahead ring)
  // a label falls back to its short form: a numeral, or a three-letter month.
  import { rig } from '../three/TableRig';
  import { reading } from '../state/reading.svelte';
  import { settings } from '../state/settings.svelte';

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
  const VISIBLE_IN = ['home', 'pick', 'dealing', 'reveal', 'done'];

  const show = $derived(settings.labels && VISIBLE_IN.includes(reading.phase));

  const items = $derived.by(() => {
    const ps = reading.spread.positions;
    const months = ps.some((p) => p.role === 'month');
    return ps.map((p, i) => {
      if (ps.length === 1) return { full: p.label, short: p.label };
      if (months) return { full: p.label, short: p.role === 'month' ? p.label.slice(0, 3) : '✶' };
      return { full: `${ROMAN[i]} · ${p.label}`, short: ROMAN[i] };
    });
  });

  /** index of the position currently being drawn for, or turned next */
  const current = $derived(
    reading.phase === 'reveal' ? reading.revealed : reading.phase === 'pick' || reading.phase === 'dealing' ? reading.drawn.length : -1,
  );
  const turned = $derived(reading.phase === 'reveal' || reading.phase === 'done' ? reading.revealed : 0);

  let els: HTMLElement[] = $state([]);

  interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  const hits = (a: Box, b: Box) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 2 && b.y < a.y + a.h + 2;

  // widths of each label's two forms, measured once per text (pill padding included)
  const sizes = new Map<string, { full: number; short: number; h: number }>();
  function size(i: number) {
    const el = els[i];
    const key = `${items[i].full}|${items[i].short}`;
    let s = sizes.get(key);
    if (!s && el) {
      const pad = 22; // the pill's own padding and border
      s = {
        full: el.querySelector<HTMLElement>('.full')!.offsetWidth + pad,
        short: el.querySelector<HTMLElement>('.short')!.offsetWidth + pad,
        h: el.offsetHeight,
      };
      if (s.h) sizes.set(key, s);
    }
    return s;
  }

  function layout() {
    const pts = rig.labelPoints();
    const n = Math.min(pts.length, els.length);
    if (!n) return;
    const { top, bottom, left, right } = rig.insets;
    const W = window.innerWidth, H = window.innerHeight;
    // the position being drawn for, or turned next, is placed first and keeps its full name
    const order = [...Array(n).keys()].sort((a, b) => (a === current ? -1 : b === current ? 1 : a - b));
    const compact = new Set<number>();
    // a label near the screen edge slides inward rather than being cut off
    const centreOf = (i: number, w: number) => Math.min(Math.max(pts[i].x, left + w / 2 + 6), W - right - w / 2 - 6);
    const boxOf = (i: number, dy = 0): Box | null => {
      const s = size(i);
      if (!s) return null;
      const w = compact.has(i) ? s.short : s.full;
      return { x: centreOf(i, w) - w / 2, y: pts[i].y + dy, w, h: s.h };
    };
    // shorten labels until nothing collides (a few passes settle any layout)
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      const placed: { i: number; b: Box }[] = [];
      for (const i of order) {
        let b = boxOf(i);
        if (!b) continue;
        let other = placed.find((p) => hits(b!, p.b));
        if (other && i !== current && !compact.has(i)) {
          compact.add(i);
          changed = true;
          b = boxOf(i)!;
          other = placed.find((p) => hits(b!, p.b));
        }
        if (other && other.i !== current && !compact.has(other.i)) {
          compact.add(other.i);
          changed = true;
        }
        placed.push({ i, b });
      }
      if (!changed) break;
    }
    // final placement: a short label that still overlaps moves down a row, or hides
    const placed: Box[] = [];
    for (const i of order) {
      const el = els[i];
      let b = boxOf(i);
      if (!el || !b) continue;
      let dy = 0;
      if (placed.some((p) => hits(b!, p))) {
        dy = b.h + 3;
        b = boxOf(i, dy)!;
      }
      const clear = i === current || !placed.some((p) => hits(b!, p));
      if (clear) placed.push(b);
      const p = pts[i];
      const inView = p.on && p.y + dy > top + 4 && p.y + dy + b.h < H - bottom - 4 && p.x > left && p.x < W - right;
      el.classList.toggle('compact', compact.has(i));
      el.style.transform = `translate3d(${(b.x + b.w / 2).toFixed(1)}px, ${(p.y + dy).toFixed(1)}px, 0) translateX(-50%)`;
      el.style.opacity = inView && clear ? '' : '0';
    }
  }

  // widths measured in a fallback font are wrong: measure again once the fonts arrive
  $effect(() => {
    void document.fonts.ready.then(() => sizes.clear());
  });

  $effect(() => {
    if (!show) return;
    void items; // re-run when the spread changes
    let raf = 0;
    const tick = () => {
      layout();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="labels" class:show aria-hidden="true">
  {#each items as it, i (reading.spreadId + ':' + i)}
    <div class="lab" bind:this={els[i]} class:current={i === current} class:turned={i < turned}>
      <span class="full">{it.full}</span><span class="short">{it.short}</span>
    </div>
  {/each}
</div>

<style>
  .labels {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s var(--ease-out);
  }
  .labels.show {
    opacity: 1;
  }
  .lab {
    position: absolute;
    top: 0;
    left: 0;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel-solid) 72%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: var(--text);
    font-family: var(--display);
    font-size: var(--fs-label);
    letter-spacing: 0.1em;
    line-height: 1.5;
    white-space: nowrap;
    transition: opacity 0.3s, color 0.3s, border-color 0.3s, box-shadow 0.3s, background 0.3s;
    will-change: transform;
  }
  /* both forms are always laid out (so they can be measured); one is hidden */
  .short {
    position: absolute;
    visibility: hidden;
  }
  .lab:global(.compact) .full {
    position: absolute;
    visibility: hidden;
  }
  .lab:global(.compact) .short {
    position: static;
    visibility: visible;
  }
  .lab.current {
    color: var(--accent-ink);
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 18px var(--glow);
  }
  .lab.turned {
    color: var(--muted);
    background: color-mix(in srgb, var(--panel-solid) 45%, transparent);
  }
</style>

<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import type * as THREE from 'three';
  import { rig } from './TableRig';
  import { reading } from '../state/reading.svelte';
  import { settings } from '../state/settings.svelte';
  import { THEME_BY_ID } from '../data/themes';
  import { ui } from '../state/ui.svelte';

  const { scene, renderer, size, dom, dpr } = useThrelte();

  // graphics quality: Full, Battery saver, or Auto (saver switches on if frames run slow)
  rig.onSlow = () => (ui.autoSaver = true);
  $effect(() => {
    const low = settings.graphics === 'saver' || (settings.graphics === 'auto' && ui.autoSaver);
    rig.autoQuality = settings.graphics === 'auto';
    rig.setLowPower(low);
    dpr.set(low ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  });
  rig.attach(scene, renderer as THREE.WebGLRenderer);
  rig.setSpread(reading.spread);

  $effect(() => rig.applyTheme(THEME_BY_ID[settings.theme]));
  $effect(() => {
    void rig.applyDeck(settings.deck);
  });

  useTask((dt) => {
    const s = size.current;
    rig.viewport.w = s.width;
    rig.viewport.h = s.height;
    rig.update(dt);
  });

  // ── gestures ──
  // one finger / mouse: drag to turn and tip the view (or scrub the fan when
  //   the press starts on it); a short tap turns or inspects a card
  // two fingers: pinch to zoom, move together to turn
  // wheel: zoom · double-tap on empty table: reset the view
  type Mode = 'idle' | 'pending' | 'orbit' | 'scrub' | 'pinch';
  // radians per pixel of drag; the rig adds resistance near the limits
  const YAW_PER_PX = 0.0022;
  const PITCH_PER_PX = 0.0032;
  const pts = new Map<number, { x: number; y: number }>();
  let mode: Mode = 'idle';
  let start = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };
  let lastDist = 1;
  let lastTap = { t: 0, x: 0, y: 0 };
  let wheelTimer = 0;

  const turn = (dx: number, dy: number) => rig.orbit(-dx * YAW_PER_PX, -dy * PITCH_PER_PX);

  rig.onViewChange = () => (ui.viewMoved = rig.viewMoved);

  function ndc(x: number, y: number): [number, number] {
    const r = dom.getBoundingClientRect();
    return [((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1)];
  }

  const two = () => {
    const [a, b] = [...pts.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  function onDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try {
      dom.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      start = last = { x: e.clientX, y: e.clientY };
      const i = reading.phase === 'pick' ? rig.fanIndexAt(...ndc(e.clientX, e.clientY)) : -1;
      if (i >= 0) {
        mode = 'scrub';
        reading.hover(i);
      } else mode = 'pending';
    } else if (pts.size === 2) {
      if (mode === 'scrub') reading.hover(-1);
      mode = 'pinch';
      const t = two();
      lastDist = Math.max(t.dist, 1);
      last = t.mid;
    }
  }

  function onMove(e: PointerEvent) {
    if (!pts.has(e.pointerId)) {
      // a mouse hovering over the fan highlights cards without pressing
      if (e.pointerType === 'mouse' && reading.phase === 'pick') reading.hover(rig.fanIndexAt(...ndc(e.clientX, e.clientY)));
      return;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'scrub') {
      reading.hover(rig.fanIndexAt(...ndc(e.clientX, e.clientY)));
    } else if (mode === 'pending' || mode === 'orbit') {
      if (mode === 'pending' && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) mode = 'orbit';
      if (mode === 'orbit') {
        turn(e.clientX - last.x, e.clientY - last.y);
        last = { x: e.clientX, y: e.clientY };
      }
    } else if (mode === 'pinch' && pts.size >= 2) {
      const t = two();
      const dist = Math.max(t.dist, 1);
      rig.zoomBy(lastDist / dist);
      lastDist = dist;
      turn(t.mid.x - last.x, t.mid.y - last.y);
      last = t.mid;
    }
  }

  function onUp(e: PointerEvent) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    if (mode === 'pinch') {
      // a finger left a pinch: carry on turning with the one that remains
      if (pts.size === 1) {
        mode = 'orbit';
        last = [...pts.values()][0];
      } else if (pts.size === 0) {
        mode = 'idle';
        rig.settleView();
      }
      return;
    }
    if (mode === 'scrub') {
      const i = rig.fanIndexAt(...ndc(e.clientX, e.clientY));
      if (i >= 0) void reading.pickFromFan(i);
      else reading.hover(-1);
    } else if (mode === 'pending') {
      tap(e.clientX, e.clientY);
    } else if (mode === 'orbit') {
      rig.settleView(); // spring back from any stretch past the limits
    }
    mode = 'idle';
  }

  function tap(x: number, y: number) {
    const hits = reading.phase === 'reveal' || reading.phase === 'done' ? rig.slotsAt(...ndc(x, y)) : [];
    if (hits.length) {
      reading.tapSlot(hits);
      lastTap.t = 0;
      return;
    }
    const now = performance.now();
    if (now - lastTap.t < 340 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) {
      rig.resetView();
      lastTap.t = 0;
    } else lastTap = { t: now, x, y };
  }

  function onCancel(e: PointerEvent) {
    pts.delete(e.pointerId);
    if (pts.size === 0) {
      if (mode === 'scrub') reading.hover(-1);
      mode = 'idle';
      rig.settleView();
    }
  }

  function onLeave(e: PointerEvent) {
    if (e.pointerType === 'mouse' && !pts.size && reading.phase === 'pick') reading.hover(-1);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    rig.zoomBy(Math.exp(e.deltaY * 0.0012));
    clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => rig.settleView(), 160);
  }

  $effect(() => {
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onCancel);
    dom.addEventListener('pointerleave', onLeave);
    dom.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onCancel);
      dom.removeEventListener('pointerleave', onLeave);
      dom.removeEventListener('wheel', onWheel);
    };
  });
</script>

<T.PerspectiveCamera
  makeDefault
  fov={36}
  near={1}
  far={90}
  oncreate={(ref) => {
    rig.camera = ref;
    rig.viewport.w = size.current.width || window.innerWidth;
    rig.viewport.h = size.current.height || window.innerHeight;
    rig.snapCamera();
  }}
/>
<T is={rig.root} />

// Svelte action: reports how much of the viewport a panel covers, so the
// 3D camera can frame the table inside the visible area.
import { rig } from '../three/TableRig';

type Side = 'top' | 'bottom' | 'left' | 'right';
interface Opts {
  mobile: Side;
  desktop: Side;
  /** cap, as a fraction of the viewport height/width */
  max?: number;
}

const contributions = new Map<HTMLElement, { side: Side; px: number }>();
export const WIDE = '(min-width: 900px)';

function recompute() {
  const s = { top: 0, bottom: 0, left: 0, right: 0 };
  for (const { side, px } of contributions.values()) s[side] = Math.max(s[side], px);
  Object.assign(rig.insets, s);
}

export function inset(node: HTMLElement, opts: Opts) {
  let raf = 0;
  const measure = () => {
    const wide = matchMedia(WIDE).matches;
    const side = wide ? opts.desktop : opts.mobile;
    const r = node.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    let px =
      side === 'bottom' ? H - r.top : side === 'top' ? r.bottom : side === 'left' ? r.right : W - r.left;
    px = Math.max(0, px);
    if (opts.max) px = Math.min(px, (side === 'top' || side === 'bottom' ? H : W) * opts.max);
    contributions.set(node, { side, px });
    recompute();
  };
  // follow the panel through its entrance transition
  const settle = (ms = 900) => {
    const end = performance.now() + ms;
    cancelAnimationFrame(raf);
    const tick = () => {
      measure();
      if (performance.now() < end) raf = requestAnimationFrame(tick);
    };
    tick();
  };
  const ro = new ResizeObserver(() => settle(300));
  ro.observe(node);
  window.addEventListener('resize', measure);
  node.addEventListener('transitionend', measure);
  settle();
  return {
    update(o: Opts) {
      opts = o;
      settle(300);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      contributions.delete(node);
      recompute();
    },
  };
}

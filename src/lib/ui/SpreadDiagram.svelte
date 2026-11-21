<script lang="ts">
  import type { Spread } from '../data/spreads';

  let { spread, active = false }: { spread: Spread; active?: boolean } = $props();

  const W = 1, H = 1.75;
  const box = $derived.by(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of spread.positions) {
      const r = Math.abs(p.rot ?? 0) > 45;
      const hx = (r ? H : W) / 2, hz = (r ? W : H) / 2;
      minX = Math.min(minX, p.x - hx); maxX = Math.max(maxX, p.x + hx);
      minZ = Math.min(minZ, p.z - hz); maxZ = Math.max(maxZ, p.z + hz);
    }
    const pad = 0.3;
    return `${minX - pad} ${minZ - pad} ${maxX - minX + pad * 2} ${maxZ - minZ + pad * 2}`;
  });
</script>

<svg viewBox={box} class:active aria-hidden="true">
  {#each spread.positions as p, i}
    <rect
      x={p.x - W / 2}
      y={p.z - H / 2}
      width={W}
      height={H}
      rx="0.09"
      transform="rotate({p.rot ?? 0} {p.x} {p.z})"
      style="--d: {i * 40}ms"
    />
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  rect {
    fill: color-mix(in srgb, var(--accent) 14%, transparent);
    stroke: var(--accent);
    stroke-width: 0.06;
    opacity: 0.55;
    transition: opacity 0.3s, fill 0.3s;
  }
  .active rect {
    opacity: 1;
    fill: color-mix(in srgb, var(--accent) 30%, transparent);
    animation: pop 0.5s var(--ease-out) both;
    animation-delay: var(--d);
  }
  @keyframes pop {
    from {
      opacity: 0.3;
    }
  }
</style>

<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { reading } from '../state/reading.svelte';
  import { inset } from './inset';

  function hold(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    void reading.startShuffle();
  }
  function release() {
    reading.stopShuffle();
  }
  function key(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) void reading.startShuffle();
      if (e.type === 'keyup') reading.stopShuffle();
    }
  }
</script>

<section class="dock panel" use:inset={{ mobile: 'bottom', desktop: 'bottom' }} transition:fly={{ y: 40, duration: 450, opacity: 0 }}>
  {#key reading.phase}
    <div class="inner" in:fade={{ duration: 300 }}>
      {#if reading.phase === 'shuffle'}
        <p class="hint">Breathe. Hold your question in mind, and shuffle until it feels right.</p>
        <div class="row">
          <button
            class="shuffle"
            class:active={reading.shuffling}
            onpointerdown={hold}
            onpointerup={release}
            onpointercancel={release}
            onkeydown={key}
            onkeyup={key}
            oncontextmenu={(e) => e.preventDefault()}
            aria-label="Hold to shuffle"
          >
            <span class="ring"></span>
            <span class="label">Hold to<br />shuffle</span>
          </button>
          <div class="side">
            <div class="count">
              {#if reading.shuffles === 0}Not yet shuffled{:else}Shuffled {reading.shuffles}×{/if}
            </div>
            <button class="btn-primary" disabled={reading.shuffles === 0 || reading.shuffling} onclick={() => reading.finishShuffle()}>
              Continue
            </button>
          </div>
        </div>
      {:else if reading.phase === 'cut'}
        <p class="hint">With your left hand, as tradition has it — cut the deck. The cards will be dealt for you.</p>
        <button class="btn-primary wide" onclick={() => reading.cutAndDeal()} disabled={reading.busy}>Cut the deck</button>
      {:else if reading.phase === 'pick'}
        <p class="eyebrow">Card {Math.min(reading.drawn.length + 1, reading.total)} of {reading.total}</p>
        <p class="title">{reading.nextLabel}</p>
        <p class="hint">Slide your finger along the fan and lift it on the card that calls to you.</p>
        <button class="btn-ghost" onclick={() => reading.pickRandom()} disabled={reading.busy}>Choose for me</button>
      {:else if reading.phase === 'dealing'}
        <p class="eyebrow">Dealing</p>
        <p class="title">{reading.drawn.length} of {reading.total}</p>
      {/if}
    </div>
  {/key}
</section>

<style>
  .dock {
    position: absolute;
    z-index: 10;
    left: 12px;
    right: 12px;
    bottom: calc(var(--safe-bottom) + 12px);
    padding: 16px 18px;
    border-radius: var(--radius);
    max-width: 520px;
    margin: 0 auto;
    text-align: center;
  }
  .inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-md);
    line-height: 1.35;
    font-style: italic;
  }
  .eyebrow {
    margin: 0;
  }
  .title {
    margin: -4px 0 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 22px;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  .count {
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .wide {
    width: 100%;
  }
  .shuffle {
    position: relative;
    width: 104px;
    height: 104px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%);
    border: 1px solid var(--accent);
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: none;
    transition: transform 0.3s var(--ease-out), box-shadow 0.3s;
  }
  .shuffle.active {
    transform: scale(0.94);
    box-shadow: 0 0 40px var(--glow);
  }
  .ring {
    position: absolute;
    inset: -7px;
    border-radius: 50%;
    border: 1px dashed var(--line);
  }
  .active .ring {
    border-color: var(--accent);
    animation: spin 1.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .label {
    font-family: var(--display);
    font-size: var(--fs-label);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    line-height: 1.5;
  }
</style>

<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { reading } from '../state/reading.svelte';
  import { settings } from '../state/settings.svelte';
  import { CARD_BY_ID } from '../data/cards';
  import CardImg from './CardImg.svelte';
  import Icon from './Icon.svelte';

  const data = $derived(reading.inspect);
  const card = $derived(data ? CARD_BY_ID[data.cardId] : null);

  let rx = $state(0);
  let ry = $state(0);
  function tilt(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ry = ((e.clientX - r.left) / r.width - 0.5) * 18;
    rx = -((e.clientY - r.top) / r.height - 0.5) * 18;
  }
  function untilt() {
    rx = ry = 0;
  }
  function close() {
    reading.inspect = null;
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

{#if data && card}
  <div class="backdrop" transition:fade={{ duration: 250 }} onclick={close} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label={card.name} transition:scale={{ start: 0.92, duration: 400 }}>
    <button class="close" onclick={close} aria-label="Close"><Icon name="close" /></button>
    <div class="stage" onpointermove={tilt} onpointerleave={untilt} role="presentation">
      <div class="card" style="transform: rotateX({rx}deg) rotateY({ry}deg)">
        <CardImg deck={settings.deck} cardId={card.id} alt={card.name} reversed={data.reversed} />
        <div class="sheen" style="background-position: {50 + ry * 3}% {50 - rx * 3}%"></div>
      </div>
    </div>
    <div class="text">
      <div class="eyebrow">{data.label}</div>
      <h2 class="card-name">{card.name}{#if data.reversed}<span class="rv">&nbsp;· reversed</span>{/if}</h2>
      <div class="kw">{(data.reversed ? card.kwRev : card.kwUp).join(' · ')}</div>
      <p>{data.reversed ? card.rev : card.up}</p>
      <p class="lesson">“{card.lesson.charAt(0).toUpperCase() + card.lesson.slice(1)}.”</p>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
  }
  .modal {
    position: fixed;
    z-index: 41;
    inset: calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 16px);
    max-width: 760px;
    margin: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    overflow-y: auto;
    pointer-events: none;
  }
  .modal > * {
    pointer-events: auto;
  }
  .close {
    align-self: flex-end;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--panel);
    flex: none;
  }
  .stage {
    perspective: 900px;
    flex: none;
  }
  .card {
    position: relative;
    width: min(62vw, 300px, calc((100vh - 360px) / 1.75));
    min-width: 150px;
    aspect-ratio: 1 / 1.75;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6), 0 0 50px var(--glow);
    transition: transform 0.25s var(--ease-out);
    transform-style: preserve-3d;
  }
  .sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.22) 48%, transparent 62%);
    background-size: 250% 250%;
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  .text {
    max-width: 520px;
    text-align: center;
    padding: 18px 20px;
    border-radius: var(--radius);
    background: var(--panel);
    border: 1px solid var(--line);
    backdrop-filter: blur(14px);
  }
  h2 {
    margin: 4px 0 4px;
    font-size: calc(var(--fs-title) * 1.15);
  }
  .kw {
    color: var(--accent);
    font-style: italic;
    font-size: var(--fs-md);
    margin-bottom: 10px;
  }
  p {
    margin: 0 0 0.7em;
    font-size: var(--fs-read);
    line-height: var(--lh-read);
  }
  .lesson {
    color: var(--muted);
    font-style: italic;
    margin: 0;
  }
</style>

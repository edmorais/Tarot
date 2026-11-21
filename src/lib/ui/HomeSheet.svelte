<script lang="ts">
  import { fly } from 'svelte/transition';
  import { CATEGORY_NAME, SPREADS, type Spread } from '../data/spreads';
  import { NARRATOR_LIST } from '../story/narrators';
  import { reading } from '../state/reading.svelte';
  import { settings } from '../state/settings.svelte';
  import SpreadDiagram from './SpreadDiagram.svelte';
  import { inset } from './inset';
  import { journal } from '../state/journal.svelte';
  import { CARD_BY_ID } from '../data/cards';
  import CardImg from './CardImg.svelte';

  const cats = Object.keys(CATEGORY_NAME) as Spread['category'][];
  let cat = $state<Spread['category']>(reading.spread.category);
  const list = $derived(SPREADS.filter((s) => s.category === cat));
  const narrator = $derived(NARRATOR_LIST.find((n) => n.id === settings.narrator)!);

  let scroller: HTMLDivElement | undefined = $state();

  // the daily ritual: today's card stays with you until midnight
  let today = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (today = new Date()), 60_000);
    return () => clearInterval(id);
  });
  const todays = $derived(journal.todaysCard(today));
  const todaysCard = $derived(todays ? CARD_BY_ID[todays.drawn[0].cardId] : null);
  const offerToday = $derived(!!todays && reading.spreadId === 'daily');

  function seeToday() {
    if (todays) void reading.openFromJournal(todays);
  }

  function selectCat(c: Spread['category']) {
    cat = c;
    const first = SPREADS.find((s) => s.category === c)!;
    reading.chooseSpread(first.id);
    scroller?.scrollTo({ left: 0, behavior: 'smooth' });
  }
</script>

<section class="sheet panel" use:inset={{ mobile: 'bottom', desktop: 'left' }} transition:fly={{ y: 40, duration: 500, opacity: 0 }}>
  <div class="grab" aria-hidden="true"></div>

  {#if todays && todaysCard}
    <button class="today" onclick={seeToday} disabled={reading.busy} in:fly={{ y: -8, duration: 400 }}>
      <span class="tthumb"><CardImg deck={settings.deck} cardId={todaysCard.id} reversed={todays.drawn[0].reversed} /></span>
      <span class="ttext">
        <span class="eyebrow">Today’s card</span>
        <span class="tname">{todaysCard.name}{#if todays.drawn[0].reversed}<span class="trv">&nbsp;· reversed</span>{/if}</span>
        <span class="tlesson">“{todaysCard.lesson.charAt(0).toUpperCase() + todaysCard.lesson.slice(1)}.”</span>
      </span>
    </button>
  {/if}

  <p class="eyebrow">Choose a spread</p>

  <div class="tabs" role="tablist">
    {#each cats as c}
      <button role="tab" aria-selected={cat === c} onclick={() => selectCat(c)}>{CATEGORY_NAME[c]}</button>
    {/each}
  </div>

  <div class="spreads scroll-x" bind:this={scroller}>
    {#each list as s (s.id)}
      <button class="spread" aria-pressed={reading.spreadId === s.id} onclick={() => reading.chooseSpread(s.id)}>
        <div class="diagram"><SpreadDiagram spread={s} active={reading.spreadId === s.id} /></div>
        <div class="name">{s.name}</div>
        <div class="count">{s.positions.length} {s.positions.length === 1 ? 'card' : 'cards'}</div>
      </button>
    {/each}
  </div>

  {#key reading.spreadId}
    <p class="blurb" in:fly={{ y: 6, duration: 350 }}>{reading.spread.blurb}</p>
  {/key}

  <p class="eyebrow group">Your narrator</p>
  <div class="chips narrators">
    {#each NARRATOR_LIST as n}
      <button class="chip" aria-pressed={settings.narrator === n.id} onclick={() => (settings.narrator = n.id)}>{n.name}</button>
    {/each}
  </div>
  {#key settings.narrator}
    <p class="narrator-blurb" in:fly={{ y: 6, duration: 350 }}><em>{narrator.epithet}</em> — {narrator.blurb}</p>
  {/key}

  {#if offerToday}
    <button class="btn-primary begin" onclick={seeToday} disabled={reading.busy}>See today’s card</button>
    <button class="again" onclick={() => reading.begin()} disabled={reading.busy}>Draw a new one anyway</button>
  {:else}
    <button class="btn-primary begin" onclick={() => reading.begin()} disabled={reading.busy}>Begin the reading</button>
  {/if}
</section>

<style>
  .sheet {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 62vh;
    overflow-y: auto;
    padding: 10px 16px calc(var(--safe-bottom) + 16px);
    border-radius: var(--radius) var(--radius) 0 0;
    border-bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sheet > * {
    flex-shrink: 0;
  }
  .grab {
    align-self: center;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--line);
    margin-bottom: 4px;
  }
  .eyebrow {
    margin: 4px 0 0;
  }
  /* a new group (the narrator) starts with clear air above it */
  .eyebrow.group {
    margin-top: 16px;
  }
  /* category tabs as underlined text: each label takes only the room it needs */
  .tabs {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid var(--line);
  }
  .tabs button {
    flex: 0 1 auto;
    min-width: 0;
    padding: 6px 2px 8px;
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;
    font-size: var(--fs-sm);
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.3s var(--ease-out), border-color 0.3s var(--ease-out);
  }
  .tabs button[aria-selected='true'] {
    color: var(--text);
    border-bottom-color: var(--accent);
  }
  .spreads {
    margin: 0 -16px;
    padding: 4px 16px;
    scroll-padding: 0 16px;
  }
  .spread {
    flex: 0 0 128px;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 8px;
    border-radius: 14px;
    border: 1px solid var(--line);
    transition: all 0.35s var(--ease-out);
  }
  .spread[aria-pressed='true'] {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 9%, transparent);
    box-shadow: 0 0 24px var(--glow);
    transform: translateY(-2px);
  }
  .diagram {
    width: 100%;
    height: 50px;
    padding: 2px 8px;
  }
  .name {
    font-weight: 600;
    font-size: var(--fs-sm);
    line-height: 1.15;
    text-align: center;
  }
  .count {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .blurb,
  .narrator-blurb {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-sm);
    line-height: 1.3;
    min-height: 2.6em;
  }
  .narrator-blurb em {
    color: var(--accent);
  }
  .begin {
    margin-top: 14px;
    width: 100%;
  }
  .again {
    align-self: center;
    padding: 6px 10px;
    color: var(--muted);
    font-style: italic;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .today {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px 8px 8px;
    border-radius: 14px;
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    box-shadow: 0 0 22px var(--glow);
    text-align: left;
    transition: transform 0.25s var(--ease-out);
  }
  .today:active {
    transform: scale(0.98);
  }
  .tthumb {
    flex: none;
    width: 38px;
    height: 66px;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
  }
  .ttext {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .tname {
    font-style: italic;
    font-weight: 500;
    font-size: var(--fs-md);
    line-height: 1.2;
  }
  .trv {
    font-size: 0.8em;
    color: var(--muted);
  }
  .tlesson {
    color: var(--muted);
    font-size: var(--fs-sm);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (min-width: 900px) {
    .sheet {
      top: 80px;
      left: 20px;
      right: auto;
      bottom: 20px;
      width: 380px;
      max-height: none;
      border-radius: var(--radius);
      border-bottom: 1px solid var(--line);
      padding: 18px 20px;
    }
    .grab {
      display: none;
    }
    .spreads {
      margin: 0;
      padding: 4px 0;
      flex-wrap: wrap;
      overflow: visible;
    }
    .spread {
      flex: 1 1 140px;
    }
    .begin {
      margin-top: auto;
    }
  }
</style>

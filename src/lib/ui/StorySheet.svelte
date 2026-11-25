<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { tick } from 'svelte';
  import { reading } from '../state/reading.svelte';
  import { settings } from '../state/settings.svelte';
  import { NARRATOR_LIST, NARRATORS, type NarratorId } from '../story/narrators';
  import CardImg from './CardImg.svelte';
  import Icon from './Icon.svelte';
  import { inset } from './inset';
  import { journal } from '../state/journal.svelte';
  import { ui } from '../state/ui.svelte';

  let expanded = $state(false);
  let body: HTMLDivElement | undefined = $state();
  let dragStart: number | null = null;

  const narrator = $derived(NARRATORS[settings.narrator]);
  const next = $derived(reading.spread.positions[reading.revealed]);
  const saved = $derived(reading.phase === 'done' ? journal.get(reading.id) : undefined);

  // when a new chapter arrives, bring its first line to the top of the panel (never jump to the end):
  // .body is the offsetParent, so offsetTop is the chapter's place in the scrolled text
  $effect(() => {
    const n = reading.chapters.length;
    if (!n || !body) return;
    void tick().then(() => {
      const last = body?.querySelector<HTMLElement>('article:last-of-type');
      if (last && body) body.scrollTo({ top: Math.max(0, last.offsetTop - 8), behavior: 'smooth' });
    });
  });

  function setNarrator(id: NarratorId) {
    settings.narrator = id;
    reading.retell();
  }

  function grabDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.chip')) return;
    dragStart = e.clientY;
  }
  function grabUp(e: PointerEvent) {
    if (dragStart == null) return;
    const dy = e.clientY - dragStart;
    dragStart = null;
    if (Math.abs(dy) < 8) expanded = !expanded;
    else expanded = dy < 0;
  }
</script>

<section class="sheet panel" class:expanded class:done={reading.phase === 'done'} use:inset={{ mobile: 'bottom', desktop: 'right', max: 0.6 }} transition:fly={{ y: 60, duration: 550, opacity: 0 }}>
  <div class="head" onpointerdown={grabDown} onpointerup={grabUp} role="presentation">
    <button class="grab" aria-label={expanded ? 'Collapse story' : 'Expand story'} onclick={(e) => e.stopPropagation()} onpointerup={grabUp}>
      <span class="chev" class:down={expanded}><Icon name="chevron" size={18} /></span>
    </button>
    <div class="who">
      <span class="eyebrow">{narrator.name}</span>
      <span class="epithet">{narrator.epithet}</span>
    </div>
    <div class="chips switch">
      {#each NARRATOR_LIST as n}
        <button class="chip" aria-pressed={settings.narrator === n.id} onclick={() => setNarrator(n.id)} aria-label={n.name}>
          {n.name.replace('The ', '')}
        </button>
      {/each}
    </div>
  </div>

  <div class="body" bind:this={body}>
    {#if reading.chapters.length === 0}
      <p class="empty" in:fade>The cards lie face down, waiting. Turn the first card when you are ready.</p>
    {/if}
    {#each reading.chapters as ch, ci (ch.kind + ci + settings.narrator)}
      <article class:synth={ch.kind === 'synthesis'} in:fly={{ y: 18, duration: 600, delay: 80 }}>
        <header>
          {#if ch.cardId}
            <button class="thumb" onclick={() => reading.openInspect(ci)} aria-label="View {ch.subtitle}">
              <CardImg deck={settings.deck} cardId={ch.cardId} reversed={ch.reversed} />
            </button>
          {:else}
            <div class="sigil"><Icon name="star" size={18} /></div>
          {/if}
          <div>
            <div class="eyebrow">{ch.numeral} · {ch.title}</div>
            <h3 class="card-name">
              {ch.subtitle.replace(' · reversed', '')}{#if ch.reversed}<span class="rv">&nbsp;· reversed</span>{/if}
            </h3>
          </div>
        </header>
        {#each ch.paragraphs as p, pi}
          <p in:fade={{ duration: 700, delay: 250 + pi * 260 }}>{p}</p>
        {/each}
      </article>
    {/each}
  </div>

  <footer>
    {#if reading.phase === 'reveal' && next}
      <button class="btn-primary" onclick={() => reading.revealNext()} disabled={reading.busy}>
        Turn · {next.label}
      </button>
    {:else if reading.allTurned}
      <button class="btn-primary whole" onclick={() => reading.revealWhole()} disabled={reading.busy} in:fade={{ duration: 400 }}>
        <Icon name="star" size={16} /> Hear the whole reading
      </button>
    {:else if reading.phase === 'done'}
      <div class="done">
        {#if saved}
          <div class="saved" in:fade>
            <span>Kept in your journal</span>
            <button class="link" onclick={() => ui.openJournal(reading.id)}>Add a note</button>
            <button
              class="heart"
              class:on={saved.favorite}
              onclick={() => journal.update(saved.id, { favorite: !saved.favorite })}
              aria-label={saved.favorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={saved.favorite}
            >
              <Icon name={saved.favorite ? 'heart-fill' : 'heart'} size={20} />
            </button>
          </div>
        {/if}
        <button class="btn-primary" onclick={() => reading.reset()} disabled={reading.busy}>New reading</button>
      </div>
    {/if}
  </footer>
</section>

<style>
  .sheet {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
    bottom: 0;
    height: 46vh;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius) var(--radius) 0 0;
    border-bottom: 0;
    transition: height 0.5s var(--ease-out);
  }
  /* a finished reading gives the story more room: the table no longer needs it */
  .sheet.done {
    height: 56vh;
  }
  .sheet.expanded {
    height: 86vh;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 6px 16px 10px;
    border-bottom: 1px solid var(--line);
    touch-action: none;
  }
  .grab {
    width: 100%;
    display: grid;
    place-items: center;
    height: 22px;
    color: var(--muted);
  }
  .chev {
    display: grid;
    transition: transform 0.4s var(--ease-out);
  }
  .chev.down {
    transform: rotate(180deg);
  }
  .who {
    display: flex;
    flex-direction: column;
  }
  .epithet {
    font-style: italic;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .switch {
    margin-left: auto;
    gap: 4px;
    flex-wrap: nowrap;
  }
  .switch .chip {
    padding: 5px 10px;
    font-size: var(--fs-xs);
  }
  .body {
    position: relative; /* offsetParent for the chapters, so scrolling lands on a chapter's first line */
    flex: 1;
    overflow-y: auto;
    padding: 6px 18px 24px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .empty {
    color: var(--muted);
    font-style: italic;
    text-align: center;
    margin: 28px 10px;
    font-size: var(--fs-read);
  }
  article {
    padding: 16px 0 6px;
    border-bottom: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
  }
  article:last-child {
    border-bottom: 0;
  }
  article header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  h3 {
    margin: 3px 0 0;
  }
  .thumb {
    flex: none;
    width: 42px;
    height: 72px;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    border: 1px solid var(--line);
    transition: transform 0.25s var(--ease-out);
  }
  .thumb:active {
    transform: scale(0.94);
  }
  .sigil {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 1px solid var(--accent);
    color: var(--accent);
    box-shadow: 0 0 20px var(--glow);
  }
  article p {
    margin: 0 0 0.75em;
    font-size: var(--fs-read);
    line-height: var(--lh-read);
  }
  .synth p:first-of-type::first-letter {
    float: left;
    font-family: var(--display);
    font-size: 3.1em;
    line-height: 0.85;
    padding: 4px 8px 0 0;
    color: var(--accent);
  }
  footer {
    padding: 10px 16px calc(var(--safe-bottom) + 12px);
    display: flex;
    justify-content: center;
  }
  footer:empty {
    display: none;
  }
  footer .btn-primary {
    width: 100%;
    max-width: 420px;
  }
  .whole {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .done {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .saved {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--fs-sm);
    color: var(--muted);
    font-style: italic;
  }
  .link {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
    font-style: normal;
  }
  .heart {
    margin-left: auto;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    color: var(--muted);
  }
  .heart.on {
    color: #e0707f;
  }
  @media (min-width: 900px) {
    .sheet,
    .sheet.done,
    .sheet.expanded {
      top: 80px;
      left: auto;
      right: 20px;
      bottom: 20px;
      width: 420px;
      height: auto;
      border-radius: var(--radius);
      border-bottom: 1px solid var(--line);
    }
    .grab {
      display: none;
    }
    .head {
      padding-top: 14px;
    }
  }
</style>

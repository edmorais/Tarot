<script lang="ts">
  // Patterns across all saved readings: how many, which cards keep returning,
  // the balance of suits, and favourite spreads. One measure per chart, so a
  // single accent hue; names and values are text, never colour alone.
  import { journal } from '../state/journal.svelte';
  import { settings } from '../state/settings.svelte';
  import { reading } from '../state/reading.svelte';
  import { CARD_BY_ID, SUIT_NAME, type Suit } from '../data/cards';
  import CardImg from './CardImg.svelte';

  const all = $derived(journal.entries);
  const drawn = $derived(all.flatMap((e) => e.drawn));
  const total = $derived(drawn.length);
  const reversed = $derived(drawn.filter((d) => d.reversed).length);

  const topCards = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const d of drawn) counts.set(d.cardId, (counts.get(d.cardId) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  });

  const groups = $derived.by(() => {
    const rows: { label: string; count: number }[] = [
      { label: 'Major Arcana', count: 0 },
      ...(['wands', 'cups', 'swords', 'pentacles'] as Suit[]).map((s) => ({ label: SUIT_NAME[s], count: 0 })),
    ];
    for (const d of drawn) {
      const c = CARD_BY_ID[d.cardId];
      const i = c.arcana === 'major' ? 0 : 1 + ['wands', 'cups', 'swords', 'pentacles'].indexOf(c.suit as Suit);
      rows[i].count++;
    }
    return rows;
  });
  const groupMax = $derived(Math.max(1, ...groups.map((g) => g.count)));

  const spreads = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const e of all) counts.set(e.spread.name, (counts.get(e.spread.name) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  });
  const spreadMax = $derived(Math.max(1, ...spreads.map((s) => s[1])));

  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  /** share of draws you'd expect by chance: 22 of 78 are majors, 14 per suit */
  const expected = (label: string) => (label === 'Major Arcana' ? 22 / 78 : 14 / 78);
</script>

{#if all.length === 0}
  <p class="empty">Insights appear once you have a few readings in your journal.</p>
{:else}
  <div class="tiles">
    <div class="tile"><span class="num">{all.length}</span><span class="cap">{all.length === 1 ? 'reading' : 'readings'}</span></div>
    <div class="tile"><span class="num">{total}</span><span class="cap">cards drawn</span></div>
    <div class="tile"><span class="num">{pct(reversed, total)}%</span><span class="cap">reversed</span></div>
  </div>

  <section>
    <h3 class="eyebrow">Cards that keep returning</h3>
    <ol class="cards">
      {#each topCards as [id, count], i}
        <li title="{CARD_BY_ID[id].name}: drawn {count} {count === 1 ? 'time' : 'times'}">
          <span class="rank">{i + 1}</span>
          <span class="thumb"><CardImg deck={settings.deck} cardId={id} /></span>
          <button class="cname" onclick={() => (reading.inspect = { cardId: id, reversed: false, label: 'Drawn ' + count + (count === 1 ? ' time' : ' times') })}>
            {CARD_BY_ID[id].name}
          </button>
          <span class="count">{count}×</span>
        </li>
      {/each}
    </ol>
  </section>

  <section>
    <h3 class="eyebrow">Where your cards come from</h3>
    <p class="note">Share of all cards drawn. The faint tick marks what chance alone would give.</p>
    <div class="bars">
      {#each groups as g}
        <div class="bar-row" title="{g.label}: {g.count} of {total} cards ({pct(g.count, total)}%), chance {Math.round(expected(g.label) * 100)}%">
          <span class="blabel">{g.label}</span>
          <span class="track">
            <span class="fill" style="width: {(g.count / groupMax) * 100}%"></span>
            <span class="chance" style="left: {Math.min(100, ((expected(g.label) * total) / groupMax) * 100)}%"></span>
          </span>
          <span class="bval">{pct(g.count, total)}%</span>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h3 class="eyebrow">Favourite spreads</h3>
    <div class="bars">
      {#each spreads as [name, count]}
        <div class="bar-row" title="{name}: {count} {count === 1 ? 'reading' : 'readings'}">
          <span class="blabel">{name}</span>
          <span class="track"><span class="fill" style="width: {(count / spreadMax) * 100}%"></span></span>
          <span class="bval">{count}</span>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .empty {
    color: var(--muted);
    font-style: italic;
    text-align: center;
    padding: 40px 16px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 6px 0 14px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 6px;
    border-radius: 12px;
    border: 1px solid var(--line);
  }
  .num {
    font-family: var(--display);
    font-size: 1.6rem;
    line-height: 1.1;
    font-variant-numeric: lining-nums tabular-nums;
  }
  .cap {
    color: var(--muted);
    font-size: var(--fs-xs);
  }
  section {
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  h3 {
    margin: 0 0 8px;
    font-weight: 400;
  }
  .note {
    margin: -2px 0 10px;
    color: var(--muted);
    font-size: var(--fs-xs);
    font-variant-numeric: lining-nums;
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .cards li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rank {
    width: 1.2em;
    color: var(--muted);
    font-family: var(--display);
    font-size: var(--fs-sm);
    font-variant-numeric: lining-nums;
  }
  .thumb {
    flex: none;
    width: 28px;
    height: 49px;
    border-radius: 3px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  }
  .cname {
    flex: 1;
    text-align: left;
    font-style: italic;
    font-size: var(--fs-md);
  }
  .count {
    color: var(--muted);
    font-variant-numeric: lining-nums tabular-nums;
  }
  .bars {
    display: grid;
    gap: 10px;
  }
  .bar-row {
    display: grid;
    grid-template-columns: minmax(0, 8.5em) 1fr 3em;
    align-items: center;
    gap: 10px;
  }
  .blabel {
    font-size: var(--fs-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .track {
    position: relative;
    height: 10px;
    border-radius: 0 4px 4px 0;
    background: color-mix(in srgb, var(--text) 6%, transparent);
  }
  .fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 0 4px 4px 0;
    background: var(--accent);
    transition: width 0.6s var(--ease-out);
  }
  .chance {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--muted);
    opacity: 0.7;
  }
  .bval {
    text-align: right;
    font-size: var(--fs-sm);
    color: var(--muted);
    font-variant-numeric: lining-nums tabular-nums;
  }
  .bar-row:hover .fill {
    filter: brightness(1.12);
  }
</style>

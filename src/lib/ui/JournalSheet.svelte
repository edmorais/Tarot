<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { journal, type JournalEntry } from '../state/journal.svelte';
  import { reading } from '../state/reading.svelte';
  import { settings } from '../state/settings.svelte';
  import { ui } from '../state/ui.svelte';
  import { DECK_BY_ID } from '../data/decks';
  import CardImg from './CardImg.svelte';
  import { CARD_BY_ID } from '../data/cards';
  import { THEME_BY_ID } from '../data/themes';
  import { NARRATORS } from '../story/narrators';
  import { chapterFor, synthesisFor } from '../story/story';
  import { downloadBlob, formatDate, pickFile, shareReading, today } from '../journal/files';
  import Icon from './Icon.svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import JournalInsights from './JournalInsights.svelte';

  let filter = $state<'all' | 'fav'>('all');
  let sharing = $state(false);
  let selecting = $state(false);
  const selected = new SvelteSet<string>();

  let view = $state<'readings' | 'insights'>('readings');
  let query = $state('');

  /** a reading matches if every word appears in its spread, its cards or its notes */
  function matches(e: JournalEntry, q: string) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const hay = [e.spread.name, e.notes, ...e.drawn.map((d) => CARD_BY_ID[d.cardId].name + (d.reversed ? ' reversed' : ''))].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  }

  const list = $derived(
    (filter === 'fav' ? journal.entries.filter((e) => e.favorite) : journal.entries).filter((e) => matches(e, query)),
  );
  const entry = $derived(journal.get(ui.journalEntry));
  const story = $derived.by(() => {
    if (!entry) return [];
    const input = {
      id: entry.id, spread: entry.spread, drawn: entry.drawn, narrator: entry.narrator,
      deck: settings.deck,
    };
    return [...entry.drawn.map((_, i) => chapterFor(input, i)), synthesisFor(input)];
  });

  function close() {
    ui.journalOpen = false;
    stopSelecting();
  }

  function open(e: JournalEntry) {
    if (selecting) {
      if (selected.has(e.id)) selected.delete(e.id);
      else selected.add(e.id);
      return;
    }
    ui.journalEntry = e.id;
  }

  function stopSelecting() {
    selecting = false;
    selected.clear();
  }

  const allSelected = $derived(list.length > 0 && list.every((e) => selected.has(e.id)));

  function toggleAll() {
    if (allSelected) selected.clear();
    else for (const e of list) selected.add(e.id);
  }

  /** Delete at once; the toast offers Undo for a few seconds. */
  function deleteWithUndo(ids: string[]) {
    if (!ids.length) return;
    const removed = journal.remove(ids);
    const n = removed.length;
    ui.say(`Deleted ${n} ${n === 1 ? 'reading' : 'readings'}`, 6000, { label: 'Undo', run: () => journal.restore(removed) });
  }

  function deleteSelected() {
    deleteWithUndo([...selected]);
    stopSelecting();
  }

  function exportAll() {
    downloadBlob(new Blob([journal.exportJson()], { type: 'application/json' }), `arcana-journal-${today()}.json`);
    ui.say(`Exported ${journal.entries.length} ${journal.entries.length === 1 ? 'reading' : 'readings'}`);
  }

  async function importFile() {
    const f = await pickFile('application/json,.json');
    if (!f) return;
    try {
      const { added, skipped } = journal.importJson(await f.text());
      ui.say(added ? `Imported ${added} ${added === 1 ? 'reading' : 'readings'}${skipped ? `, ${skipped} already here` : ''}` : 'Nothing new to import');
    } catch {
      ui.say('That file is not an Arcana journal');
    }
  }

  async function share(e: JournalEntry) {
    if (sharing) return;
    sharing = true;
    try {
      const how = await shareReading(e, settings.deck, THEME_BY_ID[settings.theme]);
      if (how === 'downloaded') ui.say('Image saved');
    } catch {
      ui.say('Could not create the image');
    }
    sharing = false;
  }

  async function layOnTable(e: JournalEntry) {
    close();
    await reading.openFromJournal(e);
  }

  function del(e: JournalEntry) {
    ui.journalEntry = null;
    deleteWithUndo([e.id]);
  }
</script>

<svelte:window onkeydown={(e) => ui.journalOpen && e.key === 'Escape' && (entry ? (ui.journalEntry = null) : close())} />

{#if ui.journalOpen}
  <div class="backdrop" transition:fade={{ duration: 250 }} onclick={close} role="presentation"></div>
  <aside class="sheet panel" transition:fly={{ y: 80, duration: 450, opacity: 0 }} aria-label="Journal">
    {#if entry}
      {#key entry.id}
        <div class="view" in:fly={{ x: 30, duration: 350 }}>
          <header>
            <button class="round" onclick={() => (ui.journalEntry = null)} aria-label="Back to journal"><Icon name="back" /></button>
            <div class="htext">
              <div class="eyebrow">{formatDate(entry.createdAt)}</div>
              <h2>{entry.spread.name}</h2>
            </div>
            <button class="round fav" class:on={entry.favorite} onclick={() => journal.update(entry.id, { favorite: !entry.favorite })} aria-label={entry.favorite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={entry.favorite}>
              <Icon name={entry.favorite ? 'heart-fill' : 'heart'} />
            </button>
            <button class="round" onclick={() => del(entry)} aria-label="Delete this reading" title="Delete">
              <Icon name="trash" />
            </button>
          </header>

          <div class="scroll">
            <div class="cards">
              {#each entry.drawn as d, i}
                <button class="card" onclick={() => (reading.inspect = { ...d, label: entry.spread.positions[i].label })}>
                  <span class="face"><CardImg deck={settings.deck} cardId={d.cardId} alt={CARD_BY_ID[d.cardId].name} reversed={d.reversed} lazy /></span>
                  <span>{entry.spread.positions[i].label}</span>
                </button>
              {/each}
            </div>

            <div class="actions">
              <button class="btn-ghost" onclick={() => layOnTable(entry)} disabled={reading.busy}><Icon name="table" size={18} /> On the table</button>
              <button class="btn-ghost" onclick={() => share(entry)} disabled={sharing}><Icon name="share" size={18} /> {sharing ? 'Preparing…' : 'Share image'}</button>
            </div>

            <label class="notes">
              <span class="eyebrow">Your notes</span>
              <textarea
                rows="4"
                placeholder="What came up for you? What happened next?"
                value={entry.notes}
                oninput={(ev) => journal.update(entry.id, { notes: (ev.currentTarget as HTMLTextAreaElement).value })}
              ></textarea>
            </label>

            <div class="story">
              <div class="eyebrow">Told by {NARRATORS[entry.narrator].name}</div>
              {#each story as ch}
                <article class:synth={ch.kind === 'synthesis'}>
                  <h3>
                    <span class="lbl">{ch.numeral} · {ch.title}</span>
                    {#if ch.kind === 'card'}
                      <span class="card-name">{ch.subtitle.replace(' · reversed', '')}{#if ch.reversed}<span class="rv">&nbsp;· reversed</span>{/if}</span>
                    {:else}
                      <span class="card-name">{ch.subtitle}</span>
                    {/if}
                  </h3>
                  {#each ch.paragraphs as p}<p>{p}</p>{/each}
                </article>
              {/each}
            </div>

            <button class="delete" onclick={() => del(entry)}>
              <Icon name="trash" size={18} /> Delete this reading
            </button>
          </div>
        </div>
      {/key}
    {:else}
      <div class="view" in:fly={{ x: -30, duration: 350 }}>
        <header>
          <div class="htext">
            <div class="eyebrow">{journal.entries.length} {journal.entries.length === 1 ? 'reading' : 'readings'}</div>
            <h2>Journal</h2>
          </div>
          <button class="round" onclick={close} aria-label="Close journal"><Icon name="close" /></button>
        </header>

        <div class="views" role="tablist" aria-label="Journal view">
          <button role="tab" aria-selected={view === 'readings'} onclick={() => (view = 'readings')}>Readings</button>
          <button role="tab" aria-selected={view === 'insights'} onclick={() => { view = 'insights'; stopSelecting(); }}>Insights</button>
        </div>

        {#if view === 'insights'}
          <div class="scroll"><JournalInsights /></div>
        {:else}
        <label class="search">
          <Icon name="search" size={17} />
          <input type="search" placeholder="Search cards, spreads or notes" bind:value={query} aria-label="Search the journal" />
        </label>

        <div class="toolbar">
          {#if selecting}
            <button class="chip" onclick={toggleAll}>{allSelected ? 'Select none' : 'Select all'}</button>
            <span class="count">{selected.size} selected</span>
            <button class="chip" onclick={stopSelecting}>Cancel</button>
          {:else}
            <div class="chips">
              <button class="chip" aria-pressed={filter === 'all'} onclick={() => (filter = 'all')}>All</button>
              <button class="chip" aria-pressed={filter === 'fav'} onclick={() => (filter = 'fav')}>Favourites</button>
            </div>
            <div class="tools">
              <button class="chip" onclick={() => (selecting = true)} disabled={!list.length}>Select</button>
              <button class="round small" onclick={importFile} aria-label="Import journal file" title="Import"><Icon name="upload" size={18} /></button>
              <button class="round small" onclick={exportAll} aria-label="Export journal" title="Export" disabled={!journal.entries.length}><Icon name="download" size={18} /></button>
            </div>
          {/if}
        </div>

        <div class="scroll">
          {#if !journal.writable}
            <p class="warn">This browser is not letting Arcana save. Readings will be lost when you close the page.</p>
          {/if}
          {#if list.length === 0}
            <div class="empty">
              <Icon name="book" size={34} />
              <p>
                {query.trim()
                  ? `Nothing matches “${query.trim()}”.`
                  : filter === 'fav'
                    ? 'No favourites yet. Tap the heart on a reading to keep it here.'
                    : 'Your finished readings will be kept here, on this device.'}
              </p>
            </div>
          {/if}
          <ul>
            {#each list as e (e.id)}
              <li animate:flip={{ duration: 300 }} out:fade={{ duration: 200 }}>
                <button class="row" class:picked={selected.has(e.id)} onclick={() => open(e)} aria-pressed={selecting ? selected.has(e.id) : undefined}>
                  {#if selecting}
                    <span class="check" aria-hidden="true">{#if selected.has(e.id)}<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>{/if}</span>
                  {/if}
                  <div class="thumbs" style="--n: {Math.min(e.drawn.length, 5)}">
                    {#each e.drawn.slice(0, 5) as d, i}
                      <span class="mini" style="--i: {i}"><CardImg deck={settings.deck} cardId={d.cardId} reversed={d.reversed} lazy /></span>
                    {/each}
                  </div>
                  <div class="meta">
                    <div class="name">{e.spread.name}</div>
                    <div class="date">{formatDate(e.createdAt)}</div>
                    {#if e.notes}<div class="note">{e.notes}</div>{/if}
                  </div>
                  {#if e.favorite}<span class="heart"><Icon name="heart-fill" size={16} /></span>{/if}
                </button>
              </li>
            {/each}
          </ul>
        </div>
        {#if selecting}
          <div class="bulk" transition:fly={{ y: 30, duration: 250 }}>
            <button class="btn-primary danger" onclick={deleteSelected} disabled={!selected.size}>
              <Icon name="trash" size={18} /> Delete {selected.size || ''} {selected.size === 1 ? 'reading' : 'readings'}
            </button>
          </div>
        {/if}
        {/if}
      </div>
    {/if}
  </aside>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgba(0, 0, 0, 0.45);
  }
  .sheet {
    position: fixed;
    z-index: 31;
    left: 0;
    right: 0;
    bottom: 0;
    height: 90vh;
    height: 90dvh;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius) var(--radius) 0 0;
    background: var(--panel-solid);
    overflow: hidden;
  }
  .view {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px 8px;
  }
  .htext {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 2px 0 0;
    font-size: var(--fs-h2);
    font-weight: 600;
    line-height: 1.1;
  }
  .round {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--line);
    transition: transform 0.2s var(--ease-out), color 0.2s;
  }
  .round:active {
    transform: scale(0.92);
  }
  .round.small {
    width: 40px;
    height: 40px;
  }
  .round:disabled {
    opacity: 0.4;
  }
  .fav.on {
    color: #e0707f;
    border-color: #e0707f;
  }
  .views {
    display: flex;
    gap: 4px;
    margin: 0 16px 8px;
    padding: 4px;
    border-radius: 999px;
    border: 1px solid var(--line);
  }
  .views button {
    flex: 1;
    padding: 7px 8px;
    border-radius: 999px;
    color: var(--muted);
    font-family: var(--display);
    font-size: var(--fs-label);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: all 0.25s var(--ease-out);
  }
  .views button[aria-selected='true'] {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 16px 6px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    color: var(--muted);
  }
  .search:focus-within {
    border-color: var(--accent);
  }
  .search input {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-base);
  }
  .search input:focus {
    outline: none;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 16px 10px;
    border-bottom: 1px solid var(--line);
  }
  .tools {
    display: flex;
    gap: 8px;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px calc(var(--safe-bottom) + 24px);
    overscroll-behavior: contain;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 4px;
    border-bottom: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
    text-align: left;
    transition: background 0.2s;
  }
  .row:active {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .thumbs {
    position: relative;
    flex: none;
    width: calc(34px + (var(--n) - 1) * 11px);
    height: 58px;
  }
  .mini {
    position: absolute;
    top: 0;
    left: calc(var(--i) * 11px);
    width: 34px;
    height: 58px;
    border-radius: 3px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    transform: rotate(calc((var(--i) - 2) * 3deg));
  }
  .meta {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-weight: 600;
    font-size: var(--fs-md);
  }
  .date {
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .note {
    color: var(--muted);
    font-style: italic;
    font-size: var(--fs-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .heart {
    color: #e0707f;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 48px 20px;
    color: var(--muted);
    text-align: center;
    font-style: italic;
    font-size: var(--fs-md);
  }
  .warn {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #c0604a;
    color: var(--text);
    font-size: var(--fs-sm);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 12px 10px;
    padding: 6px 0 14px;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .face {
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1.75;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: transform 0.25s var(--ease-out);
  }
  .card:active .face {
    transform: scale(0.95);
  }
  .card span {
    font-size: var(--fs-xs);
    color: var(--muted);
    text-align: center;
    line-height: 1.1;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 14px;
  }
  .actions .btn-ghost {
    flex: 1;
  }
  .notes {
    display: block;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  textarea {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--text) 5%, transparent);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-read);
    line-height: var(--lh-read);
    resize: vertical;
  }
  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }
  .story {
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  article {
    padding: 10px 0;
  }
  h3 {
    margin: 0 0 8px;
  }
  h3 .card-name {
    display: block;
    margin-top: 3px;
  }
  h3 .lbl {
    display: block;
    font-family: var(--display);
    font-size: var(--fs-label);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 500;
  }
  article p {
    margin: 0 0 0.7em;
    font-size: var(--fs-read);
    line-height: var(--lh-read);
  }
  .delete {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    margin-top: 8px;
    border-radius: 12px;
    color: var(--muted);
    border: 1px dashed var(--line);
    transition: all 0.25s;
  }
  .delete:active {
    background: color-mix(in srgb, #a8443a 15%, transparent);
  }
  .count {
    color: var(--muted);
    font-style: italic;
  }
  .row.picked {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .check {
    flex: none;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1.5px solid var(--line);
    color: var(--accent-ink);
    transition: background 0.2s, border-color 0.2s;
  }
  .picked .check {
    background: var(--accent);
    border-color: var(--accent);
  }
  .bulk {
    padding: 10px 16px calc(var(--safe-bottom) + 14px);
    border-top: 1px solid var(--line);
  }
  .bulk .btn-primary {
    width: 100%;
  }
  .btn-primary.danger {
    background: linear-gradient(180deg, #c45a4c, #a8443a);
    color: #fff;
    box-shadow: 0 8px 24px rgba(168, 68, 58, 0.35);
  }
  @media (min-width: 900px) {
    .sheet {
      top: 20px;
      bottom: 20px;
      left: auto;
      right: 20px;
      width: 460px;
      height: auto;
      border-radius: var(--radius);
    }
  }
</style>

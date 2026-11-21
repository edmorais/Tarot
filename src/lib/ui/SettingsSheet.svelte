<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { settings, TEXT_SCALE, type TextSize } from '../state/settings.svelte';

  const SIZES: { id: TextSize; label: string }[] = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
  ];
  import { reading } from '../state/reading.svelte';
  import { DECKS, isDrawn, type DeckId } from '../data/decks';
  import CardImg from './CardImg.svelte';
  import { THEMES } from '../data/themes';
  import { NARRATOR_LIST, type NarratorId } from '../story/narrators';
  import Icon from './Icon.svelte';
  import { ui } from '../state/ui.svelte';
  import { pwa } from '../state/pwa.svelte';
  import { DECK_BY_ID } from '../data/decks';

  /** a new deck means new pictures: retell any open reading with that deck's scenes */
  function chooseDeck(id: DeckId) {
    settings.deck = id;
    reading.retell();
  }

  function setNarrator(id: NarratorId) {
    settings.narrator = id;
    reading.retell();
  }

  $effect(() => {
    if (ui.settingsOpen && !isDrawn(settings.deck)) void pwa.countCached(settings.deck);
  });

  const cachedNow = $derived(pwa.cached[settings.deck] ?? 0);
  const dl = $derived(pwa.downloading?.deck === settings.deck ? pwa.downloading : null);

  async function keepOffline() {
    const failed = await pwa.cacheDeck(settings.deck);
    ui.say(failed ? `${failed} cards could not be saved — try again online` : `${DECK_BY_ID[settings.deck].name} is ready offline`);
  }

  async function install() {
    if (await pwa.install()) ui.say('Arcana is on your home screen');
  }
</script>

<svelte:window onkeydown={(e) => ui.settingsOpen && e.key === 'Escape' && (ui.settingsOpen = false)} />

{#if ui.settingsOpen}
  <div class="backdrop" transition:fade={{ duration: 250 }} onclick={() => (ui.settingsOpen = false)} role="presentation"></div>
  <aside class="sheet panel" transition:fly={{ y: 80, duration: 450, opacity: 0 }} aria-label="Settings">
    <header>
      <h2>Settings</h2>
      <button class="close" onclick={() => (ui.settingsOpen = false)} aria-label="Close settings"><Icon name="close" /></button>
    </header>

    <div class="scroll">
      <!-- ── what the cards do ── -->
      <h3 class="group">The reading<small>How the cards are drawn and read</small></h3>

      <section>
        <p class="eyebrow">Narrator</p>
        <div class="chips">
          {#each NARRATOR_LIST as n}
            <button class="chip" aria-pressed={settings.narrator === n.id} onclick={() => setNarrator(n.id)}>{n.name}</button>
          {/each}
        </div>
      </section>

      <section>
        <p class="eyebrow">Drawing the cards</p>
        <div class="chips">
          <button class="chip" aria-pressed={settings.drawMode === 'pick'} onclick={() => (settings.drawMode = 'pick')}>Pick from the fan</button>
          <button class="chip" aria-pressed={settings.drawMode === 'deal'} onclick={() => (settings.drawMode = 'deal')}>Cut &amp; deal</button>
        </div>
      </section>

      <section class="toggles">
        <label><span>Reversed cards<small>Some cards may land upside down, changing their meaning.</small></span>
          <input type="checkbox" bind:checked={settings.reversals} /></label>
      </section>

      <!-- ── how it looks ── -->
      <h3 class="group">Look &amp; feel<small>Cards, table and text</small></h3>

      <section>
        <p class="eyebrow">Deck</p>
        <div class="decks">
          {#each DECKS as d}
            <button class="deck" aria-pressed={settings.deck === d.id} onclick={() => chooseDeck(d.id)}>
              <span class="preview"><CardImg deck={d.id} cardId="major-17" /></span>
              <span class="dn">{d.name}</span>
              <span class="do">{d.origin}</span>
            </button>
          {/each}
        </div>
        {#key settings.deck}
          <p class="deck-blurb" in:fade={{ duration: 300 }}>{DECK_BY_ID[settings.deck].blurb}</p>
        {/key}
      </section>

      <section>
        <p class="eyebrow">Table</p>
        <div class="themes">
          {#each THEMES as t}
            <button class="theme" aria-pressed={settings.theme === t.id} onclick={() => (settings.theme = t.id)}>
              <span class="sw" style="background: radial-gradient(circle at 35% 30%, {t.table.sheen ?? t.table.base}, {t.table.base} 60%, {t.fog})"></span>
              <span>{t.name}</span>
            </button>
          {/each}
        </div>
      </section>

      <section>
        <p class="eyebrow">Text size</p>
        <div class="sizes" role="radiogroup" aria-label="Text size">
          {#each SIZES as s}
            <button class="size" role="radio" aria-checked={settings.textSize === s.id} onclick={() => (settings.textSize = s.id)}>
              <span class="aa" style="font-size: calc(1.5rem * {TEXT_SCALE[s.id]})">Aa</span>
              <span>{s.label}</span>
            </button>
          {/each}
        </div>
        <p class="size-sample">The cards have spoken one by one. Now hear them as a single voice.</p>
      </section>

      <section class="toggles">
        <label><span>Position names<small>Show what each place in the spread means, beside it on the table.</small></span>
          <input type="checkbox" bind:checked={settings.labels} /></label>
      </section>

      <section>
        <p class="eyebrow">Graphics</p>
        <div class="chips">
          <button class="chip" aria-pressed={settings.graphics === 'auto'} onclick={() => (settings.graphics = 'auto')}>Auto</button>
          <button class="chip" aria-pressed={settings.graphics === 'full'} onclick={() => (settings.graphics = 'full')}>Full</button>
          <button class="chip" aria-pressed={settings.graphics === 'saver'} onclick={() => (settings.graphics = 'saver')}>Battery saver</button>
        </div>
        <p class="gfx-note">
          {#if settings.graphics === 'auto'}
            {ui.autoSaver ? 'This device seemed slow, so the battery saver is on.' : 'Full detail, switching to the battery saver if this device runs slowly.'}
          {:else if settings.graphics === 'saver'}
            No shadows or floating dust, and a lower resolution. Smoother on older phones and easier on the battery.
          {:else}
            Shadows, dust and full resolution, always.
          {/if}
        </p>
      </section>

      <!-- ── what you hear and feel ── -->
      <h3 class="group">Sound &amp; touch</h3>

      <section class="toggles">
        <label><span>Sound<small>Shuffles, flips and chimes.</small></span><input type="checkbox" bind:checked={settings.sound} /></label>
        <label><span>Ambience<small>A quiet soundscape for the table: candle crackle, distant chimes, wind or dripping stone.</small></span>
          <input type="checkbox" bind:checked={settings.ambience} disabled={!settings.sound} /></label>
        <label><span>Vibration<small>On supported phones.</small></span><input type="checkbox" bind:checked={settings.haptics} /></label>
      </section>

      <!-- ── the app itself ── -->
      <h3 class="group">App &amp; offline</h3>

      <section class="app">
        {#if pwa.needRefresh}
          <div class="line">
            <span>A new version of Arcana is ready.</span>
            <button class="btn-ghost" onclick={() => pwa.update()}>Update</button>
          </div>
        {/if}
        <div class="line">
          {#if pwa.installed}
            <span>Installed on this device.</span>
          {:else if pwa.canInstall}
            <span>Add Arcana to your home screen. It opens full screen and works offline.</span>
            <button class="btn-ghost" onclick={install}><Icon name="install" size={18} /> Install</button>
          {:else if pwa.isIos}
            <span>To install on iPhone or iPad: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</span>
          {:else}
            <span>To install, use your browser’s menu: <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
          {/if}
        </div>
        {#if isDrawn(settings.deck)}
          <div class="line">
            <span><strong>{DECK_BY_ID[settings.deck].name}</strong> is drawn on your device, so it is always available offline.</span>
          </div>
        {:else if pwa.supported}
          <div class="line col">
            <span>
              Card art for <strong>{DECK_BY_ID[settings.deck].name}</strong>:
              {dl ? dl.done : cachedNow} of 78 kept offline.
              {#if cachedNow < 78 && !dl}Cards are also saved as you draw them.{/if}
            </span>
            {#if dl}
              <div class="bar" role="progressbar" aria-valuenow={dl.done} aria-valuemin={0} aria-valuemax={dl.total}>
                <div style="width: {(dl.done / dl.total) * 100}%"></div>
              </div>
            {:else if cachedNow < 78}
              <button class="btn-ghost" onclick={keepOffline}><Icon name="download" size={18} /> Keep this deck offline (about 10 MB)</button>
            {/if}
          </div>
        {/if}
      </section>

      <p class="credit">
        Rider–Waite–Smith artwork by Pamela Colman Smith (1909) and the Tarot de Marseille of Jean Dodal (c. 1701), both in the public domain, via Wikimedia Commons. The Celestial and Art Nouveau decks are original to Arcana.
      </p>
    </div>
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
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius) var(--radius) 0 0;
    background: var(--panel-solid);
  }
  header {
    display: flex;
    align-items: center;
    padding: 14px 16px 6px;
  }
  h2 {
    margin: 0;
    font-family: var(--display);
    font-weight: 500;
    font-size: var(--fs-base);
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  .close {
    margin-left: auto;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--line);
  }
  .scroll {
    overflow-y: auto;
    padding: 0 16px calc(var(--safe-bottom) + 20px);
    overscroll-behavior: contain;
  }
  section {
    padding: 20px 0;
    border-bottom: 1px solid var(--line);
  }
  /* the four groups: what the reading does, how it looks, sound & touch, the app */
  .group {
    margin: 34px 0 0;
    padding-bottom: 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    font-family: var(--display);
    font-weight: 400;
    font-size: var(--fs-md);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text);
  }
  .group:first-child {
    margin-top: 6px;
  }
  .group small {
    display: block;
    margin-top: 3px;
    font-family: var(--serif);
    font-size: var(--fs-sm);
    font-style: italic;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
  }
  .group + section {
    padding-top: 16px;
  }
  /* a lone switch needs less air than a block of choices */
  section.toggles {
    padding: 12px 0;
  }
  .eyebrow {
    margin: 0 0 12px;
  }
  .decks {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .deck {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--line);
    text-align: left;
    transition: all 0.3s var(--ease-out);
  }
  .deck[aria-pressed='true'] {
    border-color: var(--accent);
    box-shadow: 0 0 20px var(--glow);
  }
  .preview {
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1.75;
    border-radius: 6px;
    overflow: hidden;
  }
  .sizes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .size {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    min-height: 74px;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--line);
    color: var(--muted);
    font-size: var(--fs-sm);
    transition: all 0.25s var(--ease-out);
  }
  .size .aa {
    color: var(--text);
    line-height: 1;
  }
  .size[aria-checked='true'] {
    border-color: var(--accent);
    color: var(--accent);
    box-shadow: 0 0 20px var(--glow);
  }
  .size-sample {
    margin: 10px 0 0;
    font-size: var(--fs-read);
    line-height: var(--lh-read);
  }
  .gfx-note {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: var(--fs-sm);
    line-height: 1.35;
  }
  .deck-blurb {
    margin: 10px 0 0;
    color: var(--muted);
    font-style: italic;
    line-height: 1.35;
  }
  .dn {
    font-weight: 600;
    line-height: 1.1;
    font-size: var(--fs-sm);
  }
  .do {
    font-size: var(--fs-xs);
    color: var(--muted);
    line-height: 1.15;
  }
  .themes {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .theme {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid var(--line);
    text-align: left;
    font-size: var(--fs-sm);
  }
  .theme[aria-pressed='true'] {
    border-color: var(--accent);
  }
  .sw {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex: none;
    border: 1px solid var(--line);
  }
  .toggles label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    font-size: var(--fs-base);
  }
  .toggles small {
    display: block;
    color: var(--muted);
    font-size: var(--fs-xs);
  }
  input[type='checkbox'] {
    appearance: none;
    flex: none;
    width: 48px;
    height: 28px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--text) 10%, transparent);
    position: relative;
    cursor: pointer;
    transition: background 0.25s;
  }
  input[type='checkbox']::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--text);
    transition: transform 0.3s var(--ease-out);
  }
  input[type='checkbox']:checked {
    background: var(--accent);
  }
  input[type='checkbox']:checked::after {
    transform: translateX(20px);
    background: var(--accent-ink);
  }
  .app .line {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    font-size: var(--fs-base);
    line-height: 1.35;
  }
  .app .line > span {
    flex: 1;
  }
  .app .line.col {
    flex-direction: column;
    align-items: stretch;
  }
  .app strong {
    color: var(--accent);
    font-weight: 600;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }
  .bar div {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s var(--ease-out);
  }
  .credit {
    font-size: var(--fs-xs);
    color: var(--muted);
    font-style: italic;
    line-height: 1.4;
  }
  @media (min-width: 900px) {
    .sheet {
      top: 20px;
      bottom: 20px;
      left: auto;
      right: 20px;
      width: 420px;
      max-height: none;
      border-radius: var(--radius);
    }
  }
</style>

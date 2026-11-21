<script lang="ts">
  import Icon from './Icon.svelte';
  import { reading } from '../state/reading.svelte';
  import { inset } from './inset';
  import { ui } from '../state/ui.svelte';
  import { journal } from '../state/journal.svelte';
</script>

<header use:inset={{ mobile: 'top', desktop: 'top' }}>
  <div class="brand">
    <span class="mark"><Icon name="star" size={14} /></span>
    <span>Arcana</span>
  </div>
  {#if reading.phase !== 'home'}
    <div class="spread">{reading.spread.name}</div>
  {/if}
  <div class="actions">
    {#if reading.phase !== 'home'}
      <button class="icon" onclick={() => reading.reset()} aria-label="End reading" disabled={reading.busy}>
        <Icon name="restart" />
      </button>
    {/if}
    <button class="icon" onclick={() => ui.openJournal()} aria-label="Journal">
      <Icon name="book" />
      {#if journal.entries.length}<span class="badge">{journal.entries.length > 99 ? '99+' : journal.entries.length}</span>{/if}
    </button>
    <button class="icon" onclick={() => (ui.settingsOpen = true)} aria-label="Settings">
      <Icon name="settings" />
    </button>
  </div>
</header>

<style>
  header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: calc(var(--safe-top) + 10px) 16px 10px;
    pointer-events: none;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--bg) 70%, transparent), transparent);
  }
  header > * {
    pointer-events: auto;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    font-family: var(--display);
    font-size: var(--fs-base);
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--text);
  }
  .mark {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--line);
    color: var(--accent);
    animation: spin 40s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .spread {
    flex: 1;
    min-width: 0;
    text-align: center;
    font-style: italic;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .actions {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    color: var(--text);
    background: color-mix(in srgb, var(--panel-solid) 55%, transparent);
    border: 1px solid var(--line);
    backdrop-filter: blur(10px);
    transition: transform 0.2s var(--ease-out);
  }
  .icon {
    position: relative;
  }
  .badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: var(--fs-label);
    font-weight: 700;
    line-height: 18px;
    font-family: system-ui, sans-serif;
  }
  .icon:active {
    transform: scale(0.92);
  }
  .icon:disabled {
    opacity: 0.4;
  }
</style>

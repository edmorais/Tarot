<script lang="ts">
  import { Canvas } from '@threlte/core';
  import * as THREE from 'three';
  import { fade, fly } from 'svelte/transition';
  import Scene from './lib/three/Scene.svelte';
  import TopBar from './lib/ui/TopBar.svelte';
  import HomeSheet from './lib/ui/HomeSheet.svelte';
  import ActionDock from './lib/ui/ActionDock.svelte';
  import StorySheet from './lib/ui/StorySheet.svelte';
  import SettingsSheet from './lib/ui/SettingsSheet.svelte';
  import JournalSheet from './lib/ui/JournalSheet.svelte';
  import InspectModal from './lib/ui/InspectModal.svelte';
  import TableLabels from './lib/ui/TableLabels.svelte';
  import { reading } from './lib/state/reading.svelte';
  import { settings, TEXT_SCALE } from './lib/state/settings.svelte';
  import { ui } from './lib/state/ui.svelte';
  import { pwa } from './lib/state/pwa.svelte';
  import { rig } from './lib/three/TableRig';
  import Icon from './lib/ui/Icon.svelte';
  import { setAmbience } from './lib/audio/ambience';
  import { hints } from './lib/state/hints.svelte';
  import { THEME_BY_ID } from './lib/data/themes';

  const theme = $derived(THEME_BY_ID[settings.theme]);
  const dock = $derived(['shuffle', 'cut', 'pick', 'dealing'].includes(reading.phase));
  const story = $derived(reading.phase === 'reveal' || reading.phase === 'done');

  // first-run hints, each at the moment it helps; doing the thing dismisses it
  $effect(() => {
    const p = reading.phase;
    if (p === 'home') hints.offer('table', 2200);
    else if (p === 'reveal' && reading.revealed === 0) hints.offer('turn', 1400);
    else if (p === 'reveal' && reading.revealed === 1) {
      hints.dismiss('turn');
      hints.offer('inspect', 1800);
    } else if (p === 'done') hints.offer('journal', 2600);
  });
  $effect(() => {
    if (ui.viewMoved) hints.dismiss('table');
  });
  $effect(() => {
    if (reading.inspect) hints.dismiss('inspect');
  });
  $effect(() => {
    if (ui.journalOpen) hints.dismiss('journal');
  });

  // the table's soundscape follows the theme; it needs sound on and the ambience switch
  $effect(() => {
    setAmbience(settings.sound && settings.ambience ? settings.theme : null);
  });

  // apply a waiting app update only when it cannot interrupt anything
  $effect(() => {
    if (!pwa.needRefresh) return;
    const onHide = () => {
      if (document.hidden && reading.phase === 'home') void pwa.update();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  });

  $effect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme.ui)) root.style.setProperty(k, v);
    root.style.colorScheme = theme.dark ? 'dark' : 'light';
    root.style.setProperty('--read-scale', String(TEXT_SCALE[settings.textSize] ?? 1));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.fog);
  });
</script>

<div class="stage">
  <Canvas dpr={[1, 2]} toneMapping={THREE.NeutralToneMapping} shadows={THREE.PCFSoftShadowMap} renderMode="always">
    <Scene />
  </Canvas>
</div>

<TableLabels />

<TopBar />

{#if reading.phase === 'home'}
  <HomeSheet />
{:else if dock}
  <ActionDock />
{:else if story}
  <StorySheet />
{/if}

<SettingsSheet />
<JournalSheet />
<InspectModal />

{#if hints.current}
  {#key hints.current.id}
    <div class="hint" role="status" in:fly={{ y: -12, duration: 400 }} out:fade={{ duration: 250 }}>
      <span class="spark"><Icon name="star" size={13} /></span>
      <span class="htxt">{hints.current.text}</span>
      <button onclick={() => hints.dismiss()} aria-label="Dismiss tip">Got it</button>
    </div>
  {/key}
{:else if ui.viewMoved}
  <button class="reset-view" onclick={() => rig.resetView()} transition:fly={{ y: -10, duration: 300 }} aria-label="Reset the view of the table">
    <Icon name="restart" size={15} /> Reset view
  </button>
{/if}

{#if ui.toast}
  {#key ui.toast.id}
    <div class="toast" class:has-action={!!ui.toast.action} role="status" in:fly={{ y: -16, duration: 300 }} out:fly={{ y: -16, duration: 250 }}>
      <span>{ui.toast.text}</span>
      {#if ui.toast.action}
        <button onclick={() => ui.runToastAction()}>{ui.toast.action.label}</button>
      {/if}
    </div>
  {/key}
{/if}

<style>
  .stage {
    position: absolute;
    inset: 0;
    touch-action: none;
  }
  .hint {
    position: fixed;
    z-index: 16;
    top: calc(var(--safe-top) + 66px);
    left: 50%;
    translate: -50% 0;
    width: min(360px, calc(100vw - 32px));
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px 10px 14px;
    border-radius: 16px;
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--panel-solid) 88%, transparent);
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 24px var(--glow);
    color: var(--text);
    font-size: var(--fs-sm);
    line-height: 1.35;
  }
  .hint .spark {
    color: var(--accent);
    flex: none;
    display: grid;
  }
  .hint .htxt {
    flex: 1;
  }
  .hint button {
    flex: none;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-family: var(--display);
    font-size: var(--fs-label);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .reset-view {
    position: fixed;
    z-index: 15;
    top: calc(var(--safe-top) + 66px);
    left: 50%;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel-solid) 70%, transparent);
    backdrop-filter: blur(10px);
    color: var(--text);
    font-family: var(--display);
    font-size: var(--fs-label);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .reset-view:active {
    transform: scale(0.96);
  }
  .toast {
    position: fixed;
    z-index: 60;
    top: calc(var(--safe-top) + 70px);
    left: 50%;
    translate: -50% 0;
    max-width: calc(100vw - 32px);
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--panel-solid);
    border: 1px solid var(--accent);
    color: var(--text);
    font-size: var(--fs-base);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 14px;
    white-space: nowrap;
  }
  .toast.has-action {
    pointer-events: auto;
    padding-right: 6px;
  }
  .toast button {
    min-height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-ink);
    font-family: var(--display);
    font-size: var(--fs-label);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
</style>

<script lang="ts">
  // A card face that fills its container, for photo and drawn decks alike.
  import { faceSrc } from '../art/faces';
  import type { DeckId } from '../data/decks';

  let { deck, cardId, alt = '', reversed = false, lazy = false }: { deck: DeckId; cardId: string; alt?: string; reversed?: boolean; lazy?: boolean } = $props();

  let src = $state<string | null>(null);

  $effect(() => {
    let live = true;
    src = null;
    faceSrc(deck, cardId).then(
      (s) => {
        if (live) src = s;
      },
      () => {},
    );
    return () => (live = false);
  });
</script>

{#if src}
  <img {src} {alt} class:rev={reversed} loading={lazy ? 'lazy' : 'eager'} decoding="async" draggable="false" />
{:else}
  <span class="ph" role="img" aria-label={alt}></span>
{/if}

<style>
  img,
  .ph {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }
  .rev {
    transform: rotate(180deg);
  }
  .ph {
    background: linear-gradient(110deg, color-mix(in srgb, var(--accent) 10%, transparent) 30%, color-mix(in srgb, var(--accent) 24%, transparent) 50%, color-mix(in srgb, var(--accent) 10%, transparent) 70%);
    background-size: 250% 100%;
    animation: shimmer 1.4s linear infinite;
  }
  @keyframes shimmer {
    to {
      background-position: -150% 0;
    }
  }
</style>

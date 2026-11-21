<script lang="ts">
  type Name =
    | 'settings' | 'close' | 'restart' | 'star' | 'chevron' | 'book' | 'back'
    | 'heart' | 'heart-fill' | 'share' | 'download' | 'upload' | 'trash' | 'table' | 'install' | 'search';
  let { name, size = 22 }: { name: Name; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'settings'}
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  {:else if name === 'close'}
    <path d="M6 6l12 12M18 6L6 18" />
  {:else if name === 'restart'}
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4h4" />
  {:else if name === 'star'}
    <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor" stroke="none" />
  {:else if name === 'chevron'}
    <path d="M6 15l6-6 6 6" />
  {:else if name === 'book'}
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <path d="M12 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" stroke="none" />
  {:else if name === 'back'}
    <path d="M15 5l-7 7 7 7" />
  {:else if name === 'heart' || name === 'heart-fill'}
    <path
      d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
      fill={name === 'heart-fill' ? 'currentColor' : 'none'}
    />
  {:else if name === 'share'}
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  {:else if name === 'download'}
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 19h16" />
  {:else if name === 'upload'}
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M4 19h16" />
  {:else if name === 'trash'}
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  {:else if name === 'table'}
    <rect x="3" y="6" width="5" height="9" rx="1" />
    <rect x="9.5" y="6" width="5" height="9" rx="1" />
    <rect x="16" y="6" width="5" height="9" rx="1" />
    <path d="M3 19h18" />
  {:else if name === 'search'}
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  {:else if name === 'install'}
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M12 7v7M9 11l3 3 3-3" />
  {/if}
</svg>

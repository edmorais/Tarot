// First-run hints: each shows once, at the moment it is useful, then never again.
const KEY = 'arcana.hints.v1';

export const HINTS = {
  table: 'Drag the table to turn it, pinch to zoom. Double-tap to set it straight again.',
  turn: 'Tap the glowing card to turn it, or use the button below.',
  inspect: 'Tap any turned card to see it up close.',
  journal: 'Finished readings are kept in your journal, at the top right.',
} as const;
export type HintId = keyof typeof HINTS;

function load(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

class Hints {
  current = $state<{ id: HintId; text: string } | null>(null);
  private seen = load();
  private pending = 0;
  private hide = 0;

  /** Show a hint once, after a short pause, unless it has been seen before. */
  offer(id: HintId, delay = 1200) {
    if (this.seen.has(id) || this.current?.id === id) return;
    clearTimeout(this.pending);
    this.pending = window.setTimeout(() => {
      if (this.seen.has(id)) return;
      this.current = { id, text: HINTS[id] };
      this.markSeen(id);
      clearTimeout(this.hide);
      this.hide = window.setTimeout(() => this.dismiss(id), 8000);
    }, delay);
  }

  /** Close a hint (or the one showing); a hint dismissed early never comes back. */
  dismiss(id?: HintId) {
    if (id) this.markSeen(id);
    if (!id || this.current?.id === id) {
      clearTimeout(this.hide);
      this.current = null;
    }
    if (id) clearTimeout(this.pending);
  }

  private markSeen(id: HintId) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.seen]));
    } catch {
      /* private mode: hints may show again next time */
    }
  }
}

export const hints = new Hints();

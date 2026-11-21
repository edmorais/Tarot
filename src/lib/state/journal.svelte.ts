// The reading journal. Entries live in localStorage on this device only.
// The story text is not stored: it is regenerated from the seed, the spread
// and the cards, so it always matches the current narrator voices.
import type { DeckId } from '../data/decks';
import type { Spread } from '../data/spreads';
import type { Drawn } from '../story/story';
import type { NarratorId } from '../story/narrators';
import { CARD_BY_ID } from '../data/cards';

const KEY = 'arcana.journal.v1';

export interface JournalEntry {
  id: string;
  createdAt: number;
  spread: Spread;
  deck: DeckId;
  narrator: NarratorId;
  drawn: Drawn[];
  notes: string;
  favorite: boolean;
}

export interface ExportFile {
  app: 'arcana';
  version: 1;
  exportedAt: string;
  entries: JournalEntry[];
}

function load(): JournalEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function isEntry(e: unknown): e is JournalEntry {
  if (!e || typeof e !== 'object') return false;
  const x = e as JournalEntry;
  return (
    typeof x.id === 'string' &&
    typeof x.createdAt === 'number' &&
    !!x.spread &&
    Array.isArray(x.spread.positions) &&
    Array.isArray(x.drawn) &&
    x.drawn.length === x.spread.positions.length &&
    x.drawn.every((d) => d && typeof d.cardId === 'string' && CARD_BY_ID[d.cardId] && typeof d.reversed === 'boolean')
  );
}

class Journal {
  entries = $state<JournalEntry[]>(load());
  /** false when the browser refused to store (private mode, quota) */
  writable = $state(true);

  constructor() {
    $effect.root(() => {
      $effect(() => {
        const json = JSON.stringify(this.entries);
        try {
          localStorage.setItem(KEY, json);
          this.writable = true;
        } catch {
          this.writable = false;
        }
      });
    });
  }

  /** Today's Card of the Day, if one was drawn since local midnight. */
  todaysCard(now = new Date()): JournalEntry | undefined {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return this.entries.find((e) => e.spread.id === 'daily' && e.createdAt >= start);
  }

  get(id: string | null) {
    return id ? this.entries.find((e) => e.id === id) : undefined;
  }

  add(e: Omit<JournalEntry, 'notes' | 'favorite'>) {
    if (this.get(e.id)) return;
    this.entries = [{ ...e, spread: $state.snapshot(e.spread) as Spread, drawn: $state.snapshot(e.drawn) as Drawn[], notes: '', favorite: false }, ...this.entries];
  }

  update(id: string, patch: Partial<Pick<JournalEntry, 'notes' | 'favorite' | 'narrator'>>) {
    const i = this.entries.findIndex((e) => e.id === id);
    if (i >= 0) this.entries[i] = { ...this.entries[i], ...patch };
  }

  /** Remove entries; returns what was removed so it can be restored. */
  remove(ids: string | string[]): JournalEntry[] {
    const set = new Set(Array.isArray(ids) ? ids : [ids]);
    const removed = this.entries.filter((e) => set.has(e.id));
    this.entries = this.entries.filter((e) => !set.has(e.id));
    return $state.snapshot(removed) as JournalEntry[];
  }

  /** Put removed entries back (undo), keeping newest first. */
  restore(entries: JournalEntry[]) {
    const have = new Set(this.entries.map((e) => e.id));
    this.entries = [...this.entries, ...entries.filter((e) => !have.has(e.id))].sort((a, b) => b.createdAt - a.createdAt);
  }

  exportJson(): string {
    const file: ExportFile = {
      app: 'arcana',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: $state.snapshot(this.entries) as JournalEntry[],
    };
    return JSON.stringify(file, null, 2);
  }

  /** Merge entries from an export file; existing ids are kept as they are. */
  importJson(text: string): { added: number; skipped: number } {
    const data = JSON.parse(text) as Partial<ExportFile>;
    if (data.app !== 'arcana' || !Array.isArray(data.entries)) throw new Error('Not an Arcana journal file');
    const have = new Set(this.entries.map((e) => e.id));
    const fresh = data.entries.filter((e) => isEntry(e) && !have.has(e.id)).map((e) => ({
      ...e,
      notes: typeof e.notes === 'string' ? e.notes : '',
      favorite: !!e.favorite,
    }));
    this.entries = [...this.entries, ...fresh].sort((a, b) => b.createdAt - a.createdAt);
    return { added: fresh.length, skipped: data.entries.length - fresh.length };
  }
}

export const journal = new Journal();

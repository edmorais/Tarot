import { CARDS } from '../data/cards';
import { DECK_BY_ID } from '../data/decks';
import { SPREAD_BY_ID, type Spread } from '../data/spreads';
import { chapterFor, synthesisFor, type Chapter, type Drawn, type StoryInput } from '../story/story';
import { secureInt, secureShuffle } from '../story/rng';
import { rig } from '../three/TableRig';
import { settings } from './settings.svelte';
import { sfx } from '../audio/sfx';
import { journal, type JournalEntry } from './journal.svelte';

export type Phase = 'home' | 'shuffle' | 'cut' | 'pick' | 'dealing' | 'reveal' | 'done';

const REVERSAL_CHANCE = 30; // percent

class Reading {
  phase = $state<Phase>('home');
  spreadId = $state('ppf');
  drawn = $state<Drawn[]>([]);
  revealed = $state(0);
  chapters = $state<Chapter[]>([]);
  shuffles = $state(0);
  shuffling = $state(false);
  busy = $state(false);
  hovering = $state(-1);
  inspect = $state<{ cardId: string; reversed: boolean; label: string } | null>(null);

  id = '';
  private remaining: string[] = [];
  private holding = false;

  /** a spread restored from the journal (e.g. a Year Ahead with its original months) */
  private restoredSpread = $state<Spread | null>(null);
  spread: Spread = $derived(this.restoredSpread ?? SPREAD_BY_ID[this.spreadId]);
  total = $derived(this.spread.positions.length);
  nextLabel = $derived(this.spread.positions[Math.min(this.drawn.length, this.total - 1)].label);

  private storyInput(): StoryInput {
    return {
      id: this.id,
      spread: this.spread,
      drawn: this.drawn,
      narrator: settings.narrator,
      deck: settings.deck,
    };
  }

  chooseSpread(id: string) {
    if (this.phase !== 'home') return;
    this.spreadId = id;
    rig.setSpread(this.spread);
    void rig.gather();
  }

  async begin() {
    if (this.busy) return;
    this.id = `${Date.now().toString(36)}-${secureInt(1e9).toString(36)}`;
    this.remaining = secureShuffle(CARDS.map((c) => c.id));
    this.drawn = [];
    this.chapters = [];
    this.revealed = 0;
    this.shuffles = 0;
    this.phase = 'shuffle';
    rig.setFocus('deck');
  }

  async startShuffle() {
    if (this.phase !== 'shuffle' || this.holding) return;
    this.holding = true;
    if (this.shuffling) return; // a riffle is still finishing; it will continue the loop
    this.shuffling = true;
    do {
      await rig.riffle();
      this.remaining = secureShuffle(this.remaining);
      this.shuffles++;
    } while (this.holding);
    this.shuffling = false;
  }

  stopShuffle() {
    this.holding = false;
  }

  async finishShuffle() {
    if (this.phase !== 'shuffle' || this.shuffling) return;
    if (settings.drawMode === 'deal') {
      this.phase = 'cut';
      return;
    }
    this.busy = true;
    this.phase = 'pick';
    rig.setFocus('pick');
    await rig.fanOut();
    this.busy = false;
  }

  async cutAndDeal() {
    if (this.phase !== 'cut' || this.busy) return;
    this.busy = true;
    await rig.cut();
    this.phase = 'dealing';
    rig.setFocus('deal');
    await rig.moveDeckToDeal();
    for (let i = 0; i < this.total; i++) {
      const d = this.drawOne();
      void rig.dealTop(i, d.cardId, d.reversed);
      await new Promise((r) => setTimeout(r, this.total > 7 ? 190 : 300));
    }
    await new Promise((r) => setTimeout(r, 450));
    await this.toReveal();
    this.busy = false;
  }

  private drawOne(index?: number): Drawn {
    const k = index ?? this.remaining.length - 1;
    const cardId = this.remaining.splice(k, 1)[0];
    const d = { cardId, reversed: settings.reversals && secureInt(100) < REVERSAL_CHANCE };
    this.drawn = [...this.drawn, d];
    return d;
  }

  hover(i: number) {
    if (this.phase !== 'pick' || this.busy) return;
    this.hovering = i;
    rig.setHover(i);
  }

  async pickFromFan(k: number) {
    if (this.phase !== 'pick' || this.busy || k < 0 || this.drawn.length >= this.total) return;
    this.busy = true;
    this.hovering = -1;
    // the fan shows the shuffled order, so fan index k is remaining[k]
    const slot = this.drawn.length;
    const d = this.drawOne(k);
    await rig.takeFromFan(k, slot, d.cardId, d.reversed);
    if (this.drawn.length >= this.total) {
      await rig.collectFan();
      await this.toReveal();
    }
    this.busy = false;
  }

  async pickRandom() {
    await this.pickFromFan(secureInt(this.remaining.length));
  }

  private async toReveal() {
    this.phase = 'reveal';
    rig.setFocus('layout');
    rig.glowSlot = 0;
    void rig.stowDeck();
  }

  /** every card is face up, and the reading as a whole waits for one more tap */
  allTurned = $derived(this.phase === 'reveal' && this.revealed >= this.total);

  async revealNext() {
    if (this.phase !== 'reveal' || this.busy) return;
    if (this.allTurned) return this.revealWhole();
    this.busy = true;
    const i = this.revealed;
    rig.glowSlot = -1;
    await rig.flip(i);
    this.chapters = [...this.chapters, chapterFor(this.storyInput(), i)];
    this.revealed = i + 1;
    if (this.revealed >= this.total) {
      // the spread is complete, so keep it now, even if the reader leaves before the whole is told
      journal.add({
        id: this.id, createdAt: Date.now(), spread: this.spread, deck: settings.deck,
        narrator: settings.narrator, drawn: this.drawn,
      });
    } else {
      rig.glowSlot = this.revealed;
    }
    this.busy = false;
  }

  /** The reading as a whole: the narrator brings the cards together. */
  revealWhole() {
    if (!this.allTurned || this.busy) return;
    this.chapters = [...this.chapters, synthesisFor(this.storyInput())];
    this.phase = 'done';
    sfx.chime();
  }

  /** Re-tell the story when the narrator changes mid-reading. */
  retell() {
    if (this.phase !== 'reveal' && this.phase !== 'done') return;
    const input = this.storyInput();
    const ch = Array.from({ length: this.revealed }, (_, i) => chapterFor(input, i));
    if (this.phase === 'done') ch.push(synthesisFor(input));
    if (this.revealed >= this.total) journal.update(this.id, { narrator: settings.narrator });
    this.chapters = ch;
  }

  /** Lay a saved reading back on the table, face up, with its story. */
  async openFromJournal(e: JournalEntry) {
    if (this.busy) return;
    this.busy = true;
    this.inspect = null;
    this.restoredSpread = e.spread;
    this.id = e.id;
    this.drawn = e.drawn.map((d) => ({ ...d }));
    settings.narrator = e.narrator;
    this.phase = 'done';
    rig.glowSlot = -1;
    rig.setFocus('layout');
    await rig.gather();
    rig.setSpread(this.spread);
    this.revealed = this.total;
    const input = this.storyInput();
    this.chapters = [...this.drawn.map((_, i) => chapterFor(input, i)), synthesisFor(input)];
    await rig.layOut(this.drawn);
    this.busy = false;
  }

  tapSlot(slots: number[]) {
    if (this.phase === 'reveal' && slots.includes(this.revealed)) {
      void this.revealNext();
      return;
    }
    const shown = slots.find((s) => s < this.revealed);
    if (shown != null) this.openInspect(shown);
  }

  openInspect(i: number) {
    const d = this.drawn[i];
    if (!d) return;
    this.inspect = { ...d, label: this.spread.positions[i].label };
  }

  async reset() {
    if (this.busy) return;
    this.busy = true;
    this.phase = 'home';
    this.inspect = null;
    rig.setFocus('home');
    if (this.restoredSpread) {
      this.restoredSpread = null;
      rig.setSpread(this.spread);
    }
    await rig.gather();
    this.drawn = [];
    this.chapters = [];
    this.revealed = 0;
    this.busy = false;
  }
}

export const reading = new Reading();
if (import.meta.env.DEV) (window as unknown as { reading: Reading }).reading = reading;

import type { DeckId } from '../data/decks';
import type { ThemeId } from '../data/themes';
import type { NarratorId } from '../story/narrators';

const KEY = 'arcana.settings.v1';

export type TextSize = 'small' | 'medium' | 'large';
/** multiplier applied to reading text (stories, notes, meanings, card names) */
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, medium: 1, large: 1.14 };

interface Saved {
  textSize: TextSize;
  labels: boolean;
  ambience: boolean;
  graphics: 'auto' | 'full' | 'saver';
  deck: DeckId;
  reversals: boolean;
  drawMode: 'pick' | 'deal';
  narrator: NarratorId;
  theme: ThemeId;
  sound: boolean;
  haptics: boolean;
}

function load(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

class Settings {
  deck = $state<DeckId>('rws');
  reversals = $state(true);
  drawMode = $state<'pick' | 'deal'>('pick');
  narrator = $state<NarratorId>('oracle');
  theme = $state<ThemeId>('velvet');
  sound = $state(true);
  haptics = $state(true);
  textSize = $state<TextSize>('medium');
  /** show each position's name beside its place on the table */
  labels = $state(true);
  /** a quiet soundscape for the table; off unless chosen */
  ambience = $state(false);
  /** 'auto' turns the battery saver on by itself on slow devices */
  graphics = $state<'auto' | 'full' | 'saver'>('auto');

  constructor() {
    Object.assign(this, load());
    $effect.root(() => {
      $effect(() => {
        const s: Saved = {
          deck: this.deck, reversals: this.reversals, drawMode: this.drawMode,
          narrator: this.narrator, theme: this.theme, sound: this.sound, haptics: this.haptics,
          textSize: this.textSize, labels: this.labels, ambience: this.ambience, graphics: this.graphics,
        };
        try {
          localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
          /* private mode */
        }
      });
    });
  }
}

export const settings = new Settings();

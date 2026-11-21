import { CARD_BY_ID, SUIT_NAME, type CardDef, type Element, type Suit } from '../data/cards';
import { sceneFor } from '../data/scenes';
import type { DeckId } from '../data/decks';
import type { Position, Spread } from '../data/spreads';
import { seeded, type Rng } from './rng';
import { NARRATORS, type NarratorId } from './narrators';

export interface Drawn {
  cardId: string;
  reversed: boolean;
}

export interface Chapter {
  kind: 'card' | 'synthesis';
  numeral: string;
  title: string;
  subtitle: string;
  paragraphs: string[];
  cardId?: string;
  reversed?: boolean;
}

export interface Item {
  card: CardDef;
  reversed: boolean;
  pos: Position;
  index: number;
  name: string; // name as used mid-sentence
  image: string;
  kw: string[];
  meaning: string;
}

export type Relation = 'same' | 'friendly' | 'contrary' | 'neutral';

export interface ChapterCtx {
  rng: Rng;
  item: Item;
  prev?: Item;
  relation?: Relation;
  spread: Spread;
  total: number;
}

export interface Analysis {
  rng: Rng;
  spread: Spread;
  items: Item[];
  n: number;
  majors: number;
  reversed: number;
  courts: Item[];
  dominant?: { suit: Suit; count: number };
  missing: Element[];
  repeated: { rank: number; count: number }[];
  first: Item;
  last: Item;
  anchor: Item;
}

export interface StoryInput {
  id: string;
  spread: Spread;
  drawn: Drawn[];
  narrator: NarratorId;
  /** the deck in front of the reader, so scenes describe its pictures */
  deck: DeckId;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

export function nameInSentence(card: CardDef): string {
  if (card.arcana === 'minor') return `the ${card.name}`;
  if (card.name.startsWith('The ')) return card.name;
  if (card.name === 'Wheel of Fortune') return 'the Wheel of Fortune';
  return card.name;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function relation(a: Element, b: Element): Relation {
  if (a === b) return 'same';
  const pair = [a, b].sort().join('-');
  if (pair === 'Air-Fire' || pair === 'Earth-Water') return 'friendly';
  if (pair === 'Fire-Water' || pair === 'Air-Earth') return 'contrary';
  return 'neutral';
}

function toItem(input: StoryInput, index: number): Item {
  const d = input.drawn[index];
  const card = CARD_BY_ID[d.cardId];
  return {
    card,
    reversed: d.reversed,
    pos: input.spread.positions[index],
    index,
    name: nameInSentence(card),
    image: sceneFor(card, input.deck),
    kw: d.reversed ? card.kwRev : card.kwUp,
    meaning: d.reversed ? card.rev : card.up,
  };
}

export function chapterFor(input: StoryInput, index: number): Chapter {
  const item = toItem(input, index);
  const prev = index > 0 ? toItem(input, index - 1) : undefined;
  const ctx: ChapterCtx = {
    rng: seeded(`${input.id}:${index}:${input.narrator}`),
    item,
    prev,
    relation: prev ? relation(prev.card.element, item.card.element) : undefined,
    spread: input.spread,
    total: input.spread.positions.length,
  };
  return {
    kind: 'card',
    numeral: ROMAN[index] ?? String(index + 1),
    title: item.pos.label,
    subtitle: item.card.name + (item.reversed ? ' · reversed' : ''),
    paragraphs: NARRATORS[input.narrator].chapter(ctx),
    cardId: item.card.id,
    reversed: item.reversed,
  };
}

const ANCHOR_ROLES = ['advice', 'action', 'outcome', 'daily', 'theme'];

export function analyse(input: StoryInput): Analysis {
  const items = input.drawn.map((_, i) => toItem(input, i));
  const suitCounts: Partial<Record<Suit, number>> = {};
  const rankCounts: Record<number, number> = {};
  const elements = new Set<Element>();
  for (const it of items) {
    elements.add(it.card.element);
    if (it.card.suit) {
      suitCounts[it.card.suit] = (suitCounts[it.card.suit] ?? 0) + 1;
      if (it.card.rank <= 10) rankCounts[it.card.rank] = (rankCounts[it.card.rank] ?? 0) + 1;
    }
  }
  const sorted = (Object.entries(suitCounts) as [Suit, number][]).sort((a, b) => b[1] - a[1]);
  const dominant =
    sorted.length && sorted[0][1] >= 2 && (sorted.length === 1 || sorted[0][1] > sorted[1][1])
      ? { suit: sorted[0][0], count: sorted[0][1] }
      : undefined;
  const anchor =
    [...items].reverse().find((it) => ANCHOR_ROLES.includes(it.pos.role)) ?? items[items.length - 1];
  return {
    rng: seeded(`${input.id}:synthesis:${input.narrator}`),
    spread: input.spread,
    items,
    n: items.length,
    majors: items.filter((i) => i.card.arcana === 'major').length,
    reversed: items.filter((i) => i.reversed).length,
    courts: items.filter((i) => i.card.arcana === 'minor' && i.card.rank > 10),
    dominant,
    missing: items.length >= 6 ? (['Fire', 'Water', 'Air', 'Earth'] as Element[]).filter((e) => !elements.has(e)) : [],
    repeated: Object.entries(rankCounts)
      .filter(([, c]) => c >= 2)
      .map(([r, c]) => ({ rank: Number(r), count: c })),
    first: items[0],
    last: items[items.length - 1],
    anchor,
  };
}

export function synthesisFor(input: StoryInput): Chapter {
  const a = analyse(input);
  return {
    kind: 'synthesis',
    numeral: '✶',
    title: a.n === 1 ? 'To Carry With You' : 'The Reading as a Whole',
    subtitle: input.spread.name,
    paragraphs: NARRATORS[input.narrator].synthesis(a),
  };
}

export const SUIT_DOMAIN: Record<Suit, string> = {
  wands: 'passion, ambition and creative fire',
  cups: 'feeling, love and the life of the heart',
  swords: 'thought, truth and the clarity that comes through conflict',
  pentacles: 'work, money, the body and the material world',
};

export const ELEMENT_LACK: Record<Element, string> = {
  Fire: 'drive and passion',
  Water: 'feeling and intuition',
  Air: 'clear thinking and honest words',
  Earth: 'grounding and practical steps',
};

export const NUMBER_MEANING: Record<number, string> = {
  1: 'beginnings', 2: 'balance and choice', 3: 'growth and expression', 4: 'stability and foundation',
  5: 'challenge and change', 6: 'harmony and exchange', 7: 'reflection and testing', 8: 'movement and power',
  9: 'culmination', 10: 'completion and the end of a cycle',
};

export const NUMBER_WORD = ['', 'Aces', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens'];

export { SUIT_NAME };

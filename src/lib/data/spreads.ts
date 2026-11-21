// Spread definitions. Coordinates are in table units, where a card is
// 1 wide and 1.75 tall; x grows to the right and z grows toward the viewer.
// `prompt` is a noun clause that completes "this position speaks of …".

export type Role =
  | 'past' | 'present' | 'future' | 'situation' | 'action' | 'outcome' | 'advice'
  | 'challenge' | 'hidden' | 'self' | 'other' | 'bond' | 'hope' | 'theme'
  | 'month' | 'mind' | 'body' | 'spirit' | 'daily';

export interface Position {
  label: string;
  prompt: string;
  role: Role;
  x: number;
  z: number;
  /** yaw on the table, degrees */
  rot?: number;
  /** index of a card this one lies across (raised above it) */
  over?: number;
}

export interface Spread {
  id: string;
  name: string;
  category: 'core' | 'relationship' | 'timing';
  blurb: string;
  positions: Position[];
}

const row3 = (labels: [string, string][], roles: Role[]): Position[] =>
  labels.map(([label, prompt], i) => ({ label, prompt, role: roles[i], x: (i - 1) * 1.35, z: 0 }));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function yearAhead(): Position[] {
  const now = new Date();
  const ps: Position[] = [];
  for (let i = 0; i < 12; i++) {
    const m = (now.getMonth() + i) % 12;
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ps.push({
      label: MONTHS[m], prompt: `what ${MONTHS[m]} brings`, role: 'month',
      x: Math.cos(a) * 3.3, z: Math.sin(a) * 3.3,
    });
  }
  ps.push({ label: 'The Year’s Theme', prompt: 'the thread running through the whole year', role: 'theme', x: 0, z: 0 });
  return ps;
}

export const SPREADS: Spread[] = [
  {
    id: 'daily', name: 'Card of the Day', category: 'core',
    blurb: 'One card to carry with you through the day.',
    positions: [{ label: 'Today', prompt: 'the energy that walks beside you today', role: 'daily', x: 0, z: 0 }],
  },
  {
    id: 'ppf', name: 'Past · Present · Future', category: 'core',
    blurb: 'The classic three-card story of where you have been and where you are heading.',
    positions: row3([
      ['The Past', 'what has shaped you'],
      ['The Present', 'where you stand now'],
      ['The Future', 'what is coming toward you'],
    ], ['past', 'present', 'future']),
  },
  {
    id: 'sao', name: 'Situation · Action · Outcome', category: 'core',
    blurb: 'A practical reading: what is happening, what to do, and where it leads.',
    positions: row3([
      ['The Situation', 'the heart of what is happening'],
      ['The Action', 'what you can do about it'],
      ['The Outcome', 'where that action leads'],
    ], ['situation', 'action', 'outcome']),
  },
  {
    id: 'celtic', name: 'Celtic Cross', category: 'core',
    blurb: 'The great ten-card reading: a full portrait of a situation and its unfolding.',
    positions: [
      { label: 'The Heart', prompt: 'the heart of the matter', role: 'present', x: 0, z: 0 },
      { label: 'The Crossing', prompt: 'what crosses you, for good or ill', role: 'challenge', x: 0, z: 0, rot: 90, over: 0 },
      { label: 'The Foundation', prompt: 'the root beneath it all', role: 'hidden', x: 0, z: 2.05 },
      { label: 'The Recent Past', prompt: 'what is passing away', role: 'past', x: -1.9, z: 0 },
      { label: 'The Crown', prompt: 'what you aspire to, consciously', role: 'hope', x: 0, z: -2.05 },
      { label: 'The Near Future', prompt: 'what approaches next', role: 'future', x: 1.9, z: 0 },
      { label: 'Yourself', prompt: 'how you stand within it', role: 'self', x: 3.9, z: 3.15 },
      { label: 'Your Surroundings', prompt: 'the people and forces around you', role: 'other', x: 3.9, z: 1.05 },
      { label: 'Hopes & Fears', prompt: 'what you hope for and fear, often the same thing', role: 'hope', x: 3.9, z: -1.05 },
      { label: 'The Outcome', prompt: 'where the path is leading', role: 'outcome', x: 3.9, z: -3.15 },
    ],
  },
  {
    id: 'relationship', name: 'The Bond', category: 'relationship',
    blurb: 'Two people, what connects them, what tests them, and what they could become.',
    positions: [
      { label: 'You', prompt: 'what you bring to the bond', role: 'self', x: -1.45, z: 0 },
      { label: 'The Other', prompt: 'what the other person brings', role: 'other', x: 1.45, z: 0 },
      { label: 'The Bond', prompt: 'what truly connects you', role: 'bond', x: 0, z: 0 },
      { label: 'The Challenge', prompt: 'what tests the two of you', role: 'challenge', x: 0, z: 2.05 },
      { label: 'The Potential', prompt: 'what this bond could become', role: 'outcome', x: 0, z: -2.05 },
    ],
  },
  {
    id: 'two-paths', name: 'Two Paths', category: 'relationship',
    blurb: 'For a crossroads: where each road leads, and what you need to know before choosing.',
    positions: [
      { label: 'The Crossroads', prompt: 'the choice before you', role: 'situation', x: 0, z: 2.0 },
      { label: 'Path One', prompt: 'the nature of the first road', role: 'action', x: -1.55, z: 0.1 },
      { label: 'Where It Leads', prompt: 'where the first road leads', role: 'outcome', x: -1.55, z: -1.95 },
      { label: 'Path Two', prompt: 'the nature of the second road', role: 'action', x: 1.55, z: 0.1 },
      { label: 'Where It Leads', prompt: 'where the second road leads', role: 'outcome', x: 1.55, z: -1.95 },
      { label: 'What You Need to Know', prompt: 'what matters most as you choose', role: 'advice', x: 0, z: -0.95 },
    ],
  },
  {
    id: 'horseshoe', name: 'Horseshoe', category: 'relationship',
    blurb: 'Seven cards in an arch, for a question with many moving parts.',
    positions: ([
      ['The Past', 'what has led here', 'past'],
      ['The Present', 'where things stand', 'present'],
      ['Hidden Influences', 'what works beneath the surface', 'hidden'],
      ['The Obstacle', 'what stands in the way', 'challenge'],
      ['Those Around You', 'how others see and shape this', 'other'],
      ['The Advice', 'what you would do well to do', 'advice'],
      ['The Outcome', 'the most likely outcome', 'outcome'],
    ] as [string, string, Role][]).map(([label, prompt, role], i) => ({
      label, prompt, role, x: (i - 3) * 1.18, z: -1.4 + 0.36 * (i - 3) ** 2, rot: (i - 3) * 6,
    })),
  },
  {
    id: 'year', name: 'Year Ahead', category: 'timing',
    blurb: 'A card for each of the next twelve months, with a theme at the centre.',
    positions: yearAhead(),
  },
  {
    id: 'new-moon', name: 'New Moon', category: 'timing',
    blurb: 'For beginnings: the seed, what nourishes it, what shadows it, and the first step.',
    positions: [
      { label: 'The Seed', prompt: 'what is ready to begin', role: 'theme', x: 0, z: 0 },
      { label: 'The Soil', prompt: 'what will nourish it', role: 'hidden', x: 0, z: 2.05 },
      { label: 'The Shadow', prompt: 'what could block its growth', role: 'challenge', x: -1.45, z: 0 },
      { label: 'The Light', prompt: 'what helps it grow', role: 'hope', x: 1.45, z: 0 },
      { label: 'The First Step', prompt: 'the first step to take', role: 'action', x: 0, z: -2.05 },
    ],
  },
  {
    id: 'full-moon', name: 'Full Moon', category: 'timing',
    blurb: 'For harvest and release: what has ripened, and what it is time to let go.',
    positions: ([
      ['What Is Illuminated', 'what has come to light', 'present'],
      ['The Harvest', 'what has ripened', 'outcome'],
      ['The Release', 'what it is time to let go', 'challenge'],
      ['The Forgiveness', 'what asks to be forgiven', 'hidden'],
      ['The Moon’s Message', 'the message of this moon', 'advice'],
    ] as [string, string, Role][]).map(([label, prompt, role], i) => ({
      label, prompt, role, x: (i - 2) * 1.3, z: 0.25 * (i - 2) ** 2 - 0.4, rot: (i - 2) * 5,
    })),
  },
  {
    id: 'mbs', name: 'Mind · Body · Spirit', category: 'timing',
    blurb: 'A check-in with the three parts of you.',
    positions: [
      { label: 'Mind', prompt: 'the state of your thoughts', role: 'mind', x: -1.35, z: 1.0 },
      { label: 'Body', prompt: 'what your body is asking for', role: 'body', x: 1.35, z: 1.0 },
      { label: 'Spirit', prompt: 'what nourishes your spirit', role: 'spirit', x: 0, z: -1.05 },
    ],
  },
];

export const SPREAD_BY_ID: Record<string, Spread> = Object.fromEntries(SPREADS.map((s) => [s.id, s]));

export const CATEGORY_NAME: Record<Spread['category'], string> = {
  core: 'Core',
  relationship: 'Relationship & Decision',
  timing: 'Timing & Growth',
};

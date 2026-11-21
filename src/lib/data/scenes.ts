// What each card actually shows, per deck, so the narrators describe the card
// in front of you. Every scene is a lowercase clause with no final period:
// the narrators set it after "See it:", "In the picture," or "On the card:".
import { pipImage, type CardDef, type Suit } from './cards';
import type { DeckId } from './decks';

const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

// ── Tarot de Marseille (Jean Dodal) ──

const MARSEILLE_MAJORS = [
  'a ragged wanderer strides along with a bundle on a stick over his shoulder, a small animal tugging at his breeches',
  'a juggler in a wide-brimmed hat stands at a little table of cups, dice and knives, a wand held lightly in one hand',
  'a woman in a tall papal crown sits wrapped in a heavy cloak, an open book on her lap',
  'a crowned empress sits facing us, a shield with an eagle in one arm and a sceptre in the other',
  'a bearded emperor sits in profile with his legs crossed, a sceptre raised and an eagle shield at his feet',
  'a crowned pope raises his hand in blessing over two small tonsured figures, a triple cross beside him',
  'a young man stands between two women, one with her hand on his shoulder, while a winged Cupid aims an arrow from a blazing sun',
  'a crowned figure rides a square chariot under a canopy, drawn by two horses pulling different ways',
  'a crowned woman sits upright between two pillars, a sword raised in one hand and level scales in the other',
  'a hooded old man walks bent over his staff, holding up a lantern half hidden in his cloak',
  'a wheel on a crank turns while strange animal figures climb and fall, a crowned sphinx perched on top',
  'a woman in a broad hat calmly opens the jaws of a lion with her bare hands',
  'a young man hangs by one foot between two lopped trees, hands behind his back, his face serene',
  'a skeleton swings a scythe through dark earth where heads and hands lie among new shoots',
  'a winged woman pours a stream from one jug into another without spilling a drop',
  'a horned, bat-winged devil stands on a pedestal, two small horned figures tied by ropes at its feet',
  'the crowned top of a tower is blown away by a plume of fire, two figures tumbling to the ground',
  'a naked woman kneels by a stream pouring water from two jugs, under one great star and seven smaller ones',
  'a moon with a face in profile drips droplets over two dogs howling between two towers, a crayfish in the pool below',
  'a great sun with a face shines on two children standing together before a low wall',
  'an angel blows a trumpet from the clouds as figures rise naked from an open grave',
  'a dancer holding a wand turns within an oval wreath, the four living creatures in the corners',
];

const MARSEILLE_OBJ: Record<Suit, string> = {
  wands: 'a heavy wooden staff',
  cups: 'a tall covered cup',
  swords: 'a long sword',
  pentacles: 'a golden coin',
};

function marseilleCourt(card: CardDef) {
  const obj = MARSEILLE_OBJ[card.suit as Suit];
  switch (card.rank) {
    case 11: return `a young valet in a broad hat stands holding ${obj}`;
    case 12: return `an armoured rider sits a prancing horse, ${obj} held high`;
    case 13: return `a crowned queen sits on her throne, ${obj} in her hand`;
    default: return `a crowned king sits enthroned with his legs crossed, ${obj} at his side`;
  }
}

// ── Celestial: constellations, planets and celestial bodies ──

const CELESTIAL_MAJORS = [
  'a figure of stars steps out at the edge of the sky, a small dog of stars at its heels, while a comet streaks overhead',
  'the small, quick orbit of Mercury circles the sun beneath a lemniscate of stars, the four elements set in a row below',
  'the moon’s phases arch over a great crescent hanging between a column of bright stars and a column of dark ones',
  'Venus burns as the morning star above the five-petalled rose its orbit traces, crowned with twelve stars',
  'the stars of Aries, the ram, run in a short bright line, its curling horn traced faintly in the dark',
  'Taurus spreads its long horns from the V of the Hyades, red Aldebaran at its eye and the Pleiades close by',
  'the twin stars of Gemini, Castor and Pollux, stand side by side, their figures joined hand in hand',
  'the faint crab of Cancer holds the Beehive cluster at its heart, under a canopy of stars',
  'the Sickle of Leo curves above bright Regulus, the lion’s back stretching away to Denebola, a lemniscate above',
  'the long figure of Virgo stretches across the sky, Spica held low and bright like a lantern',
  'banded Jupiter turns at the centre of the zodiac wheel, its four great moons strung out in a line',
  'the scales of Libra hang level from a single pivot star',
  'a figure of stars hangs head down from a beam of stars above a dark sea',
  'Scorpio curls across the sky, red Antares at its heart, its tail coiling to the sting above a rising sun',
  'the Teapot of Sagittarius pours out the Milky Way like steam',
  'the wedge of Capricorn, the sea-goat, glitters with its horns traced faintly above',
  'falling stars strike a tower of stars and knock its crown askew, while red Mars watches with its two small moons',
  'a great star shines over the water-bearer’s line of stars, a stream of starlight pouring down',
  'two fish of stars swim bound by a single cord beneath a waning moon',
  'the sun sits at the heart of the orrery, its planets turning on their rings, ringed Saturn at the edge',
  'a new star bursts into light, its shells expanding, while three small stars rise toward it',
  'ringed Saturn turns within a wreath of stars, the four royal stars burning at the corners of the sky',
];

const GOLD_OBJ: Record<Suit, [string, string]> = {
  wands: ['a golden staff', 'golden staves'],
  cups: ['a golden cup', 'golden cups'],
  swords: ['a golden sword', 'golden swords'],
  pentacles: ['a golden pentacle', 'golden pentacles'],
};

function celestialMinor(card: CardDef) {
  const [one, many] = GOLD_OBJ[card.suit as Suit];
  if (card.rank === 1) return `${one} stands alone at the centre of a ring of light`;
  if (card.rank <= 10) return `${NUM[card.rank]} ${many} are joined by fine lines, like the stars of a constellation`;
  switch (card.rank) {
    case 11: return `the morning star rises over the horizon above ${one}`;
    case 12: return `a comet streaks across the sky past ${one}`;
    case 13: return `a crescent moon cradles ${one}, attended by small stars`;
    default: return `${one} sits at the heart of a blazing sun`;
  }
}

// ── Art Nouveau: the language of flowers ──

const NOUVEAU_MAJORS = [
  'a white rose opens on its stem while a butterfly lifts away into the air',
  'an iris, messenger of the gods, rises tall above the four tools of the craft',
  'a lotus opens on still water between two reeds, a crescent moon above',
  'a ripe pomegranate splits open between two sheaves of wheat',
  'an oak branch arches heavy with acorns over a small crown',
  'an olive branch lies across two crossed keys',
  'a red rose and a white grow from stems twined into one',
  'a laurel wreath of victory circles a turning wheel',
  'a sunflower spreads its petals like a lion’s mane, a looping vine above it',
  'snowdrops bloom in the snow beneath a lantern hung from a bare branch',
  'a passionflower opens like a wheel, its corona of fine filaments turning',
  'a slender iris leaf stands upright as a sword, a blossom hanging level in each pan of a living balance',
  'a single bud hangs upside down among the trailing strands of a weeping willow',
  'a poppy, the flower of sleep, blooms while a butterfly leaves its chrysalis',
  'water is poured between two water lilies, iris leaves standing at either side',
  'a thorned bramble twists into a binding loop around a cluster of ripe berries',
  'lightning splits an oak in two, its leaves and acorns falling',
  'a star-of-Bethlehem flower blooms beneath seven smaller ones, dew falling',
  'a moonflower opens at night under the crescent, a moth drawn to its pale face',
  'a great sunflower turns its face to the light',
  'three Easter lilies rise together, their trumpets lifted',
  'a laurel wreath holds the four flowers of the elements: the rose, the lily, the iris and the poppy',
];

const SUIT_FLOWER: Record<Suit, string> = { wands: 'lily', cups: 'water lily', swords: 'iris', pentacles: 'sunflower' };
const INK_OBJ: Record<Suit, [string, string]> = {
  wands: ['a staff', 'staves'],
  cups: ['a cup', 'cups'],
  swords: ['a sword', 'swords'],
  pentacles: ['a pentacle', 'pentacles'],
};

function nouveauMinor(card: CardDef) {
  const suit = card.suit as Suit;
  const [one, many] = INK_OBJ[suit];
  const flower = SUIT_FLOWER[suit];
  if (card.rank === 1) return `${one} is ringed with petals, like a flower opening`;
  if (card.rank <= 10) return `${NUM[card.rank]} ${many} are linked by a leafy vine, a bud at either end`;
  switch (card.rank) {
    case 11: return `a ${flower} bud, still closed, rises on its stem above ${one}`;
    case 12: return `a half-open ${flower} bends in the wind beside ${one}`;
    case 13: return `a ${flower} in full bloom, ringed with small petals, rises above ${one}`;
    default: return `a ${flower} in full bloom, crowned with laurel and fruit, rises above ${one}`;
  }
}

/** The scene on this card, in this deck. */
export function sceneFor(card: CardDef, deck: DeckId): string {
  switch (deck) {
    case 'marseille':
      if (card.arcana === 'major') return MARSEILLE_MAJORS[card.rank];
      return card.rank > 10 ? marseilleCourt(card) : pipImage(card);
    case 'celestial':
      return card.arcana === 'major' ? CELESTIAL_MAJORS[card.rank] : celestialMinor(card);
    case 'nouveau':
      return card.arcana === 'major' ? NOUVEAU_MAJORS[card.rank] : nouveauMinor(card);
    default:
      return card.image;
  }
}

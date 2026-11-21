export type DeckId = 'rws' | 'marseille' | 'celestial' | 'nouveau';

export interface DeckDef {
  id: DeckId;
  name: string;
  origin: string;
  blurb: string;
  /** 'photo' decks are scans served as files; 'drawn' decks are rendered on the device */
  kind: 'photo' | 'drawn';
  edge: string;
}

export const DECKS: DeckDef[] = [
  {
    id: 'rws', name: 'Rider–Waite–Smith', origin: 'Pamela Colman Smith, 1909',
    blurb: 'The best-loved modern deck: every card a scene, rich with symbols.',
    kind: 'photo', edge: '#c9a45c',
  },
  {
    id: 'marseille', name: 'Tarot de Marseille', origin: 'Jean Dodal, Lyon, c. 1701',
    blurb: 'Woodcut and stencil colour. Bold, archaic, the minors shown as pips.',
    kind: 'photo', edge: '#eadcb8',
  },
  {
    id: 'celestial', name: 'Celestial', origin: 'Original · gold foil',
    blurb: 'A star atlas in gold foil: constellations, planets and comets on a midnight sky. The gold catches the light as the cards turn.',
    kind: 'drawn', edge: '#c9a45c',
  },
  {
    id: 'nouveau', name: 'Art Nouveau', origin: 'Original · inked pastel',
    blurb: 'A herbarium in the language of flowers: each card told through its bloom, under arched windows in soft pastels.',
    kind: 'drawn', edge: '#efe4cc',
  },
];

export const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d])) as Record<DeckId, DeckDef>;

export const isDrawn = (deck: DeckId): deck is 'celestial' | 'nouveau' => DECK_BY_ID[deck]?.kind === 'drawn';

/** File URL for photo decks. Drawn decks go through `faceSrc` instead. */
export const faceUrl = (deck: DeckId, cardId: string) => `${import.meta.env.BASE_URL}decks/${deck}/${cardId}.webp`;

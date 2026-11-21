// One way to get a card face, whatever kind of deck it is.
import { faceUrl, isDrawn, type DeckId } from '../data/decks';
import { faceObjectUrl, renderFace } from './render';

/** An image URL for <img> elements (a file, or an object URL for drawn decks). */
export function faceSrc(deck: DeckId, cardId: string): Promise<string> {
  return isDrawn(deck) ? faceObjectUrl(deck, cardId) : Promise.resolve(faceUrl(deck, cardId));
}

/** Something drawImage() can paint, or null if the art is missing. */
export async function faceImage(deck: DeckId, cardId: string): Promise<CanvasImageSource | null> {
  if (isDrawn(deck)) {
    try {
      return (await renderFace(deck, cardId)).color;
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = faceUrl(deck, cardId);
  });
}

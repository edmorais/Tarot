// Three narrator voices. Each turns the same cards into a different telling.
import { pick } from './rng';
import { REVERSAL_EASES } from '../data/cards';
import {
  cap, ELEMENT_LACK, NUMBER_MEANING, NUMBER_WORD, SUIT_DOMAIN, SUIT_NAME,
  type Analysis, type ChapterCtx, type Item,
} from './story';

export type NarratorId = 'oracle' | 'guide' | 'friend';

export interface Narrator {
  id: NarratorId;
  name: string;
  epithet: string;
  blurb: string;
  chapter(ctx: ChapterCtx): string[];
  synthesis(a: Analysis): string[];
}

const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth'];
const ADVICE_ROLES = ['advice', 'action', 'daily', 'body', 'spirit', 'mind'];
const isCourt = (it: Item) => it.card.arcana === 'minor' && it.card.rank > 10;
const isMajor = (it: Item) => it.card.arcana === 'major';
const join = (parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(' ');
/** "The Heart" → "the Heart" for use mid-sentence */
const lbl = (label: string) => label.replace(/^The /, 'the ');
const eases = (it: Item) => it.reversed && REVERSAL_EASES.has(it.card.id);

function listAnd(xs: string[]) {
  if (xs.length <= 1) return xs.join('');
  return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
}

// ───────────────────────────── The Oracle ─────────────────────────────

const oracle: Narrator = {
  id: 'oracle',
  name: 'The Oracle',
  epithet: 'mystic · poetic',
  blurb: 'Speaks in images and old cadences, like a fable read by candlelight.',
  chapter({ rng, item, prev, relation }) {
    const { name, pos, image, reversed } = item;
    const Name = cap(name);
    const L = lbl(pos.label);
    const up = reversed ? ', turned upon its head' : '';
    const p1 = join([
      pick(rng, [
        `${ORD[item.index] ?? 'Next'}, the place of ${L}, which speaks of ${pos.prompt}. Here the cards have laid ${name}${up}.`,
        `In the place of ${L} — ${pos.prompt} — lies ${name}${up}.`,
        `Turn now to ${L}. ${Name} answers${up}, and speaks of ${pos.prompt}.`,
      ]),
      pick(rng, [`See it: ${image}.`, `Behold the image — ${image}.`, `Look closely: ${image}.`]),
    ]);

    const p2 = !reversed
      ? item.meaning
      : eases(item)
        ? join([pick(rng, ['Upturned, the weight it carries begins to lift.', 'Reversed, its sorrow loosens its grip.']), item.meaning])
        : join([pick(rng, ['Reversed, its light falls slant.', 'Upturned, its voice turns inward.', 'Turned over, its gift is tangled.']), item.meaning]);

    let link: string | undefined;
    if (prev) {
      const pn = cap(prev.name);
      if (isMajor(prev) && isMajor(item)) {
        link = pick(rng, [
          `${pn} and ${name}: two great arcana side by side. This is no small matter, but a movement of fate.`,
          `Two of the great arcana walk together here, ${prev.name} and ${name}. The hand at work is larger than the hour.`,
        ]);
      } else if (relation === 'same') {
        link = `${pn} and ${name} share the element of ${item.card.element}; what the one begins, the other deepens.`;
      } else if (relation === 'contrary') {
        link = `Yet ${prev.card.element} and ${item.card.element} do not mix easily, and there is friction between ${prev.name} and this card — a tension to be held, not hurried.`;
      } else if (relation === 'friendly') {
        link = `${pn} and ${name} are kin: ${prev.card.element} feeds ${item.card.element}, and their currents run together.`;
      }
    }
    const counsel = ADVICE_ROLES.includes(pos.role)
      ? pick(rng, [`Heed this: ${item.card.lesson}.`, `The counsel is plain — ${item.card.lesson}.`])
      : undefined;
    const court = isCourt(item) ? 'A court card often wears a face. Perhaps it is someone you know; perhaps it is you, in a role you are learning to play.' : undefined;
    return [p1, p2, join([court, link, counsel])].filter(Boolean);
  },
  synthesis(a) {
    const r = a.rng;
    if (a.n === 1) {
      const it = a.first;
      return [
        `Carry ${it.name} with you as you go. Watch for ${it.kw[0]} in small things — a word, a glance, a door left ajar.`,
        `And when the day grows loud, remember the card’s one whisper: ${it.card.lesson}.`,
      ];
    }
    const out: string[] = [];
    out.push(pick(r, ['The cards have spoken one by one. Now hear them as a single voice.', 'Now the cards are all face up, and the story can be heard entire.']));
    const weight =
      a.majors === 0
        ? 'No great arcana appear. This story is written in the ordinary hours, and the pen is in your hand.'
        : a.majors / a.n >= 0.5
          ? `${a.majors} of the ${a.n} cards are great arcana. Fate leans close over this table; these are tides, not ripples.`
          : a.majors === 1
            ? `One great arcanum, ${a.items.find(isMajor)!.name}, stands among the lesser cards like a lighthouse — the rest of the story turns around it.`
            : `The great and lesser arcana are mingled, so what is fated and what is chosen are braided together.`;
    const domain = a.dominant
      ? `The suit of ${SUIT_NAME[a.dominant.suit]} returns again and again, so the heart of this matter lies in ${SUIT_DOMAIN[a.dominant.suit]}.`
      : undefined;
    out.push(join([weight, domain]));
    const extra: string[] = [];
    if (a.reversed && a.reversed / a.n >= 0.4)
      extra.push(`Many cards lie reversed. Much of this energy is turned inward or held back — a river beneath the ice, waiting for the thaw.`);
    if (a.courts.length >= 2)
      extra.push(`Court cards gather — ${listAnd(a.courts.map((c) => c.name))}. Others walk in this story, and their hands touch its shape.`);
    for (const rep of a.repeated)
      extra.push(`The ${NUMBER_WORD[rep.rank]} echo ${rep.count} times: a song of ${NUMBER_MEANING[rep.rank]}.`);
    if (a.missing.length)
      extra.push(`And mark what is absent: no card of ${listAnd(a.missing)}. The reading lacks ${listAnd(a.missing.map((e) => ELEMENT_LACK[e]))}; you may need to bring them yourself.`);
    if (extra.length) out.push(extra.join(' '));
    out.push(
      `The tale begins with ${a.first.name}, in ${a.first.kw[0]}, and ends with ${a.last.name}, in ${a.last.kw[0]}. Between them lies the road you are walking.`,
    );
    out.push(join([`The counsel of ${a.anchor.name} is the last word: ${a.anchor.card.lesson}.`, pick(r, ['Go gently. The cards show the road; it is you who walks it.', 'The candle gutters. What was seen here is yours to keep.'])]));
    return out;
  },
};

// ───────────────────────────── The Guide ─────────────────────────────

const guide: Narrator = {
  id: 'guide',
  name: 'The Guide',
  epithet: 'reflective · Jungian',
  blurb: 'Reads the cards as mirrors of the psyche, and leaves you with questions to sit with.',
  chapter({ rng, item, prev, relation }) {
    const { name, pos, image, reversed, kw } = item;
    const L = lbl(pos.label);
    const rv = reversed ? ', reversed' : '';
    const p1 = join([
      pick(rng, [
        `${cap(L)} asks about ${pos.prompt}. Here we meet ${name}${rv}.`,
        `The position of ${L} is concerned with ${pos.prompt}, and the card that appears is ${name}${rv}.`,
      ]),
      pick(rng, [`The image shows ${image}.`, `In the picture, ${image}.`]),
      isMajor(item)
        ? pick(rng, [
            'As one of the Major Arcana it carries the weight of an archetype: a pattern older than your situation, and larger.',
            'This is a major archetype; it tends to describe a stage of inner development rather than a passing event.',
          ])
        : isCourt(item)
          ? 'Court cards often stand for a person — or for a way of being you are trying on.'
          : undefined,
    ]);
    const question = eases(item)
      ? pick(rng, [
          `Something is being released here. What are you ready to set down?`,
          `Reversed, this card often marks the turn toward recovery. Notice what is already easing.`,
        ])
      : reversed
      ? pick(rng, [
          `Notice where ${kw[0]} might be showing up in your life, quietly, beneath awareness.`,
          `It can help to ask: what part of me benefits from ${kw[0]}?`,
        ])
      : pick(rng, [
          `A question to sit with: where in your life are you meeting ${kw[0]}?`,
          `Ask yourself what ${kw[0]} would look like if you allowed it fully.`,
          `Consider how ${kw[0]} and ${kw[1]} are already at work in you.`,
        ]);
    const p2 = join([item.meaning, question]);
    let link: string | undefined;
    if (prev) {
      if (relation === 'same')
        link = `It shares the element of ${item.card.element} with ${prev.name}. When a theme repeats, the psyche is usually insisting on it.`;
      else if (relation === 'contrary')
        link = `${prev.card.element} in ${prev.name} meets ${item.card.element} here: opposites in tension. Growth often lives exactly in such a tension, if it can be held rather than collapsed.`;
      else if (relation === 'friendly')
        link = `The ${item.card.element} of this card supports the ${prev.card.element} of ${prev.name}; the two work together.`;
    }
    const counsel = ADVICE_ROLES.includes(pos.role) ? `The invitation here is to ${item.card.lesson}.` : undefined;
    return [p1, p2, join([link, counsel])].filter(Boolean);
  },
  synthesis(a) {
    const r = a.rng;
    if (a.n === 1) {
      const it = a.first;
      return [
        `${cap(it.name)} offers a lens for the day. Each time you notice ${it.kw[0]} — in yourself or in others — pause and ask what it is showing you.`,
        `The invitation is simple: ${it.card.lesson}. Tonight, you might write down one moment when the card felt true.`,
      ];
    }
    const out: string[] = [];
    out.push(pick(r, ['Let’s step back and look at the reading as a whole.', 'Taken together, the cards begin to describe a single movement.']));
    const weight =
      a.majors === 0
        ? 'There are no Major Arcana here, which suggests a situation shaped by everyday choices more than by large life passages. That is good news: much of it is within your influence.'
        : a.majors / a.n >= 0.5
          ? `With ${a.majors} Major Arcana among ${a.n} cards, this touches a significant life passage — the kind of change that reshapes identity, not just circumstance.`
          : `The Major Arcana present (${listAnd(a.items.filter(isMajor).map((i) => i.name))}) mark where the deeper, archetypal themes are at work; the minor cards show how they play out day to day.`;
    out.push(join([
      weight,
      a.dominant && `The emphasis on ${SUIT_NAME[a.dominant.suit]} points the reading toward ${SUIT_DOMAIN[a.dominant.suit]}.`,
    ]));
    const extra: string[] = [];
    if (a.reversed && a.reversed / a.n >= 0.4)
      extra.push(`A high number of reversals often means the energy is internalised — still being processed, or not yet consciously owned.`);
    if (a.courts.length >= 2)
      extra.push(`Several court cards suggest other people are central here, or that you are moving between different roles.`);
    for (const rep of a.repeated) extra.push(`The repeated ${NUMBER_WORD[rep.rank]} highlight a theme of ${NUMBER_MEANING[rep.rank]}.`);
    if (a.missing.length)
      extra.push(`No ${listAnd(a.missing)} cards appear, which can point to a function you are under-using: ${listAnd(a.missing.map((e) => ELEMENT_LACK[e]))}.`);
    if (extra.length) out.push(extra.join(' '));
    out.push(
      `The movement runs from ${a.first.name} (${a.first.kw[0]}) to ${a.last.name} (${a.last.kw[0]}). You might think of it as a psychological arc: what is being left behind, and what is trying to be born.`,
    );
    out.push(
      join([
        `If one thread is worth following, it is the advice of ${a.anchor.name}: ${a.anchor.card.lesson}.`,
        pick(r, [
          `A question to take with you: what would change if you trusted ${a.last.kw[0]} a little more?`,
          `You might journal on this: which card did you resist, and why?`,
        ]),
      ]),
    );
    return out;
  },
};

// ───────────────────────────── The Friend ─────────────────────────────

const friend: Narrator = {
  id: 'friend',
  name: 'The Friend',
  epithet: 'candid · practical',
  blurb: 'Tells it straight, with warmth — like a friend who happens to read tarot.',
  chapter({ rng, item, prev, relation }) {
    const { name, pos, image, reversed, kw } = item;
    const L = lbl(pos.label);
    const rv = reversed ? ' — upside down' : '';
    const p1 = join([
      pick(rng, [
        `${cap(L)}. You got ${name}${rv}.`,
        `Okay, ${L}: this one’s about ${pos.prompt}. And it’s ${name}${rv}.`,
        `For ${L} — ${pos.prompt} — here’s ${name}${rv}.`,
      ]),
      pick(rng, [`Picture it: ${image}.`, `On the card: ${image}.`]),
    ]);
    const p2 = join([
      pick(rng, [`In short: ${listAnd(kw)}.`, `Key words: ${listAnd(kw)}.`]),
      eases(item)
        ? pick(rng, ['Reversed, which here is actually good news.', 'Upside down, and for this card that’s a relief.'])
        : reversed
          ? pick(rng, ['Reversed, so it’s a bit blocked.', 'Since it’s reversed, read it as the stuck version.'])
          : undefined,
      item.meaning,
    ]);
    let link: string | undefined;
    if (prev) {
      if (isMajor(prev) && isMajor(item)) link = `Two Major Arcana cards back to back — this isn’t a small thing.`;
      else if (relation === 'same') link = `Same element as ${prev.name}, so this is doubling down on the same energy.`;
      else if (relation === 'contrary')
        link = `Heads up: this one rubs against ${prev.name} a bit. ${prev.card.element} and ${item.card.element} don’t mix easily, and that tension is worth noticing.`;
      else if (relation === 'friendly') link = `This plays nicely with ${prev.name}; they back each other up.`;
    }
    const counsel = ADVICE_ROLES.includes(pos.role) || pos.role === 'outcome'
      ? pick(rng, [`If I were you, I’d ${item.card.lesson}.`, `My advice? ${cap(item.card.lesson)}.`])
      : undefined;
    const court = isCourt(item) ? 'Court cards are often people. Anyone come to mind?' : undefined;
    return [p1, p2, join([court, link, counsel])].filter(Boolean);
  },
  synthesis(a) {
    const r = a.rng;
    if (a.n === 1) {
      const it = a.first;
      return [
        `So today’s card is ${it.name}. Keep an eye out for ${it.kw[0]}; it’ll probably show up somewhere small.`,
        `Today’s to-do, tarot edition: ${it.card.lesson}.`,
      ];
    }
    const out: string[] = [];
    out.push(pick(r, ['Alright, big picture.', 'Okay, let’s put it all together.']));
    const weight =
      a.majors === 0
        ? 'No Major Arcana at all, which honestly is good news: this is day-to-day stuff, and you have a lot of control over it.'
        : a.majors / a.n >= 0.5
          ? `${a.majors} out of ${a.n} are Major Arcana. That’s a lot. Something big is moving in your life, and it’s not just a phase.`
          : `There’s a mix of big cards and everyday cards, so part of this is bigger than you and part of it is just your choices.`;
    out.push(join([weight, a.dominant && `Lots of ${SUIT_NAME[a.dominant.suit]}, so it’s mostly about ${SUIT_DOMAIN[a.dominant.suit]}.`]));
    const extra: string[] = [];
    if (a.reversed && a.reversed / a.n >= 0.4) extra.push(`Plenty of reversed cards too. Feels like something’s stuck or being held in. Worth asking what.`);
    if (a.courts.length >= 2) extra.push(`And several court cards, so other people are definitely part of this.`);
    for (const rep of a.repeated) extra.push(`${a.items.length > 4 ? 'Also, ' : ''}${rep.count} ${NUMBER_WORD[rep.rank]} showed up. ${NUMBER_WORD[rep.rank]} are about ${NUMBER_MEANING[rep.rank]}.`);
    if (a.missing.length) extra.push(`Nothing from ${listAnd(a.missing)}, though, so you might be light on ${listAnd(a.missing.map((e) => ELEMENT_LACK[e]))} right now.`);
    if (extra.length) out.push(extra.join(' '));
    out.push(`It starts with ${a.first.name} (${a.first.kw[0]}) and ends with ${a.last.name} (${a.last.kw[0]}). That’s the arc.`);
    out.push(join([`If you take one thing away: ${a.anchor.card.lesson}.`, pick(r, ['You’ve got this.', 'Go easy on yourself.', 'Now go do the thing.'])]));
    return out;
  },
};

export const NARRATORS: Record<NarratorId, Narrator> = { oracle, guide, friend };
export const NARRATOR_LIST = [oracle, guide, friend];

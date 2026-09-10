// /lib/gifts.ts
//
// The Sophisticated Gift Engine — the Vibrant Dream brief's courtship
// tokens, adapted from Pococha's animated gifting:
//
//   "Instead of generic emojis, let men send animated, traditional
//    tokens: A Hand-Strung Jasmine Phuang Malai, An Amber Lotus Flower
//    that unfurls across the screen, A Warm Coffee Invitation Card...
//    These tokens can cost $1.99 to $4.99 each (or be included with VIP
//    status), giving paying men an immediate, high-impact way to stand
//    out in a woman's inbox."
//
// ---------------------------------------------------------------------
// Included with membership, not sold à la carte. A deliberate departure.
//
// The brief offers "$1.99 to $4.99 each (or be included with VIP
// status)" as alternatives. Included is the right side of that "or"
// here, for a reason specific to this product rather than to gifting:
//
// This platform's entire differentiator — the one on the landing page,
// in the moderation filter and in the intent gate — is that it is not
// transactional. A man buying an individual $4.99 object to place in a
// woman's inbox is a purchase whose recipient is a person, and the
// closest analogue in this market is exactly the dynamic the app
// advertises itself as being free of. It would also hand every critic a
// screenshot.
//
// Bundled into Gold VIP, the same gesture reads as a courtesy a member
// can extend rather than a payment aimed at someone. The revenue moves
// into the subscription, which is where the audit's own model wants the
// recurring money anyway.
//
// The per-token price the brief specifies is therefore not implemented,
// and no gift touches Stripe. If that is ever revisited, the cost field
// below is where it would go — the send flow already carries a tier
// check, so it is a pricing decision rather than a rebuild.
// ---------------------------------------------------------------------

export type GiftId = "jasmine" | "lotus" | "coffee";

export interface Gift {
  id: GiftId;
  name: string;
  /** What sending it is understood to mean. Shown in the picker, because
   *  the meanings are culturally specific and a Western sender picking
   *  blind is how a warm gesture lands wrong. */
  meaning: string;
  /** Illustration, or null for the one drawn in CSS. */
  image: string | null;
  /** Minimum tier that may send it. */
  requires: "free" | "gold";
}

export const GIFTS: Gift[] = [
  {
    id: "jasmine",
    name: "Jasmine Garland",
    // A phuang malai is offered in respect — to elders, at temples, to
    // someone being honoured. Saying so stops it being read as flowers.
    meaning: "Given in respect and welcome. The traditional Thai greeting garland.",
    image: "/gifts/jasmine-garland.webp",
    requires: "gold",
  },
  {
    id: "lotus",
    name: "Amber Lotus",
    meaning: "For sincerity, and a hope that something lasting grows from here.",
    image: "/gifts/amber-lotus.webp",
    requires: "gold",
  },
  {
    id: "coffee",
    name: "Coffee Invitation",
    // Deliberately free: it is the one token that is an actual
    // invitation rather than an ornament, and putting the app's only
    // "shall we meet" gesture behind a paywall would be charging for
    // the thing the product exists to cause.
    meaning: "A simple invitation — coffee, when you are both ready.",
    image: null,
    requires: "free",
  },
];

export function giftById(id: string): Gift | undefined {
  return GIFTS.find((g) => g.id === id);
}

export function canSend(gift: Gift, subscriptionStatus: string | undefined): boolean {
  return gift.requires === "free" || subscriptionStatus === "active";
}

/** The message text a sent gift becomes in the thread.
 *
 *  Gifts are ordinary messages carrying a marker rather than a separate
 *  collection: they inherit moderation, block checks, the messaging
 *  gate, push notifications and the chat's own listener for free, and a
 *  parallel pipeline would have needed all five re-implemented and kept
 *  in step. The marker is parsed back out at render.
 */
export const GIFT_PREFIX = "gift:";

export function encodeGift(id: GiftId): string {
  return `${GIFT_PREFIX}${id}`;
}

export function decodeGift(text: string): Gift | null {
  if (!text.startsWith(GIFT_PREFIX)) return null;
  return giftById(text.slice(GIFT_PREFIX.length)) ?? null;
}

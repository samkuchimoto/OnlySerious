// /lib/tiers.ts
// The membership ladder — blueprint "Financial Architecture".
//
// Three paid tiers plus the free one women are on. Prices live in Stripe
// and are read at render (see /api/stripe/price), never written here —
// the amounts in the report are what the Stripe products were created
// with, and if the two ever disagree Stripe is right.
//
// ---------------------------------------------------------------------
// Why `visible` exists, and why VIP is false.
//
// The blueprint assigns VIP "top grid placement, direct contact sharing,
// concierge". None of those exist in this codebase. Selling a $49.99
// tier whose benefits are unbuilt is not an aggressive launch, it is a
// refund queue and a trust problem in a product whose entire pitch is
// that it is the trustworthy one.
//
// So the tier is defined, priced and ready, and hidden. Turning it on is
// this one boolean, the day top-grid placement ships. That is a smaller
//, more reversible decision than either shipping it hollow or leaving
// it unbuilt in a document.
// ---------------------------------------------------------------------

export type TierId = "free" | "standard" | "gold" | "vip";

export type Tier = {
  id: TierId;
  name: string;
  /** Env var holding the Stripe price id. Absent for the free tier. */
  priceEnv?: "STRIPE_PRICE_ID" | "STRIPE_PRICE_ID_GOLD" | "STRIPE_PRICE_ID_VIP";
  /** What the report prices it at, for copy only — Stripe is the truth. */
  displayPrice: string;
  tagline: string;
  /** Benefits that are actually implemented today. */
  benefits: string[];
  /** Benefits the tier is meant to have that do not exist yet. Listed
   *  here rather than in `benefits` so nothing unbuilt can be advertised
   *  by accident — a marketing list that drifts from the code is how a
   *  chargeback starts. */
  pending?: string[];
  visible: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    displayPrice: "€0",
    tagline: "Everything a verified member needs to be found.",
    benefits: [
      "A verified profile with a stated intent",
      "Browse everyone, in grid or detail",
      "Reply to anyone who matches with you",
    ],
    visible: true,
  },
  {
    id: "standard",
    name: "Standard",
    priceEnv: "STRIPE_PRICE_ID",
    displayPrice: "€9.99",
    tagline: "For when the free daily likes run out too fast.",
    benefits: ["More likes every day", "No message cooldown", "Cancel any time"],
    visible: true,
  },
  {
    id: "gold",
    name: "Gold Passport",
    priceEnv: "STRIPE_PRICE_ID_GOLD",
    displayPrice: "€24.99",
    tagline: "For meeting people across borders, not just across town.",
    benefits: [
      "Everything in Standard",
      "See everyone who liked you",
      "Unlimited likes",
    ],
    pending: ["Passport — browse another city before you fly"],
    visible: true,
  },
  {
    id: "vip",
    name: "VIP",
    priceEnv: "STRIPE_PRICE_ID_VIP",
    displayPrice: "€49.99",
    tagline: "For the top of the grid.",
    benefits: ["Everything in Gold Passport"],
    pending: ["Top placement in the grid", "Priority support"],
    // Hidden until the benefits above are real. See the header comment.
    visible: false,
  },
];

export const PURCHASABLE_TIERS = TIERS.filter((t) => t.visible && t.priceEnv);

export function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

/**
 * The Stripe price id for a tier, or null if that tier isn't configured.
 *
 * Server-only — reads process.env, and the env vars are deliberately not
 * NEXT_PUBLIC. Returning null rather than throwing lets the checkout
 * route answer "this tier isn't available" with a 503 instead of a 500,
 * which is the honest difference between unconfigured and broken.
 */
export function priceIdFor(tier: Tier): string | null {
  if (!tier.priceEnv) return null;
  return process.env[tier.priceEnv] ?? null;
}

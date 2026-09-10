// /lib/tiers.ts
// The membership ladder — the audit's "Monetization Architecture".
//
// Prices live in Stripe and are read at render (see /api/stripe/price),
// never charged from here. `displayPrice` below is copy, and if it ever
// disagrees with Stripe, Stripe is right.
//
// ---------------------------------------------------------------------
// The currency change, and why it needs the operator's hand.
//
// The audit prices the ladder in USD — Gold VIP $39.99/mo ($89.99/qtr),
// Platinum Passport $69.99/mo ($179.99/yr), Concierge $499/6mo — on the
// stated reasoning that "Western male subscribers pay via US-dollar-
// denominated international credit and debit cards".
//
// What is live in Stripe today is a EUR ladder (€9.99 / €24.99 / €49.99)
// created under earlier guidance. Stripe prices are immutable in both
// amount and currency, so this is not an edit: every tier below needs a
// **new** Stripe price, and its id pasted into the matching env var.
// Until that happens `priceIdFor` returns null and checkout answers 503
// ("this tier isn't available") rather than silently charging the old
// amount under a new label — which would be the worst possible failure
// here, since the label and the receipt would disagree.
//
// A Stripe customer also cannot hold two currencies, so anyone already
// subscribed in EUR keeps their EUR subscription until they cancel.
// That is Stripe's constraint, not a policy choice.
// ---------------------------------------------------------------------

export type TierId = "free" | "gold" | "platinum" | "concierge";

/** A billing period a tier can be bought on. */
export type Interval = "month" | "quarter" | "year" | "sixmonth";

export type TierPrice = {
  interval: Interval;
  /** Env var holding the Stripe price id. */
  priceEnv: string;
  /** What the audit prices it at, for copy only — Stripe is the truth. */
  display: string;
  /** Shown next to the price, e.g. "Save 25%". Computed by hand from
   *  the audit's own numbers rather than at runtime, because the
   *  runtime value would come from Stripe and be wrong for anyone
   *  reading it before the new prices exist. */
  note?: string;
};

export type Tier = {
  id: TierId;
  name: string;
  prices: TierPrice[];
  tagline: string;
  /** Benefits that are actually implemented today. */
  benefits: string[];
  /** Benefits the tier is meant to have that do not exist yet. Listed
   *  separately so nothing unbuilt can be advertised by accident — a
   *  marketing list that drifts from the code is how a chargeback
   *  starts. */
  pending?: string[];
  visible: boolean;
  /** The one tier the upgrade page leads with. */
  featured?: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Standard Discovery",
    prices: [],
    tagline: "Browse the full directory. No card, no wall.",
    benefits: [
      "A verified profile with a stated intent",
      "Browse every country hub, in grid or editorial",
      "See who has liked you arrive as a notification",
      "Reply to anyone you have matched with",
    ],
    visible: true,
  },
  {
    id: "gold",
    name: "Amora Gold VIP",
    prices: [
      { interval: "month", priceEnv: "STRIPE_PRICE_ID_GOLD_MONTH", display: "$39.99" },
      {
        interval: "quarter",
        priceEnv: "STRIPE_PRICE_ID_GOLD_QUARTER",
        display: "$89.99",
        // The audit: "always offer discounted Quarterly and Annual
        // passes upfront; 40% of paying men will select the 3-month
        // option to lock in savings."
        note: "Save 25%",
      },
    ],
    tagline: "For the moment a conversation actually starts.",
    benefits: [
      "Unlimited messaging — no cooldown between messages",
      "See everyone who liked you, by name",
      "Unlimited likes every day",
    ],
    pending: ["Read receipts", "Voice note playback"],
    visible: true,
    featured: true,
  },
  {
    id: "platinum",
    name: "Amora Platinum Passport",
    prices: [
      { interval: "month", priceEnv: "STRIPE_PRICE_ID_PLATINUM_MONTH", display: "$69.99" },
      {
        interval: "year",
        priceEnv: "STRIPE_PRICE_ID_PLATINUM_YEAR",
        display: "$179.99",
        note: "Save 79%",
      },
    ],
    tagline: "For searching more than one country at once.",
    benefits: ["Everything in Gold VIP"],
    pending: [
      "Live translation inside chat",
      "Priority placement in her inbox",
      "Incognito browsing",
    ],
    visible: true,
  },
  {
    id: "concierge",
    name: "VIP Match Concierge",
    prices: [
      { interval: "sixmonth", priceEnv: "STRIPE_PRICE_ID_CONCIERGE", display: "$499" },
    ],
    tagline: "A person, not a feature set.",
    benefits: [],
    pending: [
      "A personal account manager",
      "Professionally written profile copy",
      "Identity vetting guarantee",
      "Monthly matchmaking calls",
    ],
    // Hidden, and this one is not a close call. Every entitlement is a
    // human service that nobody is currently staffed to deliver, and
    // the price is $499. Selling it before the person behind it exists
    // is not an aggressive launch, it is a refund queue attached to the
    // exact trust claim the whole platform is built on. Flip to true
    // the day someone is actually answering.
    visible: false,
  },
];

export const INTERVAL_LABEL: Record<Interval, string> = {
  month: "per month",
  quarter: "per quarter",
  year: "per year",
  sixmonth: "for six months",
};

/** Tiers that can be bought, in ladder order. */
export const PURCHASABLE_TIERS = TIERS.filter((t) => t.visible && t.prices.length > 0);

export function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

export function priceFor(tier: Tier, interval: Interval): TierPrice | undefined {
  return tier.prices.find((p) => p.interval === interval);
}

/**
 * The Stripe price id for one billing option, or null if it isn't
 * configured.
 *
 * Server-only — reads process.env, and the env vars are deliberately
 * not NEXT_PUBLIC. Returning null rather than throwing lets the
 * checkout route answer "this tier isn't available" with a 503 instead
 * of a 500, which is the honest difference between unconfigured and
 * broken. See the header note: until the USD prices are created in
 * Stripe, that 503 is the expected response.
 */
export function priceIdFor(tier: Tier, interval: Interval): string | null {
  const price = priceFor(tier, interval);
  if (!price) return null;
  return process.env[price.priceEnv] ?? null;
}

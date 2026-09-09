// /config/brand.ts
// Single source of truth for market-facing branding — the product/app
// logic itself (lib/types.ts, lib/moderation.ts, matching) never reads
// from this file and has no nationality-based behavior anywhere. This
// config only drives display strings (title, tagline, metadata), so
// launching a new market is a config change, not a fork of the codebase.
//
// Rebranded from OnlySerious/OSThai to AmoraAsia. Three reasons, in
// order of weight:
//
// 1. "Only-" reads as a subscription-content prefix to exactly the
//    Western male audience the app is priced for, which is a brand-safety
//    problem before it is a taste problem.
// 2. "Serious" describes a filter, not a feeling. It is a product
//    attribute pretending to be a name, and attribute-names do not get
//    shared — nobody tells a friend about an app called Serious.
// 3. The regional scope widened from Thailand to Southeast Asia
//    (Thailand and the Philippines first, then Vietnam, Taiwan,
//    Singapore). "OSThai" hard-codes one market into the name and would
//    have to be abandoned at the first border.
//
// "Amora" carries the Latin romantic root that reads warm in the
// Philippines, Vietnam and the West alike, and "Asia" states the scope
// without naming a single country. The trust promise the old name
// carried does not disappear — it moves into the product, where an
// intent gate and photo verification can actually enforce it, rather
// than sitting in a wordmark where it is only a claim.

export const BRAND_CONFIG = {
  masterBrand: "AmoraAsia",
  domain: "amoraasia.com",
  /** Phase 1 anchors. Vietnam, Taiwan and Singapore follow in phase 2. */
  launchMarkets: ["Thailand", "Philippines"],
  /** Kept for copy that needs a single market while phase 1 is Thailand-led. */
  launchMarket: "Thailand",
  appTitle: "AmoraAsia",
  tagline: "Serious relationships across Southeast Asia.",
  // The wedge stays sharp. The product supports broader intent later,
  // but launch messaging is about ending the wasted time, because that
  // is the specific pain both sides of this market actually have.
  heroHeadline: "Done wasting time on dating apps?",
  heroSubheadline:
    "Verified profiles. Real intent. Meet people who are actually serious about a relationship.",
  // What the paid tier is called wherever a member sees it. Kept here so
  // the checkout page, the confirmation and any future push copy all say
  // the same thing — a plan that's "membership" in one place and "Plus"
  // in another reads like two different products.
  premiumName: "AmoraAsia Gold",
} as const;

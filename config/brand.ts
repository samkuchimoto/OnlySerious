// /config/brand.ts
// Single source of truth for market-facing branding — the product/app
// logic itself (lib/types.ts, lib/moderation.ts, matching) never reads
// from this file and has no nationality-based behavior anywhere. This
// config only drives display strings (title, tagline, metadata), so
// launching a new market (OSJapan, OSFrance, ...) is a config change, not
// a fork of the codebase.
//
// domain deliberately left unset here — real domain/trademark/app-store
// name availability hasn't been cleared yet (per direct instruction);
// hardcoding one before that check would bake in an unverified assumption.

export const BRAND_CONFIG = {
  masterBrand: "OnlySerious",
  launchMarket: "Thailand",
  appTitle: "OSThai",
  tagline: "Serious matchmaking in Thailand.",
  // Sharp acquisition wedge, not a generic "meet people for anything"
  // pitch — the product supports broader intent later (friendship, etc.),
  // but launch messaging stays dating-specific.
  heroHeadline: "Done wasting time on dating apps?",
  heroSubheadline: "Meet people who are actually serious about a relationship.",
  // What the paid tier is called wherever a member sees it. Kept here so
  // the checkout page, the confirmation and any future push copy all say
  // the same thing — a plan that's "membership" in one place and "Plus"
  // in another reads like two different products.
  premiumName: "OSThai Plus",
} as const;

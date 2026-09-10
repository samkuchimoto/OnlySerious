// /lib/discovery.ts
//
// The recency-decay sort and the 72-hour freshness gate.
//
// The audit's finding: "The browse screen currently surfaces candidate
// accounts that were last active six days prior... surfacing inactive
// profiles creates an impression of low platform vitality, leading
// prospective paying men to abandon registration."
//
// Its prescription, taken literally:
//   • active within 15 minutes  → primary algorithmic weighting
//   • active within 24 hours    → next
//   • inactive beyond 72 hours  → out of the primary feed entirely,
//                                 into "deep catalog queries"
//
// ---------------------------------------------------------------------
// Two decisions worth stating, because both cut against the letter of
// the brief in a way that protects the thing it is actually asking for.
//
// 1. Filtered out, not deleted. The >72h profiles move to a second
//    section the user can open ("the deep catalog"), rather than
//    vanishing. At current registry size, hard-dropping them would take
//    a feed of a few dozen people down to a handful, and an empty grid
//    is a far louder signal of a dead platform than a stale one is.
//    The gate is therefore a fold, not a shredder — and it becomes a
//    true cut on its own the moment there is enough liquidity to fill
//    the fresh tier, with no code change needed.
//
// 2. A profile with no lastActiveAt at all is treated as fresh, not as
//    stale. That field is only written on a browse page load, so a
//    member who completed sign-up and has not opened Browse yet has
//    none — burying the newest members would invert the ranking the
//    audit is asking for.
// ---------------------------------------------------------------------

import type { UserProfile } from "@/lib/types";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const FRESH_WINDOW_MS = 15 * MINUTE;
export const RECENT_WINDOW_MS = 24 * HOUR;
export const STALE_AFTER_MS = 72 * HOUR;

export type FreshnessTier = "live" | "today" | "week" | "stale";

/** Milliseconds since this profile was last seen, or null when unknown. */
function ageOf(profile: UserProfile): number | null {
  if (!profile.lastActiveAt) return null;
  const ms = Date.now() - new Date(profile.lastActiveAt).getTime();
  // A clock-skewed future timestamp is treated as "right now" rather
  // than as a negative age that would sort it above everyone.
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

export function freshnessOf(profile: UserProfile): FreshnessTier {
  const age = ageOf(profile);
  // Never seen browsing — a brand-new member. See note 2 above.
  if (age === null) return "today";
  if (age < FRESH_WINDOW_MS) return "live";
  if (age < RECENT_WINDOW_MS) return "today";
  if (age < STALE_AFTER_MS) return "week";
  return "stale";
}

export function isStale(profile: UserProfile): boolean {
  return freshnessOf(profile) === "stale";
}

const TIER_WEIGHT: Record<FreshnessTier, number> = {
  live: 0,
  today: 1,
  week: 2,
  stale: 3,
};

/**
 * Orders a feed by the audit's decay: freshest tier first, and within a
 * tier the more recently seen first.
 *
 * Sorts a copy. The caller's array is state in three different pages,
 * and an in-place sort of React state is a mutation bug waiting for a
 * re-render that does not happen.
 */
export function sortByRecency(profiles: UserProfile[]): UserProfile[] {
  return [...profiles].sort((a, b) => {
    const tierDelta = TIER_WEIGHT[freshnessOf(a)] - TIER_WEIGHT[freshnessOf(b)];
    if (tierDelta !== 0) return tierDelta;
    // Within a tier: most recent first. A profile with no timestamp
    // sorts to the back of its own tier rather than to the front, so a
    // never-seen member ranks below someone genuinely active today.
    const aAge = ageOf(a) ?? Number.MAX_SAFE_INTEGER;
    const bAge = ageOf(b) ?? Number.MAX_SAFE_INTEGER;
    return aAge - bAge;
  });
}

/**
 * Splits a feed into what the audit calls the primary feed and the deep
 * catalog. Both come back sorted.
 */
export function partitionByFreshness(profiles: UserProfile[]): {
  primary: UserProfile[];
  deepCatalog: UserProfile[];
} {
  const sorted = sortByRecency(profiles);
  return {
    primary: sorted.filter((p) => !isStale(p)),
    deepCatalog: sorted.filter((p) => isStale(p)),
  };
}

/** How many people are live right now — the Live Lounge's pulse count. */
export function countLive(profiles: UserProfile[]): number {
  return profiles.filter((p) => freshnessOf(p) === "live").length;
}

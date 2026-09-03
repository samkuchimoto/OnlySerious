// /lib/types.ts
// Core data model. Deliberately country/nationality-agnostic — no field
// anywhere encodes a user's nationality as a matching or pricing input.
// Everyone gets the same access, same price, same rules, regardless of
// who they are or where they're from.

export const MAX_PROFILE_PHOTOS = 6;
// Every profile on this platform is here for a long-term relationship —
// that's the platform's own scope, not a per-profile choice, so there's
// no "intent" field to ask about at sign-up. What a person actually
// checks first is photos and age, so photos are mandatory: at least this
// many approved before a profile is considered complete.
export const MIN_PROFILE_PHOTOS = 3;

// Daily like limit — applied by subscriptionStatus, never by gender: a
// free/paid usage tier is a normal product decision, but justifying it
// by "which gender needs slowing down" isn't something this platform
// does anywhere else, so this isn't done here either.
export const FREE_DAILY_LIKE_LIMIT = 5;
export const PAID_DAILY_LIKE_LIMIT = 100;

// Curated for a long-term-relationship platform specifically — not
// generic icebreaker humor. A person picks 3 and writes a real answer,
// replacing a single free-text bio; each becomes its own card other
// members can like directly (see Like.promptId below), giving a real
// conversation starter instead of a blind heart-tap.
export const PROMPT_QUESTIONS = [
  "The way to my heart is",
  "A life goal of mine is",
  "I'm looking for someone who",
  "I know it's right when",
  "A non-negotiable for me is",
  "Home, to me, feels like",
  "The kind of partner I want to be is",
  "My friends would describe me as",
  "Something I'm serious about is",
  "In five years, I hope to",
] as const;

export const REQUIRED_PROMPT_COUNT = 3;

// Long-term-relationship-scoped on purpose — this isn't Hinge's full
// short/long spectrum. The platform's whole scope is already long-term
// (see this file's header comment), so every option here stays inside
// that; this field exists to capture *which flavor* of long-term someone
// wants, and makes the homepage's "verified for intent" claim concretely
// true instead of just implied by policy.
export const DATING_INTENTION_OPTIONS = [
  "Life partner",
  "Long-term relationship",
  "Marriage-minded",
  "Still figuring out the details",
] as const;

export interface ProfilePrompt {
  id: string;
  question: string;
  answer: string;
}

export interface UserProfile {
  id: string; // Firebase Auth uid
  displayName: string;
  birthdate: string; // ISO date — age is computed from this, never stored redundantly
  gender: string;
  interestedIn: string[];
  city: string;
  country: string;
  // Optional (not every existing profile has one) — see
  // DATING_INTENTION_OPTIONS above for why this is scoped narrower than
  // a typical "what are you looking for" field.
  datingIntention?: string;
  prompts: ProfilePrompt[];
  // Mirrors the number linked to this account's Firebase Auth user via
  // linkWithPhoneNumber — required of everyone equally (not gender-
  // specific), as the low-friction traceability signal every major
  // dating app already uses, instead of collecting ID documents.
  phoneNumber: string;
  photos: ProfilePhoto[];
  status: "pending_review" | "active" | "suspended";
  // Self-service pause, distinct from a moderator suspending the
  // account — a paused profile is hidden from browse the same way, but
  // the person controls it themselves and can undo it.
  paused?: boolean;
  createdAt: string;
  subscriptionStatus: "free" | "active" | "past_due" | "canceled";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Denormalized daily like counter (app/api/likes/route.ts) — avoids a
  // composite Firestore index that can't be deployed via CLI right now
  // (the service account lacks the IAM role; see the Firestore rules
  // setup step). Resets whenever dailyLikesDate isn't today.
  dailyLikesUsed?: number;
  dailyLikesDate?: string; // "YYYY-MM-DD"
  // Set only by app/api/verify-selfie/route.ts after a real Groq vision
  // comparison against an approved profile photo returns a confident
  // match — never client-settable, and never set on an uncertain result
  // (see that route's honest-fallback reasoning).
  selfieVerified?: boolean;
  // Web Push registration tokens (Firebase Cloud Messaging), one per
  // browser/device that's enabled notifications. A token going stale
  // (uninstalled, permissions revoked) just means a future send to it
  // fails silently — see app/api/**'s notifyUser() usage.
  fcmTokens?: string[];
  // Set on every app/browse page load (see its useEffect) — a real,
  // if coarse, signal rather than a live presence system. See
  // lib/activity.ts for how this becomes "Online now" / "Active 2d ago".
  lastActiveAt?: string;
}

export interface Like {
  id: string;
  likerId: string;
  likedId: string;
  createdAt: string;
  // Which prompt the like was on, and an optional short reply to it —
  // mirrors Hinge's real mechanic (liking a specific card, not a blind
  // swipe) so a match starts with an actual conversation opener rather
  // than a silent match with nothing to say.
  promptId?: string;
  comment?: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  // Set by real moderation (lib/moderation.ts) at upload time — a photo
  // never becomes publicly visible until this is "approved". No manual
  // override that skips this check.
  moderationStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export interface Match {
  id: string;
  userIds: [string, string];
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
  // Set by real text moderation (lib/moderation.ts) — a flagged message
  // still gets held for human review, never silently auto-banned on a
  // single automated signal alone (real people get false-flagged).
  flagged: boolean;
}

export interface Report {
  id: string;
  reportedUserId: string;
  reportedByUserId: string;
  reason: string;
  context: string; // free text, e.g. a copied message or note
  createdAt: string;
  status: "open" | "reviewed" | "actioned" | "dismissed";
}

export interface Block {
  id: string; // `${blockerId}_${blockedId}`, deterministic — no duplicates possible
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// Lighter-weight than Block — a quiet "don't show me this person again"
// that only ever affects the hider's own browse results. Never notifies
// or restricts the hidden person, and (unlike Block) isn't visible from
// their side at all.
export interface Hide {
  id: string; // `${hiderId}_${hiddenId}`, deterministic — same pattern as Block
  hiderId: string;
  hiddenId: string;
  createdAt: string;
}

// Prelaunch email capture — homepage + the sign-up gate shown while
// registration is women-first (config/brand.ts doesn't own this; it's a
// launch-sequencing decision, not market branding). Written directly
// from the client (firestore.rules validates shape), never read back.
export interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: string;
}

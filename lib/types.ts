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

// ThaiFriendly's model, not Hinge's — a short one-line headline (what
// shows first on a Browse card) plus a plain free-text bio, instead of
// picking curated prompts and writing witty answers to them. Direct
// feedback: crafting a clever English prompt answer is real friction for
// non-native English speakers, which is exactly the audience here.
export const MAX_HEADLINE_LENGTH = 80;
export const MAX_BIO_LENGTH = 500;

export interface UserProfile {
  id: string; // Firebase Auth uid
  displayName: string;
  birthdate: string; // ISO date — age is computed from this, never stored redundantly
  gender: string;
  interestedIn: string[];
  city: string;
  country: string;
  headline: string;
  bio: string;
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

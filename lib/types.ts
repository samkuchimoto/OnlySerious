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

// ---------------------------------------------------------------------
// The messaging gate.
//
// The audit: "standard male accounts should be restricted to sending one
// outbound message every 12 hours... The monetization gate must trigger
// precisely at the moment of peak outbound intent: communication."
//
// Twelve hours is implemented. Two things about *how* are deliberate
// departures from the literal wording, and both exist to deliver the
// mechanic the audit is actually after rather than the sentence it used.
//
// 1. It is not applied by gender.
//
//    The report's model is "free for local women, paywalled for foreign
//    men". The commercial logic is sound; charging for a service on the
//    basis of sex is not something this operator can do — EU Directive
//    2004/113/EC prohibits exactly that in access to goods and services,
//    and the business is a French micro-entreprise squarely inside its
//    scope. It also contradicts this file's own standing rule that no
//    field encodes gender as a pricing or matching input.
//
// 2. It applies only to *opening* a conversation, never to replying.
//
//    This is what makes a gender-neutral rule land where the audit
//    wants it. A flat 12-hour cooldown on every free account would
//    throttle women too — and women are the supply side nobody is
//    asking to pay, so slowing them down damages the exact liquidity
//    the paywall is meant to monetise. Gating cold opens instead
//    throttles unreciprocated outbound volume, which is the behaviour
//    the report is describing when it says "men send messages into a
//    void". Anyone who has been written to can always write back, free,
//    instantly.
//
// The result: a free member may open one new conversation every twelve
// hours and reply to anyone, always. Paying removes the wait entirely.
// ---------------------------------------------------------------------
export const FREE_OPENING_COOLDOWN_MS = 12 * 60 * 60 * 1000;

// "Who liked you" is a paid feature (ThaiFriendly's model). Enforced in
// app/api/liked-me, not in the UI — firestore.rules stops a client
// reading likes addressed to it, so this can't be defeated from devtools.
//
// A single switch because it has one real risk worth being able to undo
// in a minute: the gate keys off subscriptionStatus, not gender, so
// women see it too — and they're the side being recruited, not the side
// expected to pay. If female retention dips after launch, flip this to
// false and the page shows everyone their likers again, with no other
// change needed anywhere.
export const LIKED_ME_REQUIRES_SUBSCRIPTION = true;

// ThaiFriendly's model, not Hinge's — a short one-line headline (what
// shows first on a Browse card) plus a plain free-text bio, instead of
// picking curated prompts and writing witty answers to them. Direct
// feedback: crafting a clever English prompt answer is real friction for
// non-native English speakers, which is exactly the audience here.
// Raised from 80 after the first real profiles came in: 80 cut a sincere
// one-sentence headline off mid-word ("...someone who has chil"), because
// maxLength silently stops accepting keystrokes with nothing on screen
// saying so. The input now shows a live counter (see the sign-up form) —
// that's the actual fix; the extra room just stops the common case from
// hitting the wall at all. Non-native English speakers write longer, not
// shorter, when they're being earnest.
export const MAX_HEADLINE_LENGTH = 120;
export const MAX_BIO_LENGTH = 500;

// ---------------------------------------------------------------------
// Relationship intent.
//
// The blueprint's Step 1.2 — "Intent Commitment", mandatory selection,
// casual options excluded. The exclusion is the entire mechanic and it
// is worth being precise about why: ThaiFriendly's structural weakness
// is not that it has casual users, it is that it has no way to tell
// which is which, so every serious woman on it is answering messages
// from people with a different goal. An app that lets someone pick
// "not sure yet" has re-created that problem while claiming to solve it.
//
// So there is no casual option here — not a discouraged one, not one
// that routes elsewhere. The list below is exhaustive, and a profile
// without one of these values does not go live.
// ---------------------------------------------------------------------

export const RELATIONSHIP_INTENTS = [
  {
    value: "marriage",
    label: "Seeking marriage",
    // The audit's Intent Badge wording, verbatim ("Marriage Oriented",
    // "Relocation Ready"). Separate from `label` because the two are
    // read in different places and want different grammar: `label` is a
    // sentence a person picks about themselves during sign-up, `badge`
    // is a chip on someone else's card that has to survive being
    // scanned at 3-across on a phone.
    badge: "Marriage Oriented",
    description: "I want to marry. I would rather be clear about that now than in a year.",
  },
  {
    value: "long_term",
    label: "Long-term relationship",
    badge: "Long-Term",
    description: "Something real and lasting. Marriage is possible if it becomes right.",
  },
  {
    value: "life_partner",
    label: "Relocation & life partner",
    badge: "Relocation Ready",
    description: "I am open to building a life across borders, including moving country.",
  },
] as const;

export type RelationshipIntent = (typeof RELATIONSHIP_INTENTS)[number]["value"];

export const RELATIONSHIP_INTENT_VALUES = RELATIONSHIP_INTENTS.map((i) => i.value) as readonly string[];

/** Server-side guard. The UI offers only these three, but the UI is not
 *  a security boundary — a profile could otherwise be written with any
 *  intent string, or none, straight through the client SDK. */
export function isRelationshipIntent(value: unknown): value is RelationshipIntent {
  return typeof value === "string" && RELATIONSHIP_INTENT_VALUES.includes(value);
}

export function intentLabel(value: string | undefined): string | null {
  return RELATIONSHIP_INTENTS.find((i) => i.value === value)?.label ?? null;
}

/** The short chip form, for card faces and grid tiles. */
export function intentBadge(value: string | undefined): string | null {
  return RELATIONSHIP_INTENTS.find((i) => i.value === value)?.badge ?? null;
}

/**
 * Age from an ISO birthdate. Lives here because age is never stored — it
 * would be wrong within a year of being written — so every surface that
 * shows it has to derive it, and three of them had grown their own copy
 * of this function.
 */
export function calculateAge(birthdate: string): number {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

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
  // Mandatory from the Intent Commitment step. Optional in the type only
  // because profiles created before this shipped do not have one — those
  // are prompted to choose on next sign-in rather than being deleted.
  // Everything written from here forward has it.
  relationshipIntent?: RelationshipIntent;
  // Lifestyle attributes (blueprint Step 1.4). Optional by design: these
  // improve filtering and are worth asking for, but making them
  // mandatory adds four screens between someone deciding to join and
  // having a profile, which is where onboarding funnels die.
  occupation?: string;
  languages?: string[];
  religion?: string;
  children?: "none" | "have" | "want" | "open";
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
  // When this person last sent a message — the only input to the free
  // tier's send cooldown (app/api/messages/route.ts). Server-written
  // only, like the like counters above: a client that could set this
  // could clear its own cooldown.
  lastMessageAt?: string; // ISO timestamp
  // When this person last *opened* a conversation — the only input to
  // the free tier's twelve-hour gate. Distinct from lastMessageAt on
  // purpose: replying must not consume the opening window, or a single
  // active conversation would lock someone out of starting another.
  // Server-written only, like the counters above.
  lastOpenedConversationAt?: string; // ISO timestamp
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
  // Consent to appear on the public homepage. Absent means no, which
  // is what every member created before this existed is: showing a
  // profile to signed-out visitors reverses firestore.rules' deliberate
  // "an active profile isn't meant to be scraped by anyone without an
  // account", and a photograph plus a city is personal data. Only
  // /api/showcase reads it.
  publicShowcase?: boolean;
  // The 15-second voice introduction. Written only by
  // app/api/voice-intro, which is also the only place its
  // moderationStatus is decided.
  voiceIntro?: VoiceIntro | null;
}

// ---------------------------------------------------------------------
// Voice introductions.
//
// The audit's Phase 2 opener and the brief's "15-Second Voice Sparks".
// Fifteen seconds is the whole specification and it is a real
// constraint, not a default: long enough for a name, a city and a
// sentence about what someone wants, short enough that a stranger
// actually presses play, and short enough that nobody records a
// monologue that then needs moderating like an essay.
// ---------------------------------------------------------------------
export const VOICE_INTRO_MAX_SECONDS = 15;
// Below this it is a cough, not an introduction.
export const VOICE_INTRO_MIN_SECONDS = 3;

export interface VoiceIntro {
  url: string;
  durationSeconds: number;
  // Decided server-side from a transcript (see lib/moderation's
  // moderateVoice) — never client-asserted, and never "approved" by
  // default when transcription is unavailable. Only an approved intro is
  // shown to anyone but its owner.
  moderationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
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

// ---------------------------------------------------------------------
// The Safe Connect Bridge.
//
// Blueprint Step 3. Cross-border couples always end up on LINE or
// WhatsApp — pretending otherwise just means the handoff happens
// anyway, in an unmoderated blur, usually as a phone number typed into
// a message where nobody consented and nothing is logged.
//
// So the handoff is a first-class flow instead of something the product
// refuses to acknowledge. Three properties matter and each is enforced,
// not merely encouraged:
//
//   Earned      Contact details cannot be requested before both people
//               have actually talked. The threshold is mutual, not a
//               total: five messages one person sent into silence is
//               not a conversation, and that asymmetry is precisely the
//               pattern a spammer produces.
//   Consented   The recipient accepts or declines. Nothing is revealed
//               by the act of asking, and a decline is silent — it
//               neither notifies nor shames.
//   Logged      Timestamps survive the handoff, so a report made a week
//               later still has something to investigate. This is the
//               part that makes it a safety feature rather than a
//               convenience.
// ---------------------------------------------------------------------

/** Mutual messages each side must have sent before contact can be
 *  requested. Shared so the chat UI and the API agree — a client that
 *  believed a different number would either hide a legitimate button or
 *  offer one the server rejects. */
export const CONTACT_EXCHANGE_MIN_MESSAGES = 5;

export type ContactChannel = "line" | "whatsapp" | "telegram";

export const CONTACT_CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "line", label: "LINE" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
];

export function isContactChannel(value: unknown): value is ContactChannel {
  return value === "line" || value === "whatsapp" || value === "telegram";
}

export interface ContactExchange {
  id: string; // deterministic: `${matchId}` — one live exchange per match
  matchId: string;
  requesterId: string;
  recipientId: string;
  channel: ContactChannel;
  /** The requester's handle. Only ever revealed to the recipient after
   *  they accept — held server-side until then, so a pending request
   *  leaks nothing if it is declined or ignored. */
  requesterHandle: string;
  /** Filled when the recipient accepts and shares theirs back. An
   *  exchange is mutual by construction: accepting means sharing, which
   *  is what stops it becoming a one-way harvest. */
  recipientHandle?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt?: string;
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

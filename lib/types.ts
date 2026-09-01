// /lib/types.ts
// Core data model. Deliberately country/nationality-agnostic — no field
// anywhere encodes a user's nationality as a matching or pricing input.
// Everyone gets the same access, same price, same rules, regardless of
// who they are or where they're from.

export type RelationshipIntent = "long_term" | "not_sure";

export interface UserProfile {
  id: string; // Firebase Auth uid
  displayName: string;
  birthdate: string; // ISO date — age is computed from this, never stored redundantly
  gender: string;
  interestedIn: string[];
  city: string;
  country: string;
  bio: string;
  intent: RelationshipIntent;
  photos: ProfilePhoto[];
  status: "pending_review" | "active" | "suspended";
  createdAt: string;
  subscriptionStatus: "free" | "active" | "past_due" | "canceled";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
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

// /lib/analytics.ts
// Funnel tracking (PostHog). The whole point is answering "where do
// people fall out of the funnel", which raw signup counts can't:
// Firestore tells you how many profiles went live, not how many people
// started and gave up at the 3-photo requirement.
//
// Every function here is a no-op when NEXT_PUBLIC_POSTHOG_KEY isn't set,
// so a deployment without analytics behaves normally rather than
// throwing — the same degradation pattern lib/stripe.ts uses for billing.
//
// Nothing here is a source of truth for anything that decides money.
// Milestone payouts are verified against Firestore (real signups) and the
// Stripe dashboard (real payments); analytics is for diagnosing the
// funnel, and ad-blockers make it an undercount by nature.

import posthog from "posthog-js";

// The events worth naming explicitly. A closed set rather than free-form
// strings: a typo'd event name doesn't error, it just quietly creates a
// second event that never shows up in the funnel you built.
export type AnalyticsEvent =
  | "signup_started"
  | "gender_selected"
  | "profile_submitted"
  | "photo_uploaded"
  | "photo_rejected"
  | "profile_live"
  | "like_sent"
  | "match_made"
  | "daily_limit_reached"
  | "message_sent"
  | "message_cooldown_hit"
  | "upgrade_clicked"
  | "checkout_started"
  | "waitlist_joined"
  | "app_install_prompted"
  | "app_install_accepted"
  | "app_install_dismissed"
  | "app_installed"
  | "apk_downloaded";

function enabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function capture(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!enabled()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never take down a user action. A blocked or failed
    // capture is not worth surfacing to the person using the app.
  }
}

// Ties events to a stable person across devices and sessions. Called on
// sign-in; without it a returning user looks like a brand-new one and
// every funnel over-counts the top step.
export function identify(userId: string, properties?: Record<string, unknown>): void {
  if (!enabled()) return;
  try {
    posthog.identify(userId, properties);
  } catch {
    // Same reasoning as capture().
  }
}

// Called on sign-out. Without it the next person to use the same browser
// inherits the previous user's identity and their events merge together.
export function resetAnalytics(): void {
  if (!enabled()) return;
  try {
    posthog.reset();
  } catch {
    // Same reasoning as capture().
  }
}

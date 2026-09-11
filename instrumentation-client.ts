// /instrumentation-client.ts
// Next.js runs this after the document loads and before React hydrates
// (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// instrumentation-client.md), which is the right moment to start
// analytics: early enough to catch the first pageview, without a
// provider component wrapping the tree.
//
// Silent no-op when NEXT_PUBLIC_POSTHOG_KEY is unset, so local dev and
// any deployment without analytics configured behave exactly as before.

import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  try {
    posthog.init(key, {
      // Regional host — PostHog Cloud EU and US are separate deployments
      // and a key from one does not work against the other.
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Automatic capture handles the initial document load; the
      // onRouterTransitionStart hook below handles every client-side
      // navigation after it. Both are needed and neither duplicates the
      // other, because the hook fires on transitions and not on first
      // render.
      //
      // This was false, on the reasoning that automatic capture only
      // fires on a real document load and would therefore miss App
      // Router navigations. The first half is true; the conclusion
      // threw away the landing pageview of every session. Verified
      // against production: a visitor who arrived and did not click
      // produced no events whatsoever, so the entry URL — and with it
      // the UTM parameters that say which ad paid for that visit —
      // was never recorded. That is the one measurement the acquisition
      // push actually depends on.
      capture_pageview: true,
      // UTM parameters ride along on the first pageview of a session and
      // are what let a signup be attributed back to the link that
      // produced it — i.e. which of the VA's platforms actually worked.
      persistence: "localStorage+cookie",
    });
  } catch {
    // Analytics failing to start must never block the app from booting.
  }
}

// App Router client-side navigations. Without this, a session shows one
// pageview no matter how far the person actually got, and every
// step-to-step funnel built on pageviews is wrong.
export function onRouterTransitionStart(url: string) {
  if (!key) return;
  try {
    posthog.capture("$pageview", { $current_url: url });
  } catch {
    // Same reasoning as init above.
  }
}

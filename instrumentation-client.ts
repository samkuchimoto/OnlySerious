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
      // Manual, because PostHog's automatic pageview capture only fires
      // on a real document load. App Router navigations are client-side,
      // so every page after the first would be missing — they're sent
      // from onRouterTransitionStart below instead.
      capture_pageview: false,
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

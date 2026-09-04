// /app/premium/page.tsx
// The checkout page. Reachable from the Browse limit banner, Settings,
// and directly — someone who's decided to pay shouldn't have to hit the
// like wall again to find the button.
//
// The price is read from Stripe at render (via /api/stripe/price) rather
// than written into this file, so editing the amount in the Stripe
// dashboard can never leave the page advertising a stale number.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { FREE_DAILY_LIKE_LIMIT, PAID_DAILY_LIKE_LIMIT, type UserProfile } from "@/lib/types";
import { capture } from "@/lib/analytics";

type PriceInfo = { amount: number | null; currency: string; interval: string | null };

export default function Premium() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<PriceInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const snap = await getDoc(doc(db, "users", nextUser.uid)).catch(() => null);
        if (snap?.exists()) setProfile(snap.data() as UserProfile);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    // A failure here is not fatal — the page still sells the plan, just
    // without a number on it, which beats blocking checkout entirely
    // because a price lookup timed out.
    fetch("/api/stripe/price")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPrice(data))
      .catch(() => setPrice(null));
  }, []);

  async function startCheckout() {
    if (!user) return;
    setError(null);
    setStarting(true);
    capture("upgrade_clicked", { source: "premium_page" });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        setError(
          res.status === 503
            ? "Subscriptions aren't switched on yet — check back shortly."
            : res.status === 409
              ? "You're already subscribed."
              : "Couldn't start checkout. Please try again.",
        );
        setStarting(false);
        return;
      }
      capture("checkout_started");
      window.location.href = body.url;
    } catch {
      setError("Couldn't start checkout. Please try again.");
      setStarting(false);
    }
  }

  const priceLabel =
    price?.amount != null
      ? `${price.currency} ${price.amount}${price.interval ? ` / ${price.interval}` : ""}`
      : null;

  const benefits = [
    `${PAID_DAILY_LIKE_LIMIT} likes a day instead of ${FREE_DAILY_LIKE_LIMIT}`,
    "Reach everyone you're interested in, the day you find them",
    "Cancel any time — no lock-in",
  ];

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-y-2 px-6 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <Link href="/browse" className="text-sm text-neutral-400 transition-colors hover:text-neutral-900">
          Back to browse
        </Link>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}

        {!loading && !user && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Sign in first</h1>
            <p className="max-w-md text-neutral-500">
              You&apos;ll need an account before you can subscribe.
            </p>
            <Link
              href="/sign-up"
              className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Get started
            </Link>
          </div>
        )}

        {/* Already paying — showing a buy button here would either create
            a second subscription or dead-end on the checkout route's 409. */}
        {!loading && user && profile?.subscriptionStatus === "active" && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">You&apos;re subscribed</h1>
            <p className="max-w-md text-neutral-500">
              You have {PAID_DAILY_LIKE_LIMIT} likes a day. Manage or cancel your subscription from
              Settings.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                Back to browse
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-neutral-300 px-8 py-3.5 text-sm font-medium transition-colors hover:border-neutral-900"
              >
                Settings
              </Link>
            </div>
          </div>
        )}

        {!loading && user && profile?.subscriptionStatus !== "active" && (
          <div className="flex flex-col items-start gap-8 pt-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-medium tracking-tight">More likes, every day</h1>
              <p className="max-w-md text-neutral-500">
                The free plan gives you {FREE_DAILY_LIKE_LIMIT} likes a day. If you&apos;re meeting
                people you actually want to talk to, that runs out fast.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-neutral-200 p-6">
              {priceLabel && (
                <p className="text-2xl font-medium tracking-tight">{priceLabel}</p>
              )}
              <ul className="mt-4 flex flex-col gap-2.5">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-neutral-600">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <button
                onClick={startCheckout}
                disabled={starting}
                className="mt-6 w-fit rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {starting ? "Opening checkout…" : "Subscribe"}
              </button>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <p className="mt-4 text-xs text-neutral-400">
                Secure payment through Stripe. Your card details never touch {BRAND_CONFIG.appTitle}.
              </p>
            </div>

            <p className="text-xs text-neutral-400">
              Subscriptions renew automatically until cancelled. Cancel any time from{" "}
              <Link href="/settings" className="underline hover:text-neutral-700">
                Settings
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

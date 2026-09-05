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
  // Distinguishes "still fetching" from "Stripe refused" — they render
  // very differently and were previously both just `price === null`.
  const [priceState, setPriceState] = useState<"loading" | "ready" | "unavailable">("loading");
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

  // The price lookup doubles as a health check on billing. It and
  // Checkout talk to Stripe with the same key and the same price id, so
  // if this fails, Subscribe is guaranteed to fail too — which is
  // exactly what a misconfigured key produced: a page with no price and
  // a button that errored on click. Better to say billing is
  // unavailable than to invite someone into a checkout that can't work.
  useEffect(() => {
    fetch("/api/stripe/price")
      .then(async (res) => {
        if (!res.ok) throw new Error("price unavailable");
        return res.json();
      })
      .then((data: PriceInfo) => {
        if (data?.amount == null) throw new Error("price has no amount");
        setPrice(data);
        setPriceState("ready");
      })
      .catch(() => setPriceState("unavailable"));
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

        {/* Signed in but no profile document yet. The checkout route
            requires one (it reads displayName and writes stripeCustomerId
            back to it) and 404s without it, so offering Subscribe here
            would fail with a generic error after the click instead of
            saying what's actually missing. */}
        {!loading && user && !profile && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Finish your profile first</h1>
            <p className="max-w-md text-neutral-500">
              You&apos;ll be able to subscribe once your profile is set up.
            </p>
            <Link
              href="/sign-up"
              className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Create your profile
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

        {!loading && user && profile && profile.subscriptionStatus !== "active" && (
          <div className="flex flex-col items-start gap-8 pt-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-medium tracking-tight">More likes, every day</h1>
              <p className="max-w-md text-neutral-500">
                The free plan gives you {FREE_DAILY_LIKE_LIMIT} likes a day. If you&apos;re meeting
                people you actually want to talk to, that runs out fast.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-neutral-200 p-6">
              {/* The price leads the card. Nobody decides to subscribe
                  from a feature list alone, and a card that lists
                  benefits and then asks for a card number without ever
                  naming the amount reads as something to be wary of. */}
              {priceState === "ready" && price?.amount != null && (
                <p className="text-3xl font-medium tracking-tight">
                  {price.currency} {price.amount}
                  {price.interval && (
                    <span className="text-base font-normal text-neutral-500"> / {price.interval}</span>
                  )}
                </p>
              )}
              {priceState === "loading" && (
                <div className="h-9 w-32 animate-pulse rounded-md bg-neutral-100" aria-hidden />
              )}

              <ul className={`flex flex-col gap-2.5 ${priceState === "unavailable" ? "" : "mt-5"}`}>
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-neutral-600">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                    {benefit}
                  </li>
                ))}
              </ul>

              {priceState === "unavailable" ? (
                // Same key, same price id as Checkout — if the price
                // can't be read, Subscribe cannot succeed. Showing the
                // button anyway just moves the failure one click later.
                <p className="mt-6 text-sm text-neutral-500">
                  Subscriptions are temporarily unavailable. Nothing has been charged — please try again
                  shortly.
                </p>
              ) : (
                <>
                  <button
                    onClick={startCheckout}
                    disabled={starting || priceState === "loading"}
                    className="mt-6 w-fit rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    {starting ? "Opening checkout…" : "Subscribe"}
                  </button>

                  {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                  <p className="mt-4 text-xs text-neutral-400">
                    Secure payment through Stripe. Your card details never touch {BRAND_CONFIG.appTitle}.
                  </p>
                </>
              )}
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

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
import { INTERVAL_LABEL, TIERS, type Interval, type TierId } from "@/lib/tiers";
import { FREE_DAILY_LIKE_LIMIT, PAID_DAILY_LIKE_LIMIT, type UserProfile } from "@/lib/types";
import { capture } from "@/lib/analytics";

type PriceInfo = {
  amount: number | null;
  currency: string;
  interval: string | null;
  /** "gold:month" -> whether a Stripe price id is configured for it. */
  plans?: Record<string, boolean>;
};

export default function Premium() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes "still fetching" from "Stripe refused" — they render
  // very differently, and were previously both just a null price.
  const [priceState, setPriceState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which tier/interval pairs Stripe can actually sell right now. Empty
  // until the price route answers; see the note in lib/tiers.ts about
  // the USD ladder needing new Stripe prices before any of these
  // become true.
  const [plans, setPlans] = useState<Record<string, boolean>>({});

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
        // The amount itself is no longer rendered — each tier card shows
        // its own figure. What is still needed is the signal: this route
        // and Checkout share a key, so a price that can't be read
        // guarantees a click that fails. `plans` then narrows that from
        // "billing works" to "this specific plan is sellable".
        setPlans(data.plans ?? {});
        setPriceState("ready");
      })
      .catch(() => setPriceState("unavailable"));
  }, []);

  async function startCheckout(tier: TierId, interval: Interval) {
    if (!user) return;
    setError(null);
    setStarting(true);
    capture("upgrade_clicked", { source: "premium_page", tier, interval });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
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

  return (
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <header className="canvas flex flex-wrap items-center justify-between gap-y-2 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <Link href="/browse" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
          Back to browse
        </Link>
      </header>

      <section className="canvas flex-1 pb-20">
        {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}

        {!loading && !user && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Sign in first</h1>
            <p className="max-w-md text-[var(--muted)]">
              You&apos;ll need an account before you can subscribe.
            </p>
            <Link
              href="/sign-up"
              className="btn-gold px-8 py-3.5 text-sm"
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
            <p className="max-w-md text-[var(--muted)]">
              You&apos;ll be able to subscribe once your profile is set up.
            </p>
            <Link
              href="/sign-up"
              className="btn-gold px-8 py-3.5 text-sm"
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
            <p className="max-w-md text-[var(--muted)]">
              You have {PAID_DAILY_LIKE_LIMIT} likes a day. Manage or cancel your subscription from
              Settings.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="btn-gold px-8 py-3.5 text-sm"
              >
                Back to browse
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-[var(--rule)] px-8 py-3.5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
              >
                Settings
              </Link>
            </div>
          </div>
        )}

        {!loading && user && profile && profile.subscriptionStatus !== "active" && (
          <div className="flex flex-col items-start gap-8 pt-8">
            {/* No mascot on the upgrade screen. It genuinely reads as a
                warmer page with her on it, and it is still the wrong
                call: this is the exact surface where a mature Western
                subscriber decides whether the registry behind the paywall
                is real, and the audit is explicit that a 3D character
                there primes him to suspect it is not. Photography and
                verification language carry the warmth instead. */}
            <div className="flex items-center gap-5">
              <div className="flex flex-col gap-2">
                <h1 className="display text-3xl">More likes, every day</h1>
                <p className="max-w-md text-[var(--muted)]">
                  The free plan gives you {FREE_DAILY_LIKE_LIMIT} likes a day. If you&apos;re meeting
                  people you actually want to talk to, that runs out fast.
                </p>
              </div>
            </div>

            {/* The ladder. Only tiers marked visible in lib/tiers appear,
                and only their built benefits are listed — anything in a
                tier's `pending` array is deliberately not rendered,
                because a plan page that advertises a feature which does
                not exist is the fastest route to a chargeback in a
                product whose whole pitch is that it is the honest one. */}
            <div className="grid w-full gap-4 sm:grid-cols-3">
              {TIERS.filter((t) => t.visible).map((t) => {
                const [primary, ...alternates] = t.prices;
                return (
                  <div
                    key={t.id}
                    className={`flex flex-col p-5 ${t.featured ? "card-gold" : "card"}`}
                  >
                    {t.featured && (
                      <span className="label mb-2 w-fit rounded-full bg-[color-mix(in_srgb,var(--gold)_25%,transparent)] px-2.5 py-1 text-[var(--gold-deep)]">
                        Most chosen
                      </span>
                    )}
                    <p className="display text-xl">{t.name}</p>
                    <p className="display mt-1 text-2xl">
                      {primary ? primary.display : "$0"}
                      <span className="text-sm text-[var(--muted)]">
                        {" "}
                        {primary ? INTERVAL_LABEL[primary.interval] : "to join"}
                      </span>
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t.tagline}</p>
                    <ul className="mt-4 flex flex-1 flex-col gap-2">
                      {t.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                          <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--gold)]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {primary && (
                      <div className="mt-5 flex flex-col gap-2">
                        <button
                          onClick={() => startCheckout(t.id, primary.interval)}
                          disabled={
                            starting ||
                            priceState !== "ready" ||
                            !plans[`${t.id}:${primary.interval}`]
                          }
                          className={`w-full px-4 py-2.5 text-sm disabled:opacity-50 ${
                            t.featured ? "btn-gold" : "btn-quiet"
                          }`}
                        >
                          {starting
                            ? "Starting…"
                            : priceState === "ready" && !plans[`${t.id}:${primary.interval}`]
                              ? "Opening soon"
                              : `Choose ${t.name}`}
                        </button>
                        {/* The discounted longer term, offered upfront
                            rather than as a save-offer at cancellation.
                            The audit's reasoning: this audience churns
                            in 30–45 days once they meet someone or fly
                            home, so the quarterly and annual passes are
                            where the cash actually is — and roughly 40%
                            of payers take one when it is visible at the
                            moment of decision. */}
                        {alternates.map((alt) => (
                          <button
                            key={alt.interval}
                            onClick={() => startCheckout(t.id, alt.interval)}
                            disabled={
                              starting ||
                              priceState !== "ready" ||
                              !plans[`${t.id}:${alt.interval}`]
                            }
                            className="w-full text-xs text-[var(--muted)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)] disabled:no-underline disabled:opacity-50"
                          >
                            or {alt.display} {INTERVAL_LABEL[alt.interval]}
                            {alt.note && (
                              <span className="text-[var(--gold-deep)]"> · {alt.note}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* The single-plan card that used to live here is gone: with
                the ladder above it, the page offered two different
                purchase UIs for the same subscription, and a checkout
                screen that asks the same question twice is a checkout
                screen people leave. What it did that the grid does not —
                refuse to show a buy button when Stripe can't be reached —
                is preserved below, because the price route and Checkout
                use the same key and price id, so an unreadable price
                guarantees a failed click. */}
            {priceState === "unavailable" && (
              <p className="w-full rounded-2xl border border-[var(--rule)] p-5 text-sm text-[var(--muted)]">
                Subscriptions are temporarily unavailable. Nothing has been charged — please try
                again shortly.
              </p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <p className="text-xs text-[var(--muted)]">
              Secure payment through Stripe. Your card details never touch {BRAND_CONFIG.appTitle}.
            </p>

            <p className="text-xs text-[var(--muted)]">
              Subscriptions renew automatically until cancelled. Cancel any time from{" "}
              <Link href="/settings" className="underline hover:text-[var(--foreground)]">
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

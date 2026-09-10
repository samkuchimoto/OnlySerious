"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EmptyState } from "@/components/EmptyState";
import { BrowseGrid, QuickLook } from "@/components/BrowseGrid";
import { CountryHub } from "@/components/CountryHub";
import { LiveLounge } from "@/components/LiveLounge";
import { getActivityStatus, isNewMember } from "@/lib/activity";
import { countLive, partitionByFreshness } from "@/lib/discovery";
import { isInMarket, MARKET_TABS, type MarketId } from "@/lib/markets";
import { withRetry } from "@/lib/retry";
import {
  FREE_DAILY_LIKE_LIMIT,
  PAID_DAILY_LIKE_LIMIT,
  calculateAge,
  intentLabel,
  type UserProfile,
} from "@/lib/types";
import { capture } from "@/lib/analytics";
import { AppNav } from "@/components/AppNav";
import { BRAND_CONFIG } from "@/config/brand";

// Mirrors app/api/likes/route.ts's own todayKey() so the header can show
// a real count on first paint instead of "nothing until you spend a
// like". Display only — the server stays authoritative and returns the
// true `remaining` on every like, which overwrites whatever this seeded.
function likesRemainingFor(profile: UserProfile): number {
  const today = new Date().toISOString().slice(0, 10);
  const used = profile.dailyLikesDate === today ? (profile.dailyLikesUsed ?? 0) : 0;
  const limit = profile.subscriptionStatus === "active" ? PAID_DAILY_LIKE_LIMIT : FREE_DAILY_LIKE_LIMIT;
  return Math.max(0, limit - used);
}

type LikeStatus = "idle" | "sending" | "liked" | "matched" | "limit-reached" | "error";

// ---------------------------------------------------------------------
// Persisted browse view. Read through useSyncExternalStore rather than a
// useState seeded inside an effect: the server snapshot is the default,
// so SSR and hydration agree, and there is no setState-in-effect for the
// React Compiler to reject (it already rejected that twice on this page).
//
// The default is the grid, and the audit is explicit that it must be:
// "The default experience must be the Luxury Grid View." Someone who
// prefers to read gets a one-tap switch to the Editorial Narrative view
// that then sticks.
// ---------------------------------------------------------------------

type BrowseView = "grid" | "editorial";
const VIEW_KEY = "browse-view";
let viewListeners: Array<() => void> = [];

function subscribeView(cb: () => void) {
  viewListeners.push(cb);
  return () => {
    viewListeners = viewListeners.filter((l) => l !== cb);
  };
}

function readView(): BrowseView {
  try {
    // "curated" was this value's name before the audit renamed the mode
    // to Editorial Narrative. Mapped rather than dropped so anyone who
    // had chosen it keeps their choice instead of being silently
    // reset to the grid.
    const stored = localStorage.getItem(VIEW_KEY);
    return stored === "editorial" || stored === "curated" ? "editorial" : "grid";
  } catch {
    // Private windows and blocked site data throw on access rather than
    // returning null — a preference is not worth a crashed page.
    return "grid";
  }
}

function writeView(next: BrowseView) {
  try {
    localStorage.setItem(VIEW_KEY, next);
  } catch {
    /* preference simply doesn't persist */
  }
  viewListeners.forEach((l) => l());
}

export default function Browse() {
  const [user, setUser] = useState<User | null>(null);
  const [ownProfile, setOwnProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [likeStatus, setLikeStatus] = useState<Record<string, LikeStatus>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [market, setMarket] = useState<MarketId>("all");
  const [showDeepCatalog, setShowDeepCatalog] = useState(false);

  // The ?subscribed=1 flag Stripe Checkout sends us back with. Read as
  // external browser state rather than copied into a useState inside an
  // effect (which cascades an extra render) or read via useSearchParams
  // (which would push this whole page under a Suspense boundary for one
  // boolean). The server snapshot is false, so SSR and hydration agree.
  const justSubscribed = useSyncExternalStore(
    // Never changes for the life of the page — nothing to subscribe to.
    () => () => {},
    () => new URLSearchParams(window.location.search).get("subscribed") === "1",
    () => false,
  );

  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as BrowseView);
  // Which profile the quick-look is showing. Null means closed.
  const [quickLook, setQuickLook] = useState<UserProfile | null>(null);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }

      setLoadError(false);
      try {
        await withRetry(async () => {
        const ownSnap = await getDoc(doc(db, "users", nextUser.uid));
        const own = ownSnap.exists() ? (ownSnap.data() as UserProfile) : null;
        setOwnProfile(own);
        // Seed the counter before any like is sent — otherwise someone
        // arriving with 0 left sees a normal-looking page and only finds
        // out by clicking Like and getting a dead grey button.
        if (own) setRemaining(likesRemainingFor(own));

        // Real "last active" signal, not a live presence system — see
        // lib/activity.ts. Fire-and-forget: this page's own render doesn't
        // depend on it succeeding.
        if (own) updateDoc(doc(db, "users", nextUser.uid), { lastActiveAt: new Date().toISOString() }).catch(() => {});

        // Both directions for blocks: people I've blocked, and people who've
        // blocked me — neither should see the other in browse. Hides are
        // one-directional by design (see lib/types.ts's Hide comment) — only
        // the hider's own results are filtered. Already-liked profiles are
        // excluded too, so a reload doesn't re-show someone as freshly
        // likeable (see app/api/likes' deterministic-id fix for the data
        // side of the same bug).
        const [blockedByMe, blockedMe, hiddenByMe, likedByMe] = await Promise.all([
          getDocs(query(collection(db, "blocks"), where("blockerId", "==", nextUser.uid))),
          getDocs(query(collection(db, "blocks"), where("blockedId", "==", nextUser.uid))),
          getDocs(query(collection(db, "hides"), where("hiderId", "==", nextUser.uid))),
          getDocs(query(collection(db, "likes"), where("likerId", "==", nextUser.uid))),
        ]);
        const excludedIds = new Set([
          ...blockedByMe.docs.map((d) => d.data().blockedId as string),
          ...blockedMe.docs.map((d) => d.data().blockerId as string),
          ...hiddenByMe.docs.map((d) => d.data().hiddenId as string),
          ...likedByMe.docs.map((d) => d.data().likedId as string),
        ]);

        const activeSnap = await getDocs(query(collection(db, "users"), where("status", "==", "active")));
        const active = activeSnap.docs
          .map((d) => d.data() as UserProfile)
          .filter((p) => p.id !== nextUser.uid)
          .filter((p) => !p.paused)
          .filter((p) => !excludedIds.has(p.id))
          .filter((p) => !own?.interestedIn?.length || own.interestedIn.includes(p.gender));

        setProfiles(active);
        });
      } catch (err) {
        // withRetry already tried this DEFAULT_ATTEMPTS times with
        // backoff — reaching here means it didn't recover, not just a
        // one-off blip. Without this catch, that would still leave the
        // page stuck on "Loading…" forever (setLoading(false) below never
        // runs) with no way out short of knowing to hard-refresh.
        console.error("browse load failed:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // Per-hub counts, over the whole loaded feed rather than the filtered
  // view — a tab has to be able to say how many people it holds while
  // you are standing in a different tab.
  const counts = useMemo(() => {
    const out = {} as Record<MarketId, number>;
    for (const tab of MARKET_TABS) {
      out[tab.id] = profiles.filter((p) => isInMarket(p.country, tab.id)).length;
    }
    return out;
  }, [profiles]);

  // The audit's recency decay, applied after the hub filter: freshest
  // first, and anyone unseen for more than 72 hours moved out of the
  // primary feed into the deep catalog below it.
  const { primary, deepCatalog, live } = useMemo(() => {
    const inMarket = profiles.filter((p) => isInMarket(p.country, market));
    const split = partitionByFreshness(inMarket);
    return { ...split, live: countLive(inMarket) };
  }, [profiles, market]);

  // Plain like — no per-prompt targeting or comment (ThaiFriendly's
  // model, per direct feedback: simpler than Hinge's "like a specific
  // card + optional reply" mechanic).
  async function handleLike(profile: UserProfile) {
    if (!user) return;
    setLikeStatus((prev) => ({ ...prev, [profile.id]: "sending" }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ likedUserId: profile.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setLikeStatus((prev) => ({ ...prev, [profile.id]: "limit-reached" }));
        setRemaining(0);
        // The moment the paywall is actually felt. Its ratio against
        // upgrade_clicked is the conversion rate of the whole paid tier.
        capture("daily_limit_reached");
        return;
      }
      if (!res.ok) {
        setLikeStatus((prev) => ({ ...prev, [profile.id]: "error" }));
        return;
      }
      setLikeStatus((prev) => ({ ...prev, [profile.id]: body.matched ? "matched" : "liked" }));
      capture("like_sent", { matched: Boolean(body.matched) });
      if (body.matched) capture("match_made");
      setRemaining(typeof body.remaining === "number" ? body.remaining : null);
    } catch {
      setLikeStatus((prev) => ({ ...prev, [profile.id]: "error" }));
    }
  }

  // One-tap, no confirmation — a deliberately lighter alternative to
  // Block (see lib/types.ts's Hide comment) available right from the
  // feed, not just the profile-detail menu.
  async function handleHide(profileId: string) {
    if (!user) return;
    await setDoc(doc(db, "hides", `${user.uid}_${profileId}`), {
      id: `${user.uid}_${profileId}`,
      hiderId: user.uid,
      hiddenId: profileId,
      createdAt: new Date().toISOString(),
    });
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  return (
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <AppNav meta={remaining !== null ? <span>{remaining} likes left today</span> : null} />

      <section className="canvas flex-1 pb-20">
        {loading && <p className="pt-8 text-sm text-[var(--muted)]">Loading…</p>}

        {!loading && !user && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="display text-3xl">Sign in to browse</h1>
            <Link href="/sign-up" className="btn-gold px-8 py-3.5 text-sm">
              Get started
            </Link>
          </div>
        )}

        {!loading && user && loadError && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="display text-3xl">Couldn&apos;t load Browse</h1>
            <p className="max-w-md text-[var(--muted)]">Something went wrong loading profiles. Please try again.</p>
            <button onClick={() => window.location.reload()} className="btn-gold px-8 py-3.5 text-sm">
              Retry
            </button>
          </div>
        )}

        {!loading && user && !loadError && !ownProfile && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="display text-3xl">Finish your profile first</h1>
            <Link href="/sign-up" className="btn-gold px-8 py-3.5 text-sm">
              Create your profile
            </Link>
          </div>
        )}

        {!loading && user && !loadError && ownProfile && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-8">
              <h1 className="display text-3xl">Browse</h1>

              {/* The mode switch. Labelled by what you get rather than by
                  an icon: a grid glyph and a list glyph are the same
                  affordance to someone who has never seen this pattern,
                  and half this audience is on their first dating app. */}
              <div
                role="group"
                aria-label="View"
                className="flex items-center gap-1 rounded-full border border-[var(--rule)] p-1"
              >
                {([
                  ["grid", "Grid"],
                  ["editorial", "Editorial"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => writeView(value)}
                    className={`label rounded-full px-3.5 py-1.5 transition-colors ${
                      view === value
                        ? "bg-[var(--teak)] text-[var(--cream)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <CountryHub value={market} counts={counts} onChange={setMarket} />
            <LiveLounge count={live} market={market} />

            {/* The conversion moment. Browsing itself stays unlimited (a
                cap on visibility would just advertise how small the pool
                is); what's limited is the action. Shown once, at the top,
                so it reads as a state of the account rather than a dead
                button discovered per-card. */}
            {remaining === 0 && ownProfile.subscriptionStatus !== "active" && (
              <div className="card-gold mt-6 p-5">
                <p className="text-base font-medium">
                  You&apos;ve used all {FREE_DAILY_LIKE_LIMIT} likes for today
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Your likes reset tomorrow. Or get {PAID_DAILY_LIKE_LIMIT} likes a day — keep going now
                  instead of waiting.
                </p>
                {/* Goes to the checkout page rather than straight into
                    Stripe: someone who hasn't decided yet needs to see the
                    price and what they get before being sent to a payment
                    form. The page also reads the live price from Stripe,
                    which this banner deliberately doesn't state. */}
                <Link
                  href="/premium"
                  onClick={() => capture("upgrade_clicked", { source: "browse_limit_banner" })}
                  className="mt-4 inline-block w-fit btn-gold px-6 py-2.5 text-sm"
                >
                  Get more likes
                </Link>
                <p className="mt-3 text-xs text-[var(--muted)]">Cancel any time from Settings.</p>
              </div>
            )}

            {/* Returning from Checkout. This used to render ONLY while
                the webhook was still catching up, so a fast webhook — the
                normal case — meant paying and being dropped back onto an
                ordinary Browse page with nothing acknowledging it at all.
                Now it always confirms, and only the wording depends on
                whether the unlock has landed yet. */}
            {justSubscribed && (
              <div className="mt-6 rounded-[var(--radius)] bg-[var(--teak)] p-6 text-[var(--cream)]">
                {ownProfile.subscriptionStatus === "active" ? (
                  <>
                    <p className="display text-xl">Welcome to {BRAND_CONFIG.premiumName}</p>
                    <p className="mt-1 text-sm text-[var(--cream)]/70">
                      You&apos;re all set. Here&apos;s what changed:
                    </p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {[
                        `${PAID_DAILY_LIKE_LIMIT} likes a day, up from ${FREE_DAILY_LIKE_LIMIT}`,
                        "Message without waiting between messages",
                        "See everyone who liked you",
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--cream)]/85">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href="/liked-me" className="btn-gold px-5 py-2.5 text-sm">
                        See who liked you
                      </Link>
                      <Link
                        href="/settings"
                        className="rounded-full border border-[var(--cream)]/40 px-5 py-2.5 text-sm font-medium text-[var(--cream)]/85 transition-colors hover:border-[var(--cream)] hover:text-[var(--cream)]"
                      >
                        Manage subscription
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="display text-xl">Payment received — thank you</p>
                    <p className="mt-1 text-sm text-[var(--cream)]/70">
                      Your {BRAND_CONFIG.premiumName} benefits are switching on now. Refresh in a few
                      seconds if they aren&apos;t there yet.
                    </p>
                  </>
                )}
              </div>
            )}

            {primary.length === 0 && deepCatalog.length === 0 ? (
              <EmptyState
                title="No one here yet"
                body={
                  market === "all"
                    ? "No one matching your preferences has an active profile right now. Widening your age or distance range usually helps — new members join every day."
                    : "Nobody in this country matches your preferences yet. Try the All tab, or check back — this is a launch market and it fills quickly."
                }
                action={
                  market !== "all" ? (
                    <button type="button" onClick={() => setMarket("all")} className="btn-quiet px-6 py-2.5 text-sm">
                      Show everyone
                    </button>
                  ) : null
                }
              />
            ) : view === "grid" ? (
              <>
                <BrowseGrid
                  profiles={primary}
                  likeStatus={likeStatus}
                  onSelect={setQuickLook}
                  onLike={handleLike}
                />
                <QuickLook
                  profile={quickLook}
                  status={quickLook ? (likeStatus[quickLook.id] ?? "idle") : "idle"}
                  onLike={handleLike}
                  onClose={() => setQuickLook(null)}
                />
              </>
            ) : (
              /* Editorial Narrative view. A single column at a reading
                 measure inside the 1280 canvas — the audit asks for "an
                 expanded single-column format reminiscent of a high-end
                 publication", which a 1280px-wide column is not. */
              <div className="measure mt-8 flex flex-col gap-12">
                {primary.map((profile) => {
                  const status = likeStatus[profile.id] ?? "idle";
                  const photo = profile.photos[0];
                  const isDone = status === "liked" || status === "matched" || status === "limit-reached";
                  const activity = getActivityStatus(profile.lastActiveAt);
                  const isNew = isNewMember(profile.createdAt);
                  return (
                    <article key={profile.id} className="flex flex-col gap-3">
                      <Link
                        href={`/profile/${profile.id}`}
                        className={`relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius)] bg-[var(--rule)] ${
                          profile.selfieVerified ? "glimmer" : ""
                        }`}
                      >
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover object-top" />
                        )}
                        {isNew && (
                          <span className="label absolute bottom-3 right-3 rounded bg-[var(--gold)] px-2 py-0.5 text-[0.55rem] text-[var(--teak)]">
                            New
                          </span>
                        )}
                      </Link>
                      <Link href={`/profile/${profile.id}`} className="flex flex-wrap items-center gap-2 text-lg font-medium">
                        {activity?.isOnline && (
                          <span className="dot-online dot-online-pulse h-2 w-2 shrink-0" aria-hidden />
                        )}
                        {profile.displayName}, {calculateAge(profile.birthdate)}
                        <span className="text-sm font-normal text-[var(--muted)]">{profile.city}</span>
                        <VerifiedBadge approvedPhotoCount={profile.photos.length} selfieVerified={profile.selfieVerified} />
                      </Link>
                      {activity && !activity.isOnline && <p className="-mt-2 text-xs text-[var(--muted)]">{activity.label}</p>}

                      {/* Intent Banner. The one fact that separates this
                          product from the grid it competes with, so it
                          sits above the headline rather than below the
                          fold on a profile page nobody opened. */}
                      {intentLabel(profile.relationshipIntent) && (
                        <p className="label w-fit rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] px-3 py-1.5 text-[var(--gold-deep)]">
                          {intentLabel(profile.relationshipIntent)}
                        </p>
                      )}

                      {profile.headline && <p className="text-base font-medium">{profile.headline}</p>}
                      {/* Clamped, not cut: a 500-char bio would otherwise
                          push the next card off-screen and make the feed
                          scroll unevenly. line-clamp ends with a real
                          ellipsis, so a trailing "…" reads as "there's more
                          on the profile" rather than as broken text. */}
                      {profile.bio && <p className="line-clamp-3 text-sm text-[var(--muted)]">{profile.bio}</p>}

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(profile)}
                          disabled={status === "sending" || isDone}
                          className={`w-fit px-6 py-2.5 text-sm disabled:cursor-default ${
                            isDone ? "btn-quiet text-[var(--muted)]" : "btn-gold"
                          }`}
                        >
                          {status === "matched"
                            ? "It's a match!"
                            : status === "liked"
                              ? "Liked"
                              : status === "limit-reached"
                                ? "Daily limit reached"
                                : status === "error"
                                  ? "Try again"
                                  : status === "sending"
                                    ? "…"
                                    : "Like"}
                        </button>
                        {!isDone && (
                          <button
                            onClick={() => handleHide(profile.id)}
                            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                          >
                            Not interested
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* The deep catalog.

                The audit requires profiles unseen for >72h to leave the
                primary feed. They are folded here rather than deleted:
                at current registry size a hard cut would empty the grid,
                and an empty grid is a louder "this platform is dead"
                signal than a stale profile is. See lib/discovery.ts. */}
            {deepCatalog.length > 0 && (
              <div className="mt-12 border-t border-[var(--rule)] pt-6">
                <button
                  type="button"
                  onClick={() => setShowDeepCatalog((v) => !v)}
                  aria-expanded={showDeepCatalog}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span>
                    <span className="display text-lg">Deep catalog</span>
                    <span className="ml-2 text-sm text-[var(--muted)]">
                      {deepCatalog.length} {deepCatalog.length === 1 ? "member" : "members"} not seen in
                      the last three days
                    </span>
                  </span>
                  <span aria-hidden className="text-sm text-[var(--muted)]">
                    {showDeepCatalog ? "Hide" : "Show"}
                  </span>
                </button>
                {showDeepCatalog && (
                  <BrowseGrid
                    profiles={deepCatalog}
                    likeStatus={likeStatus}
                    onSelect={setQuickLook}
                    onLike={handleLike}
                  />
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

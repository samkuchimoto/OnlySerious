"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MascotEmptyState } from "@/components/Mascot";
import { BrowseGrid, QuickLook } from "@/components/BrowseGrid";
import { getActivityStatus, isNewMember } from "@/lib/activity";
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

// Decorative only — reflects who the viewer said they're interested in,
// never tied to any real or fake profile. "Other"/unset falls back to
// no banner rather than guessing.
function heroImageFor(interestedIn: string[] | undefined): string | null {
  if (!interestedIn?.length) return null;
  if (interestedIn.includes("woman")) return "/images/hero-woman.png";
  if (interestedIn.includes("man")) return "/images/hero-man.png";
  return null;
}

type LikeStatus = "idle" | "sending" | "liked" | "matched" | "limit-reached" | "error";

// ---------------------------------------------------------------------
// Persisted browse view. Read through useSyncExternalStore rather than a
// useState seeded inside an effect: the server snapshot is the default,
// so SSR and hydration agree, and there is no setState-in-effect for the
// React Compiler to reject (it already rejected that twice on this page).
//
// Default is now the editorial view. A three-column thumbnail grid is
// the layout of a product catalogue, and on a page of people it frames
// them as inventory — which is exactly the register a serious
// matchmaking service cannot afford. The grid remains one tap away for
// the power-searcher who genuinely wants forty profiles a minute, and
// the choice sticks.
// ---------------------------------------------------------------------

type BrowseView = "grid" | "curated";
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
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "curated";
  } catch {
    // Private windows and blocked site data throw on access rather than
    // returning null — a preference is not worth a crashed page.
    return "curated";
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

  const view = useSyncExternalStore(subscribeView, readView, () => "curated" as BrowseView);
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
  // grid, not just the profile-detail menu.
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
      {/* The counter is shown only when it is nearly spent. A running
          "100 likes left today" is an arcade score: it frames the whole
          page as a budget being drawn down and makes a serious product
          feel transactional. It becomes useful information exactly once —
          when running out is imminent — and that is the only time it
          appears now. The server stays authoritative either way. */}
      <AppNav
        meta={
          remaining !== null && remaining <= 5 ? (
            <span>{remaining === 0 ? "No likes left today" : `${remaining} likes left today`}</span>
          ) : null
        }
      />

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}

        {!loading && !user && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Sign in to browse</h1>
            <Link
              href="/sign-up"
              className="btn-gold px-8 py-3.5 text-sm"
            >
              Get started
            </Link>
          </div>
        )}

        {!loading && user && loadError && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Couldn&apos;t load Browse</h1>
            <p className="max-w-md text-[var(--muted)]">Something went wrong loading profiles. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-gold px-8 py-3.5 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && user && !loadError && !ownProfile && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Finish your profile first</h1>
            <Link
              href="/sign-up"
              className="btn-gold px-8 py-3.5 text-sm"
            >
              Create your profile
            </Link>
          </div>
        )}

        {!loading && user && !loadError && ownProfile && (
          <>
            {heroImageFor(ownProfile.interestedIn) && (
              <div className="relative mt-8 aspect-[16/7] w-full overflow-hidden rounded-2xl">
                <Image src={heroImageFor(ownProfile.interestedIn) as string} alt="" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <p className="absolute bottom-4 left-5 text-lg font-medium text-white">Someone serious is out there.</p>
              </div>
            )}
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
                  ["curated", "Detailed"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => writeView(value)}
                    className={`label rounded-full px-3.5 py-1.5 transition-colors ${
                      view === value
                        ? "bg-[var(--foreground)] text-white"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* The conversion moment. Browsing itself stays unlimited (a
                cap on visibility would just advertise how small the pool
                is); what's limited is the action. Shown once, at the top,
                so it reads as a state of the account rather than a dead
                button discovered per-card. */}
            {remaining === 0 && ownProfile.subscriptionStatus !== "active" && (
              <div className="mt-6 rounded-2xl border border-[var(--rule)] bg-[color-mix(in_srgb,var(--gold)_7%,var(--background))] p-5">
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
                normal case — meant paying $10 and being dropped back onto
                an ordinary Browse page with nothing acknowledging it at
                all. Now it always confirms, and only the wording depends
                on whether the unlock has landed yet. */}
            {justSubscribed && (
              <div className="mt-6 rounded-2xl border border-[var(--foreground)] bg-[var(--foreground)] p-6 text-white">
                {ownProfile.subscriptionStatus === "active" ? (
                  <>
                    <p className="text-xl font-medium tracking-tight">
                      Welcome to {BRAND_CONFIG.premiumName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      You&apos;re all set. Here&apos;s what changed:
                    </p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {[
                        `${PAID_DAILY_LIKE_LIMIT} likes a day, up from ${FREE_DAILY_LIKE_LIMIT}`,
                        "Message without waiting between messages",
                        "See everyone who liked you",
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--rule)]">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/liked-me"
                        className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-transform hover:scale-[1.02]"
                      >
                        See who liked you
                      </Link>
                      <Link
                        href="/settings"
                        className="rounded-full border border-[var(--muted)] px-5 py-2.5 text-sm font-medium text-[var(--rule)] transition-colors hover:border-white hover:text-white"
                      >
                        Manage subscription
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-medium tracking-tight">Payment received — thank you</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Your {BRAND_CONFIG.premiumName} benefits are switching on now. Refresh in a few
                      seconds if they aren&apos;t there yet.
                    </p>
                  </>
                )}
              </div>
            )}
            {profiles.length === 0 ? (
              // An empty grid is the single most discouraging screen in a
              // dating app — it reads as "nobody is here" when the truth
              // is usually "your filters are narrow". Amara plus a reason
              // turns a dead end into a next step.
              <MascotEmptyState
                pose="sitting"
                title="No one here yet"
                body="No one matching your preferences has an active profile right now. Widening your age or distance range usually helps — new members join every day."
              />
            ) : view === "grid" ? (
              <>
                <BrowseGrid profiles={profiles} likeStatus={likeStatus} onSelect={setQuickLook} />
                <QuickLook
                  profile={quickLook}
                  status={quickLook ? (likeStatus[quickLook.id] ?? "idle") : "idle"}
                  onLike={handleLike}
                  onClose={() => setQuickLook(null)}
                />
              </>
            ) : (
              <div className="mt-8 flex flex-col gap-10">
                {profiles.map((profile) => {
                  const status = likeStatus[profile.id] ?? "idle";
                  const photo = profile.photos[0];
                  const isDone = status === "liked" || status === "matched" || status === "limit-reached";
                  const activity = getActivityStatus(profile.lastActiveAt);
                  const isNew = isNewMember(profile.createdAt);
                  return (
                    <article key={profile.id} className="flex flex-col gap-3">
                      <Link
                        href={`/profile/${profile.id}`}
                        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[var(--rule)]"
                      >
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                        )}
                        {/* A typographic tag rather than a sticker. The
                            bright blue NEW pill was the loudest thing on
                            a page of faces, and it made a person look
                            like stock. */}
                        {isNew && (
                          <span className="label absolute bottom-3 right-3 text-[0.6rem] text-white drop-shadow-[0_1px_3px_rgba(31,22,16,0.9)]">
                            · Recently joined
                          </span>
                        )}
                      </Link>
                      <Link href={`/profile/${profile.id}`} className="flex flex-wrap items-center gap-2 text-lg font-medium">
                        {activity?.isOnline && <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden />}
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
                        <p className="label w-fit rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] px-3 py-1.5">
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
                          className={`w-fit rounded-full border px-6 py-2.5 text-sm font-medium transition-colors disabled:cursor-default ${
                            status === "matched"
                              ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                              : status === "liked"
                                ? "border-[var(--rule)] text-[var(--muted)]"
                                : status === "limit-reached"
                                  ? "border-[var(--rule)] text-[var(--muted)]"
                                  : "border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white"
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
          </>
        )}
      </section>
    </main>
  );
}

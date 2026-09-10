// /components/BrowseGrid.tsx
//
// The Luxury Grid — the audit's default discovery view.
//
// "The default experience must be the Luxury Grid View. Optimized for
// high-throughput scanning, this view renders profiles in a dense,
// three-to-four-column matrix on desktop and a dual-column display on
// mobile devices. Each profile card is framed in rounded teak-bordered
// white space, showcasing the candidate's face-centered 4:5 portrait,
// verified age, primary city, real-time activity indicator, and an
// intent badge... Direct-engagement affordances — such as a single-tap
// chat prompt or an antique-gold heart reaction — are directly
// accessible on the card face."
//
// Every clause of that is implemented below. Two of them changed what
// was already here, and both changes are the point of the rewrite:
//
//   3-across → 2-across on mobile. Three columns on a 360px phone gives
//   each face about 105px. The audit's central complaint is that faces
//   are the product and the product was being cropped and shrunk out of
//   legibility; a denser grid that makes people unrecognisable is
//   throughput without discovery.
//
//   3:4 → 4:5 portraits, framed from the top. The audit calls severed
//   headspace a credibility failure, and `object-cover` centred on a
//   portrait photograph crops the head first, every time. Framing from
//   the top instead means the crop takes the hem rather than the eyes.
//   See PhotoUploader for the upload-side half of this fix.

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getActivityStatus, isNewMember } from "@/lib/activity";
import { freshnessOf } from "@/lib/discovery";
import { calculateAge, intentBadge, intentLabel, type UserProfile } from "@/lib/types";

export type LikeStatus = "idle" | "sending" | "liked" | "matched" | "limit-reached" | "error";

function likeButtonLabel(status: LikeStatus): string {
  if (status === "sending") return "…";
  if (status === "matched") return "It's a match";
  if (status === "liked") return "Liked";
  if (status === "limit-reached") return "No likes left today";
  if (status === "error") return "Try again";
  return "Like";
}

/**
 * The face-centred 4:5 frame, shared by the grid tile and the
 * quick-look so a face can never be framed one way in the grid and
 * another way when opened.
 *
 * `object-top` is the whole fix. A portrait photograph in a 4:5 box
 * with the default centre origin loses the top of the head; anchored to
 * the top it loses the bottom of the frame, which on a portrait is
 * almost always waist and background.
 */
function Portrait({
  profile,
  className = "",
  eager = false,
}: {
  profile: UserProfile;
  className?: string;
  eager?: boolean;
}) {
  const photo = profile.photos[0];
  return (
    <div className={`relative aspect-[4/5] w-full overflow-hidden bg-[var(--rule)] ${className}`}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}
    </div>
  );
}

export function BrowseGrid({
  profiles,
  likeStatus,
  onSelect,
  onLike,
}: {
  profiles: UserProfile[];
  likeStatus: Record<string, LikeStatus>;
  onSelect: (profile: UserProfile) => void;
  onLike: (profile: UserProfile) => void;
}) {
  return (
    // 2 / 3 / 4. The audit's "dual-column display on mobile" and
    // "three-to-four-column matrix on desktop", with the three-column
    // step at tablet width so the jump is not 2→4.
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {profiles.map((profile, i) => {
        const activity = getActivityStatus(profile.lastActiveAt);
        const status = likeStatus[profile.id] ?? "idle";
        const liked = status === "liked" || status === "matched";
        const badge = intentBadge(profile.relationshipIntent);
        const isLive = freshnessOf(profile) === "live";
        const verified = Boolean(profile.selfieVerified);

        return (
          <li key={profile.id}>
            {/* Teak-bordered white space, per the brief — the card is a
                frame around the photograph rather than a tint over it. */}
            <div className="lift group card overflow-hidden">
              <button
                type="button"
                onClick={() => onSelect(profile)}
                aria-label={`${profile.displayName}, ${calculateAge(profile.birthdate)}, ${profile.city}`}
                className="relative block w-full text-left"
              >
                {/* The Golden Glimmer wraps the frame, never the image,
                    so a verified profile glows without its face being
                    dimmed by an overlay. */}
                <div className={verified || isLive ? "glimmer" : undefined}>
                  {/* The first row is above the fold on every viewport;
                      lazy-loading it delays the one thing the page
                      exists to show. */}
                  <Portrait profile={profile} eager={i < 4} />
                </div>

                {isNewMember(profile.createdAt) && (
                  <span className="label absolute left-2 top-2 rounded bg-[var(--gold)] px-1.5 py-0.5 text-[0.55rem] text-[var(--teak)]">
                    New
                  </span>
                )}

                {/* Intent badge on the card face. This is the single
                    fact that separates this directory from the one it
                    competes with, so it sits on the tile rather than
                    two taps away on a profile page. */}
                {badge && (
                  <span className="label absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-[color-mix(in_srgb,var(--teak)_82%,transparent)] px-2 py-1 text-[0.5rem] text-[var(--gold)] backdrop-blur-sm">
                    {badge}
                  </span>
                )}
              </button>

              <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {activity?.isOnline && (
                      <span className="dot-online dot-online-pulse h-1.5 w-1.5 shrink-0" aria-hidden />
                    )}
                    <span className="truncate">
                      {profile.displayName}, {calculateAge(profile.birthdate)}
                    </span>
                    <VerifiedBadge
                      approvedPhotoCount={profile.photos.length}
                      selfieVerified={profile.selfieVerified}
                    />
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {profile.city}
                    {activity && !activity.isOnline && ` · ${activity.label}`}
                  </p>
                </div>

                {/* The antique-gold heart. A direct-engagement
                    affordance on the card face, so liking forty people
                    costs forty taps rather than forty page loads —
                    which is the entire throughput argument for a grid.
                    stopPropagation is what keeps it from also opening
                    the quick-look underneath. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike(profile);
                  }}
                  disabled={status === "sending" || liked || status === "limit-reached"}
                  aria-label={liked ? `Liked ${profile.displayName}` : `Like ${profile.displayName}`}
                  aria-pressed={liked}
                  className={`-mr-1 -mt-0.5 shrink-0 rounded-full p-1.5 text-lg leading-none transition-colors disabled:cursor-default ${
                    liked
                      ? "text-[var(--lotus)]"
                      : "text-[var(--rule)] hover:text-[var(--gold)] disabled:opacity-40"
                  }`}
                >
                  <span aria-hidden>{liked ? "♥" : "♡"}</span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The quick-look. Everything needed to decide, without leaving the grid.
 *
 * This is what makes the grid's speed claim real: a full page load per
 * profile caps you at around six a minute no matter how dense the tiles
 * are, so a grid without this is a grid that only looks fast.
 */
export function QuickLook({
  profile,
  status,
  onLike,
  onClose,
}: {
  profile: UserProfile | null;
  status: LikeStatus;
  onLike: (profile: UserProfile) => void;
  onClose: () => void;
}) {
  // Escape closes, and the page behind stops scrolling. Without the
  // scroll lock, dismissing on a phone returns you to a different place
  // in the grid than you left, which loses your position in a list you
  // were moving through quickly.
  useEffect(() => {
    if (!profile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [profile, onClose]);

  if (!profile) return null;

  const activity = getActivityStatus(profile.lastActiveAt);
  const intent = intentLabel(profile.relationshipIntent);
  const isDone = status === "liked" || status === "matched" || status === "limit-reached";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.displayName}, quick look`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--teak)_72%,transparent)] p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        // Stops a click inside the card from reaching the backdrop's
        // close handler — otherwise pressing Like also dismisses.
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm overflow-hidden rounded-b-none sm:rounded-[var(--radius)]"
      >
        <div className="relative">
          <Portrait profile={profile} eager />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--teak)_60%,transparent)] text-lg text-[var(--cream)] backdrop-blur"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {activity?.isOnline && (
              <span className="dot-online dot-online-pulse h-2 w-2 shrink-0" aria-hidden />
            )}
            {profile.displayName}, {calculateAge(profile.birthdate)}
            <VerifiedBadge
              approvedPhotoCount={profile.photos.length}
              selfieVerified={profile.selfieVerified}
            />
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {profile.city}
            {activity && !activity.isOnline && ` · ${activity.label}`}
          </p>

          {intent && (
            <p className="label mt-3 inline-block rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] px-3 py-1.5 text-[var(--gold-deep)]">
              {intent}
            </p>
          )}

          {profile.headline && <p className="mt-3 text-sm font-medium">{profile.headline}</p>}
          {profile.bio && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
              {profile.bio}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onLike(profile)}
              disabled={status === "sending" || isDone}
              className={`flex-1 px-5 py-3 text-sm ${
                isDone ? "btn-quiet text-[var(--muted)]" : "btn-gold"
              }`}
            >
              {likeButtonLabel(status)}
            </button>
            <Link href={`/profile/${profile.id}`} className="btn-quiet px-5 py-3 text-sm">
              Full profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

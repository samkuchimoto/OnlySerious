// /components/BrowseGrid.tsx
//
// "Sanctuary Speed" — the compact grid half of the Dual-Mode Discovery
// Engine, alongside the existing full-height cards ("Sanctuary Curated").
//
// The two modes exist because this marketplace has two populations with
// opposite needs, and every app in the category serves only one of them:
//
//   Grid     — 3 columns on a phone, 4 on desktop. Photo, name, age,
//              city, online dot. Built for the foreign male subscriber
//              who wants to see forty profiles a minute, which is
//              exactly what ThaiFriendly does well and what Hinge's
//              one-card-at-a-time stack makes impossible.
//   Curated  — the taller cards with headline, bio and a like button.
//              Built for the member who wants to actually read someone
//              before deciding, which is what Hinge does well and what
//              a dense grid makes impossible.
//
// Tapping a grid tile opens a quick-look rather than navigating. That is
// what makes the speed claim real: a full page load per profile caps you
// at around six a minute no matter how dense the grid is, so the grid
// without the modal would be a grid that only looks fast.

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getActivityStatus, isNewMember } from "@/lib/activity";
import { calculateAge, intentLabel, type UserProfile } from "@/lib/types";

export type LikeStatus = "idle" | "sending" | "liked" | "matched" | "limit-reached" | "error";

function likeButtonLabel(status: LikeStatus): string {
  if (status === "sending") return "…";
  if (status === "matched") return "It's a match";
  if (status === "liked") return "Liked";
  if (status === "limit-reached") return "No likes left today";
  if (status === "error") return "Try again";
  return "Like";
}

export function BrowseGrid({
  profiles,
  likeStatus,
  onSelect,
}: {
  profiles: UserProfile[];
  likeStatus: Record<string, LikeStatus>;
  onSelect: (profile: UserProfile) => void;
}) {
  return (
    <ul className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4">
      {profiles.map((profile) => {
        const photo = profile.photos[0];
        const activity = getActivityStatus(profile.lastActiveAt);
        const status = likeStatus[profile.id] ?? "idle";
        const liked = status === "liked" || status === "matched";

        return (
          <li key={profile.id}>
            <button
              type="button"
              onClick={() => onSelect(profile)}
              className="lift group block w-full text-left"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius)] bg-[var(--rule)]">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Teak scrim only at the foot, so the name stays legible
                    over a bright photo without dimming the face. */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1c130e]/85 to-transparent p-1.5 pt-6">
                  <p className="flex items-center gap-1 truncate text-[0.8rem] font-semibold text-white">
                    {activity?.isOnline && <span className="dot-online h-1.5 w-1.5 shrink-0" aria-hidden />}
                    <span className="truncate">
                      {profile.displayName}, {calculateAge(profile.birthdate)}
                    </span>
                  </p>
                  <p className="truncate text-[0.65rem] text-white/70">{profile.city}</p>
                </div>

                {/* Understated markers rather than stickers. A filled
                    badge on a tile of faces competes with the face,
                    which is the one thing the tile exists to show. */}
                {isNewMember(profile.createdAt) && (
                  <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--gold)] shadow-[0_0_0_2px_rgba(31,22,16,0.35)]" title="Recently joined" />
                )}
                {liked && (
                  <span className="like absolute right-2 top-2 text-sm drop-shadow-[0_1px_3px_rgba(31,22,16,0.8)]">
                    ♥
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The quick-look. Everything needed to decide, without leaving the grid.
 *
 * Deliberately shows the intent banner: it is the one fact that
 * distinguishes this product, and burying it on the full profile would
 * mean the fast path is also the path where nobody sees it.
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
  // scroll lock, dismissing the modal on a phone returns you to a
  // different place in the grid than you left, which loses your place
  // in a list you were moving through quickly.
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

  const photo = profile.photos[0];
  const activity = getActivityStatus(profile.lastActiveAt);
  const intent = intentLabel(profile.relationshipIntent);
  const isDone = status === "liked" || status === "matched" || status === "limit-reached";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.displayName}, quick look`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c130e]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        // Stops a click inside the card from reaching the backdrop's
        // close handler — otherwise pressing Like also dismisses.
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm overflow-hidden rounded-b-none sm:rounded-[var(--radius)]"
      >
        <div className="relative aspect-[4/5] w-full bg-[var(--rule)]">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#1c130e]/60 text-lg text-white backdrop-blur"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {activity?.isOnline && <span className="dot-online h-2 w-2 shrink-0" aria-hidden />}
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

          {/* The Intent Banner. Brass, because on this product a stated
              goal is the premium signal — not a detail. */}
          {intent && (
            <p className="label mt-3 inline-block rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] px-3 py-1.5">
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
            <Link
              href={`/profile/${profile.id}`}
              className="btn-quiet px-5 py-3 text-sm"
            >
              Full profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

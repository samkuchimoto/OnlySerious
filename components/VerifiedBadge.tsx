import { MIN_PROFILE_PHOTOS } from "@/lib/types";

const CHECK_ICON = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

// Real signals only, styled as pills (ThaiFriendly's "Photo Verified"
// treatment) so they're actually noticed instead of reading as fine
// print. Selfie verification is the stronger claim — a real Groq vision
// face-match (app/api/verify-selfie/route.ts), never client-set — so it
// gets first billing when both are true instead of stacking two pills.
//
// Brass, not blue. The audit reserves Warm Antique Gold specifically for
// "verification badges, VIP highlights", and this badge is the single
// most important visual in the product — it is the whole reason a woman
// trusts the grid and the whole reason a man believes a profile is real.
// A Tailwind default blue-50/blue-700 pill was the one element on the
// card that belonged to no palette at all, and it read as a platform
// chrome affordance rather than as a seal the house had granted.
export function VerifiedBadge({
  approvedPhotoCount,
  selfieVerified,
  compact = false,
}: {
  approvedPhotoCount: number;
  selfieVerified?: boolean;
  /** Medallion only, no wording. For the grid tile, where the full pill
   *  is wider than the name beside it: at two columns on a phone it
   *  took the entire row and squeezed "Ploi, 30" out of existence, so
   *  the badge that exists to build trust was deleting the identity it
   *  was vouching for. The title attribute keeps the meaning, and the
   *  full pill still appears wherever there is room for it. */
  compact?: boolean;
}) {
  if (compact) {
    if (!selfieVerified && approvedPhotoCount < MIN_PROFILE_PHOTOS) return null;
    return (
      <span
        title={selfieVerified ? "Selfie verified" : "Photos verified"}
        aria-label={selfieVerified ? "Selfie verified" : "Photos verified"}
        role="img"
        className={`inline-flex shrink-0 items-center justify-center rounded-full ${
          selfieVerified ? "text-[var(--gold-deep)]" : "text-[var(--muted)]"
        }`}
      >
        {CHECK_ICON}
      </span>
    );
  }
  if (selfieVerified) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--gold)_55%,transparent)] bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--gold-deep)]"
        title="Selfie matched against an approved profile photo"
      >
        {CHECK_ICON}
        Selfie verified
      </span>
    );
  }
  if (approvedPhotoCount >= MIN_PROFILE_PHOTOS) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-[var(--rule)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]"
        title="Photos verified"
      >
        {CHECK_ICON}
        Photos verified
      </span>
    );
  }
  return null;
}

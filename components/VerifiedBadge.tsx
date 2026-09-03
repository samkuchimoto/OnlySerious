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
export function VerifiedBadge({
  approvedPhotoCount,
  selfieVerified,
}: {
  approvedPhotoCount: number;
  selfieVerified?: boolean;
}) {
  if (selfieVerified) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
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
        className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
        title="Photos verified"
      >
        {CHECK_ICON}
        Photos verified
      </span>
    );
  }
  return null;
}

import { MIN_PROFILE_PHOTOS } from "@/lib/types";

// A real signal, not a fabricated one — this reflects the actual number
// of photos that cleared real moderation (lib/moderation.ts), the same
// threshold that gates a profile going live at all.
export function VerifiedBadge({ approvedPhotoCount }: { approvedPhotoCount: number }) {
  if (approvedPhotoCount < MIN_PROFILE_PHOTOS) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500" title="Photos verified">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}

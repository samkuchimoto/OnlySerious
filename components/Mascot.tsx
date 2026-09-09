// /components/Mascot.tsx
//
// Amara — the house mascot.
//
// Named for the Sanskrit-derived Thai อมร (amara, "enduring"), which
// also carries the brand's own root. She is the one element in the
// product that is warm before it is functional, and that is her job:
// every competitor in this market is either a grid of strangers or a
// cold card stack, and the thing a woman decides in the first four
// seconds is whether the app feels like somewhere safe to be seen.
//
// Two rules govern where she appears, because a mascot placed without
// rules becomes clutter and then becomes noise:
//
// 1. She never overlaps another person's photograph. The product is
//    people looking at people; an illustration competing with a real
//    face is the mascot winning an argument it should not be having.
//    So she lives in empty states, page headers and moments of welcome
//    or reassurance — the places where there is nothing else to look at.
//
// 2. She is decorative, so she is `alt=""` and aria-hidden. A screen
//    reader announcing "illustration of a woman in Thai dress" before
//    every empty state is noise, not access. Where she carries meaning,
//    the surrounding copy carries it in text.

import Image from "next/image";

export type MascotPose = "sitting" | "heart";

const POSE_SRC: Record<MascotPose, string> = {
  // Chin-on-hand, seated. Reads as patience and company — the right
  // note for waiting, browsing and empty results.
  sitting: "/mascots/amara-sitting.png",
  // Standing, hands making a heart. Reads as welcome and celebration —
  // for arrivals, matches and upgrades.
  heart: "/mascots/amara-heart.png",
};

const SIZE_PX = {
  sm: 96,
  md: 168,
  lg: 260,
  xl: 380,
} as const;

export function Mascot({
  pose = "sitting",
  size = "md",
  className = "",
  priority = false,
}: {
  pose?: MascotPose;
  size?: keyof typeof SIZE_PX;
  className?: string;
  /** Only for the one above-the-fold instance on the landing page. */
  priority?: boolean;
}) {
  const px = SIZE_PX[size];

  return (
    <Image
      src={POSE_SRC[pose]}
      alt=""
      aria-hidden
      width={px}
      height={px}
      priority={priority}
      // Explicit sizes so Next serves a phone-sized file to a phone.
      // These are decorative and load alongside real photographs, so
      // over-serving here costs the thing the user actually came for.
      sizes={`${px}px`}
      className={`pointer-events-none select-none ${className}`}
    />
  );
}

/**
 * An empty state with Amara in it. Extracted because the app has five of
 * these and they were drifting apart — different spacing, different
 * heading weight, one with a period and one without. A shared component
 * is how "no results" stops feeling like a bug and starts feeling like
 * part of the product.
 */
export function MascotEmptyState({
  pose = "sitting",
  title,
  body,
  action,
}: {
  pose?: MascotPose;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Mascot pose={pose} size="lg" />
      <h2 className="display mt-6 text-2xl">{title}</h2>
      {body && (
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

// /components/Mali.tsx
//
// Mali — named for the Thai jasmine flower (มะลิ), symbolising purity,
// warmth and respect. Formerly "Amara", and formerly everywhere.
//
// ---------------------------------------------------------------------
// Why she moved, and where she is allowed to be now.
//
// The audit is unambiguous: "The 3D cartoon mascot must be completely
// removed from all primary marketing surfaces, hero banners, browse
// feeds, and landing page conversion funnels." Its reasoning is
// commercial rather than aesthetic — a stylised 3D avatar on a
// matchmaking homepage reads to an affluent 40-year-old man as a mobile
// game, and in a category defined by catfishing it primes him to
// suspect the whole female registry is as artificial as the cartoon.
// There is a cross-cultural argument too: rendering Southeast Asian
// women through a cartoon lens trivialises the professionals this app
// is asking to take it seriously.
//
// The same report is equally clear that she should be *kept*, with a
// job: "an ephemeral, internal micro-concierge named Mali... appears
// solely within contextual onboarding tooltips... and is hidden once
// onboarding is finalised." The Vibrant Dream brief then names the
// three moments she owns:
//
//   wai      The traditional Thai greeting. Welcome and onboarding.
//   seal     Holding an antique brass seal — the Safety Guardian, for
//            selfie verification, so security feels ceremonial rather
//            than bureaucratic.
//   lantern  The Lantern Matchmaker. A mutual match lights a floating
//            lantern. Celebration only.
//
// So the rule is not "less mascot", it is: she appears where a person
// is being *guided or congratulated*, and never where they are
// *evaluating other people*. Marketing pages, the hero, and the browse
// feed are evaluation surfaces. She is absent from all three.
//
// She stays decorative for assistive tech — alt="" and aria-hidden —
// because the surrounding copy already carries every meaning she
// gestures at. A screen reader announcing "illustration of a woman in
// Thai dress" before each tooltip is noise, not access.
// ---------------------------------------------------------------------

import Image from "next/image";

export type MaliPose = "wai" | "seal" | "lantern";

const POSE_SRC: Record<MaliPose, string> = {
  wai: "/mascots/mali-wai.webp",
  seal: "/mascots/mali-seal.webp",
  lantern: "/mascots/mali-lantern.webp",
};

const SIZE_PX = {
  xs: 64,
  sm: 96,
  md: 168,
  lg: 260,
} as const;

export function Mali({
  pose = "wai",
  size = "md",
  className = "",
}: {
  pose?: MaliPose;
  size?: keyof typeof SIZE_PX;
  className?: string;
}) {
  const px = SIZE_PX[size];

  return (
    <Image
      src={POSE_SRC[pose]}
      alt=""
      aria-hidden
      width={px}
      // The source plates are 2:3. Passing the true ratio stops Next
      // from reserving a square box and leaving a band of dead space
      // under every tooltip.
      height={Math.round(px * 1.5)}
      sizes={`${px}px`}
      className={`pointer-events-none select-none ${className}`}
    />
  );
}

/**
 * A contextual onboarding tooltip — Mali's one sanctioned habitat.
 *
 * Deliberately a plain block rather than a floating popover: a popover
 * has to be dismissed, and something that must be dismissed during
 * sign-up is friction in the exact funnel the audit wants widened. This
 * sits inline next to the step it explains and scrolls away with it.
 */
export function MaliTip({
  pose = "wai",
  title,
  children,
}: {
  pose?: MaliPose;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-gold flex items-start gap-3 p-4">
      <Mali pose={pose} size="xs" className="-my-1 shrink-0" />
      <div className="min-w-0">
        {title && <p className="label text-[var(--gold-deep)]">{title}</p>}
        <div className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{children}</div>
      </div>
    </div>
  );
}

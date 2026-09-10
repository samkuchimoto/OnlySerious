// /components/LiveLounge.tsx
//
// The Live Lounge presence bar — "Real-Time Ambient Presence" from the
// Vibrant Dream brief: a subtle top bar reading "142 ladies active right
// now in Bangkok, Cebu & Da Nang", which "immediately communicates
// platform vitality".
//
// ---------------------------------------------------------------------
// The number is real, and that is a deliberate constraint rather than a
// limitation.
//
// The brief's mock shows 142. This platform does not have 142 people
// online, and a hard-coded 142 would be the single most damaging line
// of code in the repository: the entire pitch is that the profiles are
// real when the competition's are not, and a fabricated presence count
// is precisely the lie the target subscriber has already been burned by
// somewhere else. It is also the easiest lie to catch — he scrolls, he
// counts four green dots, and he never pays.
//
// So the count is computed from the feed that is actually loaded
// (lib/discovery's 15-minute "live" window), and the bar renders
// nothing at all when that count is zero. An empty sanctuary says
// nothing; an empty sanctuary claiming to be full says something much
// worse.
// ---------------------------------------------------------------------

"use client";

import { marketById, type MarketId } from "@/lib/markets";

export function LiveLounge({
  count,
  market,
}: {
  /** People active within the last 15 minutes, in the current hub. */
  count: number;
  market: MarketId;
}) {
  // See the header comment. No count, no claim.
  if (count < 1) return null;

  const active = marketById(market);
  // Names the cities of the selected hub, or the three launch capitals
  // when looking across all of them — the brief's own phrasing.
  const where = active
    ? active.cities.slice(0, 2).join(" & ")
    : "Bangkok, Cebu & Da Nang";

  return (
    <div
      // aria-live so a screen-reader user is told when the room fills,
      // but "polite" so it waits for a pause rather than interrupting
      // someone mid-profile.
      aria-live="polite"
      className="mt-5 flex items-center gap-2.5 rounded-full border border-[color-mix(in_srgb,var(--celadon)_28%,var(--rule))] bg-[color-mix(in_srgb,var(--celadon)_7%,transparent)] px-4 py-2"
    >
      <span className="dot-online dot-online-pulse h-2 w-2 shrink-0" aria-hidden />
      <p className="text-sm text-[var(--foreground)]">
        <span className="font-semibold tabular-nums">{count}</span>{" "}
        {count === 1 ? "member is" : "members are"} active right now
        <span className="text-[var(--muted)]"> in {where}</span>
      </p>
    </div>
  );
}

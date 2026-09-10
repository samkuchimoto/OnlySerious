// /components/CountryHub.tsx
//
// Country Hub switchers — the audit's Phase 1 item, "Configure
// localized Country Hub switchers (TH, PH, VN)", elevated to what it
// calls "a primary navigational control".
//
// It sits above the grid rather than inside a filter drawer for a
// reason the audit makes explicit: cross-border discovery is the
// product, so which country you are looking at is not a refinement of
// the search, it *is* the search. Burying it one tap deep would make
// the multi-market registry invisible to the person paying for access
// to it.
//
// Counts are shown per hub and are real — computed from the loaded
// feed. An inflated or absent count is the same failure as an inflated
// "who liked you" number: it is discovered in one tap and it costs the
// trust the whole platform is selling.

"use client";

import Image from "next/image";
import { MARKET_TABS, marketById, type MarketId } from "@/lib/markets";

export function CountryHub({
  value,
  counts,
  onChange,
}: {
  value: MarketId;
  /** Live profile count per hub, including "all". */
  counts: Record<MarketId, number>;
  onChange: (next: MarketId) => void;
}) {
  const active = marketById(value);

  return (
    <div className="mt-5">
      <div
        role="tablist"
        aria-label="Country"
        // Scrolls rather than wraps: four chips fit a phone, but a fifth
        // market (Indonesia, Malaysia — Phase 4) must extend the row,
        // not start a ragged second one.
        className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MARKET_TABS.map((tab) => {
          const selected = tab.id === value;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "border-transparent bg-[var(--teak)] text-[var(--cream)]"
                  : "border-[var(--rule)] text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--gold)_45%,var(--rule))] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs font-normal tabular-nums ${
                  selected ? "text-[var(--gold)]" : "text-[var(--muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* The hub header. Only for a specific market — "All" gets no
          banner, because a photograph of one country standing for the
          whole region is exactly the flattening this product should not
          do. */}
      {active && (
        <div className="frame-teak relative mt-4 h-28 overflow-hidden sm:h-36">
          <Image
            src={active.image}
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--teak)_85%,transparent)] via-[color-mix(in_srgb,var(--teak)_45%,transparent)] to-transparent" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5 sm:px-7">
            <p className="display text-xl text-[var(--cream)] sm:text-2xl">{active.label}</p>
            <p className="mt-0.5 text-xs text-[var(--cream)]/75 sm:text-sm">
              {active.cities.slice(0, 3).join(" · ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

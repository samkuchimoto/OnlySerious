// /components/AppNav.tsx
// One header for every signed-in page. Replaces four hand-written
// headers that had drifted apart — Likes offered only a "Matches" link,
// Settings offered none at all, so parts of the app were reachable from
// some screens and not others.
//
// It also carries the Upgrade button. ThaiFriendly's pattern, and the
// reason it's here: the only previous way to find the paid tier was to
// spend all five likes and read the wall that appeared. Someone who has
// already decided to pay had nowhere to click, and the paying side is
// the side that funds the app.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { capture } from "@/lib/analytics";
import type { UserProfile } from "@/lib/types";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/matches", label: "Matches" },
  { href: "/liked-me", label: "Likes" },
  // The sign-up route doubles as the profile editor once a profile
  // exists — it was only linked from Browse before.
  { href: "/sign-up", label: "My profile" },
  { href: "/settings", label: "Settings" },
];

type AppNavProps = {
  // Page-specific status shown before the links — currently Browse's
  // "N likes left today", which is what gives the Upgrade button next
  // to it its context.
  meta?: React.ReactNode;
};

export function AppNav({ meta }: AppNavProps) {
  const pathname = usePathname();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    return watchAuthState(async (user) => {
      if (!user) {
        setSubscriptionStatus(null);
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid)).catch(() => null);
      if (snap?.exists()) setSubscriptionStatus((snap.data() as UserProfile).subscriptionStatus);
    });
  }, []);

  // Hidden for subscribers (nothing left to sell them) and on the
  // checkout page itself. Rendered only once the status is actually
  // known, so a paying member never sees an Upgrade button flash in
  // before it disappears.
  const showUpgrade =
    subscriptionStatus !== null && subscriptionStatus !== "active" && pathname !== "/premium";

  return (
    // Two deliberate rows on a phone, one row from sm up. Six links plus
    // the likes counter cannot fit 360px, and letting them wrap produced
    // a ragged break mid-list ("...My profile" / "Settings [Upgrade]")
    // that read as broken rather than designed. Most traffic is phones.
    <header className="mx-auto w-full max-w-2xl px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/browse" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        {/* Pinned to the top row on every width, so the one commercial
            action never ends up orphaned on a line of its own. */}
        {showUpgrade && (
          <Link
            href="/premium"
            onClick={() => capture("upgrade_clicked", { source: `nav:${pathname}` })}
            className="shrink-0 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-transform hover:scale-[1.03]"
          >
            Upgrade
          </Link>
        )}
      </div>

      {/* Scrolls sideways rather than wrapping if it ever overflows —
          a single tidy line beats a second ragged one. The scrollbar is
          hidden because the row is short enough that it reads as a row,
          not as a scroller. */}
      <div className="mt-3 flex items-center gap-x-4 overflow-x-auto whitespace-nowrap text-sm text-neutral-400 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {meta && <span className="shrink-0">{meta}</span>}
        {LINKS.filter((link) => link.href !== pathname).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 transition-colors hover:text-neutral-900"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

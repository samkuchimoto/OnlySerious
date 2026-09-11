"use client";

import { useState } from "react";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { LiveHeader } from "@/components/LiveHeader";
import { Hero } from "@/components/Hero";
import { DiscoveryGrid } from "@/components/DiscoveryGrid";
import { MaliConciergeModal } from "@/components/MaliConciergeModal";
import {
  CourtshipSection,
  FinalInvitation,
  SiteFooter,
  TrustSection,
} from "@/components/HomeSections";

// ---------------------------------------------------------------------
// The homepage, in the order a visitor's eye should travel:
//
//   Header        sticky, cohort pill, Sign in + Join Free
//   Hero          the dream, and the two doors
//   Directory     faces, immediately — the liquidity proof
//   Courtship     what makes this different from a message board
//   Trust         why a sceptical Western man can relax
//   Invitation    the last chance to convert a scroller
//   Footer        teak, hubs, legal
//
// The directory sits directly under the hero on purpose. A man
// evaluating a matchmaking platform answers one question in the first
// two seconds — is anybody actually here — and no amount of copy
// answers it. Everything below the grid exists to close someone the
// faces have already interested.
//
// This is a client component because the whole page hangs off one piece
// of state: whether the concierge modal is open. Every gated affordance
// in the grid needs to set it, and a context provider for a single
// boolean would be heavier than this.
// ---------------------------------------------------------------------
export default function Home() {
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const openConcierge = () => setConciergeOpen(true);

  return (
    <main className="flex-1">
      <LiveHeader />

      <div className="canvas pt-4">
        <InAppBrowserWarning />
      </div>

      <Hero />
      <DiscoveryGrid onGate={openConcierge} />
      <CourtshipSection />
      <TrustSection />
      <FinalInvitation />
      <SiteFooter />

      <MaliConciergeModal open={conciergeOpen} onClose={() => setConciergeOpen(false)} />
    </main>
  );
}

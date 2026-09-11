"use client";

import { useState } from "react";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { LiveHeader } from "@/components/LiveHeader";
import { DiscoveryGrid } from "@/components/DiscoveryGrid";
import { MaliConciergeModal } from "@/components/MaliConciergeModal";
import { PageTitle, SiteFooter, TrustSection } from "@/components/HomeSections";

// The members are the front page. There is no hero.
//
// A full-bleed photograph of a stock couple above the fold was pushing
// the only thing that proves this platform is real — actual members —
// below it. Landing straight on the directory is how ThaiFriendly works
// and it is what the app is actually selling: real people are here, and
// talking to them is what needs an account.
export default function Home() {
  const [conciergeOpen, setConciergeOpen] = useState(false);

  return (
    <main className="flex-1">
      <LiveHeader />

      <div className="canvas pt-4">
        <InAppBrowserWarning />
      </div>

      <PageTitle />
      <DiscoveryGrid onGate={() => setConciergeOpen(true)} />
      <TrustSection />
      <SiteFooter />

      <MaliConciergeModal open={conciergeOpen} onClose={() => setConciergeOpen(false)} />
    </main>
  );
}

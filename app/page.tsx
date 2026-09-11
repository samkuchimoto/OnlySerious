"use client";

import { useState } from "react";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { LiveHeader } from "@/components/LiveHeader";
import { Hero } from "@/components/Hero";
import { DiscoveryGrid } from "@/components/DiscoveryGrid";
import { MaliConciergeModal } from "@/components/MaliConciergeModal";
import { SiteFooter, TrustSection } from "@/components/HomeSections";

// Header, photograph, the members, three short lines, footer.
//
// The courtship and invitation sections that used to sit in between are
// gone — direct feedback was that the page carried far too much text,
// and almost none of it was doing work a visitor actually reads before
// deciding whether to sign up.
export default function Home() {
  const [conciergeOpen, setConciergeOpen] = useState(false);

  return (
    <main className="flex-1">
      <LiveHeader />
      <Hero />

      <div className="canvas pt-6">
        <InAppBrowserWarning />
      </div>

      <DiscoveryGrid onGate={() => setConciergeOpen(true)} />
      <TrustSection />
      <SiteFooter />

      <MaliConciergeModal open={conciergeOpen} onClose={() => setConciergeOpen(false)} />
    </main>
  );
}

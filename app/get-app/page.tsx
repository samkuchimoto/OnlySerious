// /app/get-app/page.tsx
// One page that answers "how do I get the app", whichever channel is
// actually available at the time.
//
// Three routes to the same app, offered in the order that costs the
// visitor least:
//   1. Install from the browser — works today, one tap, no download.
//   2. Google Play — once the listing exists.
//   3. Direct APK — for people who avoid Play, which is a real audience
//      in Southeast Asia, and for testers before the listing is live.
//
// Play and APK are env-driven so neither is advertised before it exists.
// A dead Play badge on launch day costs more trust than not showing one.

import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ApkDownloadLink } from "@/components/ApkDownloadLink";

export const metadata: Metadata = {
  title: `Get the ${BRAND_CONFIG.appTitle} app`,
  description: `Install ${BRAND_CONFIG.appTitle} on your phone.`,
};

const BENEFITS = [
  "Instant alerts when someone likes or messages you",
  "Opens straight from your home screen, no browser",
  "Same account, same profile — nothing to set up again",
];

export default function GetApp() {
  const playUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL;

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <Link href="/browse" className="text-sm text-neutral-400 transition-colors hover:text-neutral-900">
          Open in browser
        </Link>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight sm:text-4xl">
          Get {BRAND_CONFIG.appTitle} on your phone
        </h1>
        <p className="mt-3 max-w-md text-neutral-500">
          {BRAND_CONFIG.appTitle} installs straight from this page. It takes one tap and there&apos;s
          nothing to download.
        </p>

        <ul className="mt-8 flex flex-col gap-2.5">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-sm text-neutral-600">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <InstallAppButton />
        </div>

        {playUrl && (
          <div className="mt-10 border-t border-neutral-100 pt-8">
            <h2 className="text-sm font-medium text-neutral-700">Prefer Google Play?</h2>
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-full border border-neutral-900 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white"
            >
              Get it on Google Play
            </a>
          </div>
        )}

        <ApkDownloadLink />

        <p className="mt-10 text-xs text-neutral-400">
          Installing doesn&apos;t create a second account. It&apos;s the same {BRAND_CONFIG.appTitle},
          with your existing profile and matches.
        </p>
      </section>
    </main>
  );
}

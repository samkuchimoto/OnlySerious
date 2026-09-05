// /components/ApkDownloadLink.tsx
// Direct APK download, for people who install outside Google Play — a
// real audience in Southeast Asia — and for testers before the Play
// listing exists.
//
// Hidden entirely until NEXT_PUBLIC_APK_URL is set, so the page never
// advertises a download that isn't there. Sideloading needs an honest
// warning: Android shows a scary "unknown sources" dialog, and a page
// that doesn't mention it looks like the thing the dialog is warning
// about.

"use client";

import { BRAND_CONFIG } from "@/config/brand";
import { capture } from "@/lib/analytics";

export function ApkDownloadLink() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_URL;
  if (!apkUrl) return null;

  return (
    <div className="mt-10 border-t border-neutral-100 pt-8">
      <h2 className="text-sm font-medium text-neutral-700">Download the APK directly</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        For installing without Google Play. Android will ask you to allow installs from this source —
        that&apos;s expected for any app not installed through the Play Store.
      </p>
      <a
        href={apkUrl}
        onClick={() => capture("apk_downloaded")}
        className="mt-3 inline-block rounded-full border border-neutral-900 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white"
      >
        Download {BRAND_CONFIG.appTitle} for Android
      </a>
    </div>
  );
}

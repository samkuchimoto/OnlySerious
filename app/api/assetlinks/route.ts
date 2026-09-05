// /app/api/assetlinks/route.ts
// Digital Asset Links, served at /.well-known/assetlinks.json via the
// rewrite in next.config.ts.
//
// This is what makes the Play Store app a Trusted Web Activity rather
// than a browser in a costume. Android fetches this file, checks that the
// listed app signing certificate matches the APK that's running, and only
// then hides the URL bar. Get it wrong and the app still works but
// renders with Chrome's address bar across the top, which immediately
// reads as "this is just a website".
//
// A route rather than a file in public/ for two reasons: the fingerprint
// isn't known until the upload key exists, and it differs between the
// local build and Google Play App Signing — so it belongs in an env var,
// not committed JSON that has to be edited by hand later.

import { NextResponse } from "next/server";

export async function GET() {
  // Comma-separated: Play App Signing means Google re-signs the app with
  // its own key, so the fingerprint Android sees in production is NOT the
  // one from your local keystore. Both have to be listed or the URL bar
  // appears only on Play installs — exactly where it matters and the last
  // place you'd test.
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const packageName = process.env.ANDROID_PACKAGE_NAME ?? "app.osthai.twa";

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        // Android caches this aggressively. A short max-age means a
        // corrected fingerprint takes minutes to take effect rather than
        // however long the default happens to be.
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

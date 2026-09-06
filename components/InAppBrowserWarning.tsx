"use client";

import { useEffect, useState } from "react";

// Google actively blocks OAuth sign-in from known in-app WebViews
// ("disallowed_useragent") — not a graceful failure, a dead-end error
// page. LINE is the dominant messenger in Thailand and Messenger/
// Instagram are common too, so a link shared into any of them opens in
// exactly this kind of WebView unless the recipient explicitly taps
// "Open in browser" first. Catching this before the Google button is
// tapped, not after, matters a lot for a link going straight to real
// contacts.
function detectInAppBrowser(userAgent: string): string | null {
  if (/\bLine\//i.test(userAgent)) return "LINE";
  if (/FBAN|FBAV/i.test(userAgent)) return "Messenger/Facebook";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/MicroMessenger/i.test(userAgent)) return "WeChat";
  if (/TikTok/i.test(userAgent)) return "TikTok";
  // WhatsApp was missing, which is the one actually being used to send
  // invitations to real people. Its Android in-app browser identifies
  // itself this way; on versions that hand off to the default browser
  // instead, this simply never matches and nothing is shown.
  if (/WhatsApp/i.test(userAgent)) return "WhatsApp";
  return null;
}

type InAppBrowserWarningProps = {
  // "install" is for /get-app, where the blocked action is installing
  // rather than signing in. Two different dead ends, and naming the
  // wrong one reads as a generic warning people skip.
  context?: "signin" | "install";
};

export function InAppBrowserWarning({ context = "signin" }: InAppBrowserWarningProps) {
  const [appName, setAppName] = useState<string | null>(null);

  useEffect(() => {
    // Only knowable client-side, from the real browser's user agent —
    // see detectInAppBrowser's comment for why this can't be skipped.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppName(detectInAppBrowser(navigator.userAgent));
  }, []);

  if (!appName) return null;

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>
        {context === "install"
          ? `You can't install the app from inside ${appName}.`
          : `Signing in with Google won't work inside ${appName}.`}
      </strong>{" "}
      Tap the ••• or share icon at the bottom of your screen and choose &quot;Open in Browser&quot;
      (Chrome or Safari) first.
    </div>
  );
}

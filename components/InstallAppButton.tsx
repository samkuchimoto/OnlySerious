// /components/InstallAppButton.tsx
// The "get the app" button. Installs OSThai to the phone's home screen
// from the website itself — real launcher icon, no browser chrome, push
// notifications — with no app store and no download.
//
// This is what makes the app available today rather than after Play
// review. The Play listing, when it exists, is a TWA wrapping this same
// installed experience, so nothing here is throwaway.

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { capture } from "@/lib/analytics";

// Whether the page is already running as an installed app. Read as
// external browser state rather than copied into state inside an effect,
// which cascades a render — and it genuinely can change, since a page can
// be launched into standalone mode.
const standaloneQuery = () => window.matchMedia("(display-mode: standalone)");

function subscribeToDisplayMode(onChange: () => void) {
  const mq = standaloneQuery();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Chrome fires this instead of installing on its own, handing the page a
// deferred prompt to trigger at a moment of its choosing. It isn't in
// the DOM lib's type definitions.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState =
  | "unknown" // still deciding — render nothing rather than flicker
  | "ready" // Chrome handed us a prompt: a real one-tap install
  | "installed" // already running as an installed app
  | "ios" // Safari never fires the event; needs manual instructions
  | "unsupported"; // desktop, Firefox, in-app browsers

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [state, setState] = useState<InstallState>("unknown");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const isStandalone = useSyncExternalStore(
    subscribeToDisplayMode,
    () => standaloneQuery().matches,
    () => false,
  );

  useEffect(() => {
    // Nothing to offer inside the installed app itself.
    if (isStandalone) return;

    const onBeforeInstallPrompt = (event: Event) => {
      // Without this Chrome shows its own mini-infobar and the page has
      // no say in when the prompt appears.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setState("ready");
    };
    const onInstalled = () => {
      setState("installed");
      capture("app_installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari supports installing but never fires beforeinstallprompt,
    // so it can only be offered as instructions. Detected by touch +
    // Apple platform rather than a user-agent string, which iPadOS lies
    // about (it reports as a Mac).
    const isApple =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Chrome fires beforeinstallprompt very shortly after load. Waiting a
    // moment before concluding "unsupported" avoids showing a fallback
    // for a second on a browser that was about to offer the real thing.
    const timer = setTimeout(() => {
      setState((current) => (current === "unknown" ? (isApple ? "ios" : "unsupported") : current));
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, [isStandalone]);

  async function handleInstall() {
    if (!promptEvent) return;
    capture("app_install_prompted");
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    capture(outcome === "accepted" ? "app_install_accepted" : "app_install_dismissed");
    // The event is single-use; Chrome will fire a fresh one later if the
    // person declines, so holding onto a spent one would give a dead
    // button.
    setPromptEvent(null);
    if (outcome === "accepted") setState("installed");
  }

  if (isStandalone || state === "unknown" || state === "installed") return null;

  if (state === "ready") {
    return (
      <button
        onClick={handleInstall}
        className={`rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] ${className}`}
      >
        Install the app
      </button>
    );
  }

  if (state === "ios") {
    return (
      <p className={`text-sm text-neutral-500 ${className}`}>
        To install: tap <span className="font-medium text-neutral-900">Share</span>, then{" "}
        <span className="font-medium text-neutral-900">Add to Home Screen</span>.
      </p>
    );
  }

  // Desktop and browsers that can't install. Saying so plainly beats a
  // button that does nothing.
  return (
    <p className={`text-sm text-neutral-500 ${className}`}>
      Open this page on your phone in Chrome to install the app.
    </p>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { enablePushNotifications } from "@/lib/messaging";

type Status = "idle" | "enabling" | "enabled" | "dismissed";

// Hinge's soft-ask pattern: prime with our own copy and let the person
// opt in on *our* button before the native OS permission dialog ever
// fires. Raises opt-in versus cold-asking, and a "no" here doesn't burn
// the one-shot native prompt the way a cold Notification.requestPermission()
// call would if the person dismisses it.
export function PushPrimer({ user, alreadyEnabled }: { user: User; alreadyEnabled: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alreadyEnabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    // Notification.permission only exists in the browser — this can't be
    // computed during the server render, so it has to be read post-mount
    // rather than derived synchronously from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [alreadyEnabled]);

  if (!visible || status === "enabled" || status === "dismissed") return null;

  async function handleEnable() {
    setStatus("enabling");
    const result = await enablePushNotifications(user.uid);
    setStatus(result.enabled ? "enabled" : "dismissed");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-5">
      <p className="text-sm font-medium text-neutral-900">Don&apos;t miss when someone likes you</p>
      <p className="text-sm text-neutral-500">
        Turn on notifications so you know the moment someone likes or messages you.
      </p>
      <div className="mt-1 flex items-center gap-4">
        <button
          onClick={handleEnable}
          disabled={status === "enabling"}
          className="w-fit rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {status === "enabling" ? "…" : "Turn on notifications"}
        </button>
        <button type="button" onClick={() => setStatus("dismissed")} className="text-sm text-neutral-400 hover:text-neutral-900">
          Not now
        </button>
      </div>
    </div>
  );
}

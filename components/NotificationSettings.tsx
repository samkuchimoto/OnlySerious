"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { enablePushNotifications } from "@/lib/messaging";

type Status = "idle" | "enabling" | "enabled" | "failed";

export function NotificationSettings({ user }: { user: User }) {
  const [status, setStatus] = useState<Status>("idle");
  const [reason, setReason] = useState<string | null>(null);

  async function handleEnable() {
    setStatus("enabling");
    setReason(null);
    const result = await enablePushNotifications(user.uid);
    if (result.enabled) {
      setStatus("enabled");
    } else {
      setStatus("failed");
      setReason(result.reason ?? "Something went wrong.");
    }
  }

  if (status === "enabled") {
    return <p className="text-sm text-neutral-600">✓ Notifications are on for this device.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-neutral-500">
        Get notified when someone likes you, matches with you, or sends a message.
      </p>
      <button
        onClick={handleEnable}
        disabled={status === "enabling"}
        className="w-fit rounded-full border border-neutral-900 px-5 py-2 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white disabled:opacity-50"
      >
        {status === "enabling" ? "…" : "Turn on notifications"}
      </button>
      {reason && <p className="text-sm text-red-600">{reason}</p>}
    </div>
  );
}

// /components/WaitlistForm.tsx
// Prelaunch email capture — written directly to Firestore's `waitlist`
// collection (see firestore.rules for the shape it enforces); nothing
// here is ever read back client-side. Reused on the homepage and on the
// sign-up gate shown while registration is women-first.
"use client";

import { useState, type FormEvent } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WaitlistEntry } from "@/lib/types";

type WaitlistFormProps = {
  ctaLabel?: string;
  align?: "center" | "start";
};

export function WaitlistForm({ ctaLabel = "Get the link", align = "start" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("submitting");
    try {
      const entry: Omit<WaitlistEntry, "id"> = { email: trimmed, createdAt: new Date().toISOString() };
      await addDoc(collection(db, "waitlist"), entry);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className={`text-sm font-medium text-neutral-900 ${align === "center" ? "text-center" : ""}`}>
        You&apos;re on the list — we&apos;ll email you the link the moment OSThai launches on Google Play.
      </p>
    );
  }

  return (
    <div className={`flex w-full max-w-sm flex-col gap-2 ${align === "center" ? "items-center" : ""}`}>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-full border border-neutral-300 px-5 py-3 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {status === "submitting" ? "Joining…" : ctaLabel}
        </button>
      </form>
      {status === "error" && <p className="text-xs text-red-600">Something went wrong — try again.</p>}
    </div>
  );
}

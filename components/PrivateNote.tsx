"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

type SaveStatus = "idle" | "saving" | "saved";

// ThaiFriendly's "your private notes for {name}" pattern — stored under
// the viewer's own user doc (users/{viewerId}/notes/{aboutUserId}), so
// firestore.rules' existing isOwner() check covers it and the person the
// note is about never sees it.
export function PrivateNote({ user, aboutUserId }: { user: User; aboutUserId: string }) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "users", user.uid, "notes", aboutUserId));
      if (snap.exists()) setText((snap.data().text as string) ?? "");
      setLoaded(true);
    }
    load();
  }, [user.uid, aboutUserId]);

  async function save() {
    setStatus("saving");
    await setDoc(doc(db, "users", user.uid, "notes", aboutUserId), {
      text,
      updatedAt: new Date().toISOString(),
    });
    setStatus("saved");
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Your private notes</p>
      <textarea
        rows={2}
        placeholder="Only you can see this — where you matched, what you talked about, anything worth remembering."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus("idle");
        }}
        onBlur={save}
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
      {status === "saved" && <p className="text-xs text-neutral-400">Saved.</p>}
    </div>
  );
}

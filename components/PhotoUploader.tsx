"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { MAX_PROFILE_PHOTOS, MIN_PROFILE_PHOTOS } from "@/lib/types";

export interface PhotoSubmission {
  id: string;
  url: string;
  moderationStatus: "pending" | "approved" | "rejected";
  reason: string | null;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

function fileToResizedBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => reject(new Error("could not read image"));
    img.src = objectUrl;
  });
}

function StatusBadge({ status, reason }: { status: PhotoSubmission["moderationStatus"]; reason: string | null }) {
  if (status === "approved") {
    return <span className="text-xs text-neutral-500">Approved</span>;
  }
  if (status === "rejected") {
    return <span className="text-xs text-red-600">Rejected{reason ? `: ${reason}` : ""}</span>;
  }
  return <span className="text-xs text-neutral-500">Awaiting review</span>;
}

export function PhotoUploader({
  user,
  onSubmissionsChange,
}: {
  user: User;
  onSubmissionsChange?: (submissions: PhotoSubmission[]) => void;
}) {
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users", user.uid, "photoSubmissions"), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((d) => d.data() as PhotoSubmission);
        setSubmissions(next);
        onSubmissionsChange?.(next);
      },
      (err) => {
        // Without this, a listener failure here leaves the photo grid
        // silently stuck on whatever it last showed — no visible sign
        // anything's wrong (see app/matches/[matchId]'s messages listener
        // for the same class of bug found live).
        console.error("photoSubmissions listener failed:", err);
        setError("Couldn't load your photos. Try refreshing the page.");
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  async function handleRetry(photoId: string) {
    setError(null);
    setRetryingId(photoId);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/photos/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Retry failed. Please try again.");
      }
    } catch {
      setError("Retry failed. Please try again.");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    setDeletingId(photoId);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Couldn't remove that photo. Please try again.");
      }
    } catch {
      setError("Couldn't remove that photo. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const approvedCount = submissions.filter((s) => s.moderationStatus === "approved").length;
  const atLimit = approvedCount >= MAX_PROFILE_PHOTOS;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const imageBase64 = await fileToResizedBase64(file);
      const idToken = await user.getIdToken();
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Upload failed. Please try again.");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-neutral-700">
        {approvedCount} of {MIN_PROFILE_PHOTOS} required photos approved
        {approvedCount < MIN_PROFILE_PHOTOS ? "" : " — you're set"}
      </p>
      {approvedCount < MAX_PROFILE_PHOTOS && (
        <p className="-mt-2 text-xs text-neutral-400">
          Profiles with more photos get more messages — we recommend at least {MAX_PROFILE_PHOTOS}.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {submissions.map((submission) => (
          <div key={submission.id} className="flex w-28 flex-col items-center gap-1.5">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.url}
                alt=""
                className={`h-28 w-28 rounded-lg object-cover ${
                  submission.moderationStatus === "rejected" ? "opacity-40" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => handleDelete(submission.id)}
                disabled={deletingId === submission.id}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs text-white shadow disabled:opacity-50"
              >
                {deletingId === submission.id ? "…" : "✕"}
              </button>
            </div>
            <StatusBadge status={submission.moderationStatus} reason={submission.reason} />
            {submission.moderationStatus === "pending" && (
              <button
                type="button"
                onClick={() => handleRetry(submission.id)}
                disabled={retryingId === submission.id}
                className="text-xs font-medium underline underline-offset-2 disabled:opacity-50"
              >
                {retryingId === submission.id ? "Checking…" : "Check again"}
              </button>
            )}
          </div>
        ))}
      </div>

      {!atLimit && (
        <label className="w-fit cursor-pointer rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-medium transition-colors hover:border-neutral-900">
          {uploading ? "Uploading…" : "Add a photo"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileChange} />
        </label>
      )}
      {atLimit && <p className="text-sm text-neutral-400">Maximum of {MAX_PROFILE_PHOTOS} photos reached.</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

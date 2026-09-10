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

const JPEG_QUALITY = 0.85;

// ---------------------------------------------------------------------
// Face-centred 4:5 framing, applied before upload.
//
// The audit's most severe usability finding: "candidate avatars
// frequently display with severed headspaces, framing the candidate
// from the collarbone or midriff downward... presenting a cropped torso
// instead of an eye-level portrait destroys platform credibility."
//
// Its prescribed fix is Cloudinary's `c_fill,g_face,w_600,h_750` or an
// equivalent Lambda. Neither exists here, and adding a paid image CDN
// to fix a crop is a lot of infrastructure for a transform the browser
// can already do. So the framing happens client-side, on the canvas
// that was already resizing every upload anyway.
//
// Two paths, in order of quality:
//
//   FaceDetector. Shipped in Chromium on Android, which is the majority
//   of this registry's devices. Where it exists, the crop window is
//   centred on the detected eye-line rather than on the face's centroid
//   — portraits look right when the eyes sit near the upper third, not
//   when the nose sits in the middle.
//
//   Upper-anchored fallback. Everywhere else (Safari, Firefox, desktop
//   Chrome without the flag), the window is anchored 8% down from the
//   top. This is not a guess dressed up as detection: in a portrait
//   photograph the head is at the top essentially always, so anchoring
//   high loses hem and floor instead of losing the face. It is the same
//   reasoning as `object-top` on the display side.
//
// The output is a hard 4:5 crop, per "an unyielding 4:5 vertical
// portrait aspect ratio". Landscape and square uploads are cropped
// horizontally to centre as well, since a 4:5 window cannot contain
// them otherwise.
// ---------------------------------------------------------------------

const TARGET_W = 1200;
const TARGET_H = 1500; // 4:5

type FaceBox = { x: number; y: number; width: number; height: number };

async function detectFace(source: CanvasImageSource): Promise<FaceBox | null> {
  // Not in TypeScript's DOM lib — it is a Chromium-only API — so the
  // shape is asserted rather than imported.
  const Detector = (
    window as unknown as {
      FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
        detect(image: CanvasImageSource): Promise<{ boundingBox: FaceBox }[]>;
      };
    }
  ).FaceDetector;
  if (!Detector) return null;
  try {
    const faces = await new Detector({ fastMode: true, maxDetectedFaces: 4 }).detect(source);
    if (!faces.length) return null;
    // The largest face is the subject. A group photo used as a primary
    // avatar should frame whoever is closest to the camera.
    return faces
      .map((f) => f.boundingBox)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  } catch {
    // Detection is opportunistic: a failure here must fall through to
    // the geometric crop, never block someone's upload.
    return null;
  }
}

async function fileToResizedBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("could not read image");

  try {
    const { width: w, height: h } = bitmap;

    // The largest 4:5 window that fits inside the source.
    const cropW = Math.min(w, h * (TARGET_W / TARGET_H));
    const cropH = cropW * (TARGET_H / TARGET_W);

    const face = await detectFace(bitmap);

    let top: number;
    if (face) {
      // Put the eye-line — roughly 40% down the detected box — at 38%
      // of the crop height. That is where a portrait's eyes sit when
      // the framing looks deliberate rather than accidental.
      const eyeLine = face.y + face.height * 0.4;
      top = eyeLine - cropH * 0.38;
    } else {
      top = h * 0.08;
    }
    // Clamp so the window never runs off either edge, which would
    // otherwise letterbox the crop with transparent pixels.
    top = Math.max(0, Math.min(top, h - cropH));

    let left = face ? face.x + face.width / 2 - cropW / 2 : (w - cropW) / 2;
    left = Math.max(0, Math.min(left, w - cropW));

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(bitmap, left, top, cropW, cropH, 0, 0, TARGET_W, TARGET_H);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1];
  } finally {
    // Decoded bitmaps hold real memory until closed, and someone adding
    // six photos on a phone decodes six of them.
    bitmap.close();
  }
}

function StatusBadge({ status, reason }: { status: PhotoSubmission["moderationStatus"]; reason: string | null }) {
  if (status === "approved") {
    return <span className="text-xs text-[var(--muted)]">Approved</span>;
  }
  if (status === "rejected") {
    return <span className="text-xs text-red-600">Rejected{reason ? `: ${reason}` : ""}</span>;
  }
  return <span className="text-xs text-[var(--muted)]">Awaiting review</span>;
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
      <p className="text-sm font-medium text-[var(--foreground)]">
        {approvedCount} of {MIN_PROFILE_PHOTOS} required photos approved
        {approvedCount < MIN_PROFILE_PHOTOS ? "" : " — you're set"}
      </p>
      {approvedCount < MAX_PROFILE_PHOTOS && (
        <p className="-mt-2 text-xs text-[var(--muted)]">
          Profiles with more photos get more messages — we recommend at least {MAX_PROFILE_PHOTOS}.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {submissions.map((submission) => (
          <div key={submission.id} className="flex w-28 flex-col items-center gap-1.5">
            <div className="relative">
              {/* 4:5, matching the frame the grid actually renders. A
                  square thumbnail here re-cropped the 4:5 upload a
                  second time, so the preview showed a tighter frame
                  than the card would — which is how someone approves a
                  photo and then finds their chin missing in Browse. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.url}
                alt=""
                className={`h-[8.75rem] w-28 rounded-lg object-cover object-top ${
                  submission.moderationStatus === "rejected" ? "opacity-40" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => handleDelete(submission.id)}
                disabled={deletingId === submission.id}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--foreground)] text-xs text-[var(--cream)] shadow disabled:opacity-50"
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
        <label className="w-fit cursor-pointer rounded-full border border-[var(--rule)] px-6 py-2.5 text-sm font-medium transition-colors hover:border-[var(--foreground)]">
          {uploading ? "Uploading…" : "Add a photo"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileChange} />
        </label>
      )}
      {atLimit && <p className="text-sm text-[var(--muted)]">Maximum of {MAX_PROFILE_PHOTOS} photos reached.</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

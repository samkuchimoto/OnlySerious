"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

type Stage = "idle" | "camera" | "submitting" | "verified" | "failed";

// A live camera capture, not a file picker — the point of selfie
// verification is liveness (you can't just upload another photo of
// someone else), so this deliberately doesn't reuse PhotoUploader's
// file-input pattern.
export function SelfieVerification({ user, alreadyVerified }: { user: User; alreadyVerified: boolean }) {
  const [stage, setStage] = useState<Stage>(alreadyVerified ? "verified" : "idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setStage("camera");
      // Video element only renders once stage flips — attach on next tick.
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch {
      setError("Couldn't access your camera. Check your browser's camera permission for this site.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function captureAndSubmit() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const selfieBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

    stopCamera();
    setStage("submitting");
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/verify-selfie", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ selfieBase64 }),
      });
      const body = await res.json().catch(() => ({}));
      if (body.verified) {
        setStage("verified");
      } else {
        setError(body.reason ?? body.error ?? "Verification failed. Please try again.");
        setStage("failed");
      }
    } catch {
      setError("Verification failed. Please try again.");
      setStage("failed");
    }
  }

  if (stage === "verified") {
    return <p className="text-sm text-neutral-600">✓ Your selfie is verified.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        Take a live selfie to get a Verified badge — compared against your approved photos so people know
        it&apos;s really you.
      </p>

      {stage === "camera" && (
        <div className="flex flex-col gap-3">
          <video ref={videoRef} autoPlay playsInline className="aspect-square w-48 rounded-xl bg-neutral-900 object-cover" />
          <div className="flex gap-3">
            <button
              onClick={captureAndSubmit}
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
            >
              Capture
            </button>
            <button
              onClick={() => {
                stopCamera();
                setStage("idle");
              }}
              className="text-sm text-neutral-400 hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(stage === "idle" || stage === "failed") && (
        <button
          onClick={startCamera}
          className="w-fit rounded-full border border-neutral-900 px-5 py-2 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white"
        >
          {stage === "failed" ? "Try again" : "Get Verified"}
        </button>
      )}

      {stage === "submitting" && <p className="text-sm text-neutral-400">Verifying…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

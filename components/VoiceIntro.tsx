// /components/VoiceIntro.tsx
//
// Recording and playing the 15-second Voice Introduction.
//
// Two components, because the two jobs have almost nothing in common:
// VoiceIntroRecorder is a permission-and-MediaRecorder flow that lives
// in the profile editor, and VoiceIntroPlayer is a play button that
// appears on other people's profiles.

"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { VOICE_INTRO_MAX_SECONDS, VOICE_INTRO_MIN_SECONDS, type VoiceIntro } from "@/lib/types";

// Chrome and Firefox record webm/opus; Safari only does mp4. Asking for
// the first supported type rather than assuming webm is the difference
// between this working on an iPhone and silently producing a zero-byte
// file there.
const CANDIDATE_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/** Strips the codec parameter: the API whitelists containers, and
 *  MediaRecorder reports back "audio/webm;codecs=opus". */
function baseType(mimeType: string): string {
  return mimeType.split(";")[0];
}

export function VoiceIntroPlayer({
  intro,
  label = "Voice introduction",
}: {
  intro: VoiceIntro;
  label?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="card-gold flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          if (playing) {
            el.pause();
            el.currentTime = 0;
          } else {
            void el.play();
          }
        }}
        aria-label={playing ? `Stop ${label}` : `Play ${label}`}
        className="btn-gold flex h-11 w-11 shrink-0 items-center justify-center text-base"
      >
        <span aria-hidden>{playing ? "■" : "▶"}</span>
      </button>
      <div className="min-w-0">
        <p className="label text-[var(--gold-deep)]">{label}</p>
        <p className="text-xs text-[var(--muted)]">{intro.durationSeconds}s · in her own voice</p>
      </div>
      {/* preload="none" on purpose: a browse page that opened six
          profiles would otherwise pull six audio files nobody asked to
          hear, over a mobile network in a market where that costs. */}
      <audio
        ref={audioRef}
        src={intro.url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

type RecorderState = "idle" | "recording" | "review" | "saving";

export function VoiceIntroRecorder({
  user,
  existing,
  onChange,
}: {
  user: User;
  existing?: VoiceIntro | null;
  onChange?: (intro: VoiceIntro | null) => void;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; seconds: number } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);

  // Revokes the object URL when the preview is replaced or the component
  // goes away. Without it, re-recording six times leaks six blobs for
  // the life of the page.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  // Drives the countdown and enforces the fifteen-second cap. The cap is
  // here rather than only on the button because someone who walks away
  // mid-recording should still end up with a fifteen-second file.
  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      setSeconds(elapsed);
      if (elapsed >= VOICE_INTRO_MAX_SECONDS) recorderRef.current?.stop();
    }, 100);
    return () => clearInterval(id);
  }, [state]);

  async function start() {
    setError(null);
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("This browser can't record audio. Try Chrome or Safari.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Covers both an outright denial and a device with no microphone;
      // the distinction doesn't change what the person has to do next.
      setError("Microphone access was blocked. Allow it in your browser settings and try again.");
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      // Releasing the tracks is what turns off the browser's recording
      // indicator. Leaving them open reads as an app still listening.
      stream.getTracks().forEach((t) => t.stop());
      const elapsed = Math.min((Date.now() - startedAtRef.current) / 1000, VOICE_INTRO_MAX_SECONDS);
      const blob = new Blob(chunksRef.current, { type: baseType(mimeType) });
      if (elapsed < VOICE_INTRO_MIN_SECONDS) {
        setError(`That was too short — say at least ${VOICE_INTRO_MIN_SECONDS} seconds.`);
        setState("idle");
        return;
      }
      setPreview({ url: URL.createObjectURL(blob), blob, seconds: elapsed });
      setState("review");
    };

    startedAtRef.current = Date.now();
    setSeconds(0);
    recorder.start();
    setState("recording");
  }

  async function save() {
    if (!preview) return;
    setState("saving");
    setError(null);
    try {
      const buffer = await preview.blob.arrayBuffer();
      // btoa over a big string blows the argument limit, so the bytes are
      // chunked. 8KB is comfortably under every engine's cap.
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/voice-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          audioBase64: btoa(binary),
          contentType: preview.blob.type,
          durationSeconds: preview.seconds,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("That couldn't be saved. Please try again.");
        setState("review");
        return;
      }
      if (body.status === "rejected") {
        setError(
          "That recording can't go on a profile — it mentions something our guidelines don't allow. Try again without it.",
        );
        setState("review");
        return;
      }
      onChange?.({
        url: body.url,
        durationSeconds: Math.round(preview.seconds),
        moderationStatus: body.status,
        createdAt: new Date().toISOString(),
      });
      setPreview(null);
      setState("idle");
    } catch {
      setError("That couldn't be saved. Please try again.");
      setState("review");
    }
  }

  async function remove() {
    setState("saving");
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/voice-intro", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      onChange?.(null);
    } catch {
      setError("That couldn't be removed. Please try again.");
    } finally {
      setState("idle");
    }
  }

  const remaining = Math.max(0, VOICE_INTRO_MAX_SECONDS - seconds);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Voice introduction</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Fifteen seconds, in whichever language you prefer. Your name, where you are, and what
          you&apos;re hoping to find. Hearing a voice does more for trust across a border than
          anything you can type.
        </p>
      </div>

      {existing && state === "idle" && (
        <div className="flex flex-col gap-2">
          <VoiceIntroPlayer intro={existing} label="Your introduction" />
          {existing.moderationStatus === "pending" && (
            <p className="text-xs text-[var(--muted)]">
              Being checked. It goes live on your profile once it clears.
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={start} className="btn-quiet px-5 py-2 text-sm">
              Record again
            </button>
            <button
              type="button"
              onClick={remove}
              className="text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {!existing && state === "idle" && (
        <button type="button" onClick={start} className="btn-gold w-fit px-6 py-2.5 text-sm">
          Record 15 seconds
        </button>
      )}

      {state === "recording" && (
        <div className="card-gold flex items-center gap-3 p-4">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-[var(--lotus)]"
          />
          <p className="flex-1 text-sm tabular-nums">
            Recording… <span className="font-semibold">{remaining.toFixed(0)}s</span> left
          </p>
          <button
            type="button"
            onClick={() => recorderRef.current?.stop()}
            className="btn-quiet px-5 py-2 text-sm"
          >
            Stop
          </button>
        </div>
      )}

      {state === "review" && preview && (
        <div className="flex flex-col gap-3">
          {/* Plain controls rather than the styled player: this is the
              one moment where scrubbing back and forth matters, and a
              single play button makes checking one word a chore. */}
          <audio src={preview.url} controls className="w-full" />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={save} className="btn-gold px-6 py-2.5 text-sm">
              Use this
            </button>
            <button type="button" onClick={start} className="btn-quiet px-5 py-2.5 text-sm">
              Record again
            </button>
          </div>
        </div>
      )}

      {state === "saving" && <p className="text-sm text-[var(--muted)]">Saving…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

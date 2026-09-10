// /components/TwoLanterns.tsx
//
// The "Two Lanterns" synchronous icebreaker, from the Vibrant Dream
// brief:
//
//   "When two users enter a chat, they can tap a 60-second interactive
//    compatibility quiz with 3 fun, value-based questions... The answers
//    unlock simultaneously on screen, sparking dynamic conversation and
//    eliminating the dread of awkward first messages."
//
// ---------------------------------------------------------------------
// How the simultaneity actually works, and why it is built this way.
//
// True simultaneous reveal needs both sides' answers held somewhere
// neither can read until both have committed. There is no server route
// for that and no realtime channel in this stack — and adding both for
// three questions would be a lot of surface area to secure.
//
// So the reveal rides on the messaging pipeline that already exists.
// Answering posts one message containing the answers; the other side
// sees it as a card in the thread and answers back, and their card
// renders next to yours. It is a two-step reveal rather than a
// simultaneous one.
//
// That is a real difference from the brief, and it is the honest
// trade: the mechanic it is actually buying — "eliminating the dread of
// awkward first messages" — survives completely, because the whole
// value is that neither person has to compose an opener. What is lost
// is the theatre of both cards flipping at once. Worth noting rather
// than quietly shipping as if it matched.
//
// The questions are the brief's own, unchanged.
// ---------------------------------------------------------------------

"use client";

import { useState } from "react";
import { capture } from "@/lib/analytics";

export const LANTERNS_PREFIX = "lanterns:";

export const LANTERN_QUESTIONS = [
  { id: "retreat", prompt: "Beach retreat or mountain cabin?", options: ["Beach", "Mountains"] },
  { id: "dining", prompt: "Cook together or dine out?", options: ["Cook together", "Dine out"] },
  { id: "home", prompt: "Live in Asia or live abroad?", options: ["In Asia", "Abroad"] },
] as const;

/** Answers travel as one message: "lanterns:0,1,0" — an index per
 *  question, in order. Compact enough to survive the 2000-character
 *  message cap with room to spare, and trivially validated on read. */
export function encodeLanterns(answers: number[]): string {
  return `${LANTERNS_PREFIX}${answers.join(",")}`;
}

export function decodeLanterns(text: string): number[] | null {
  if (!text.startsWith(LANTERNS_PREFIX)) return null;
  const parts = text.slice(LANTERNS_PREFIX.length).split(",");
  if (parts.length !== LANTERN_QUESTIONS.length) return null;
  const answers = parts.map((p) => Number(p));
  // A malformed or out-of-range payload renders as ordinary text rather
  // than as a card with blank rows. Messages are user input, and this
  // one is parsed on the recipient's screen.
  const valid = answers.every(
    (a, i) => Number.isInteger(a) && a >= 0 && a < LANTERN_QUESTIONS[i].options.length,
  );
  return valid ? answers : null;
}

/** A played round as it appears in the thread. */
export function LanternsMessage({
  answers,
  mine,
  theirAnswers,
}: {
  answers: number[];
  mine: boolean;
  /** The other side's answers, if they have played too. */
  theirAnswers?: number[] | null;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="card-gold w-full max-w-xs p-4">
        <p className="label text-[var(--gold-deep)]">Two Lanterns</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {LANTERN_QUESTIONS.map((question, i) => {
            const theirs = theirAnswers?.[i];
            // The whole payoff of the game: a match is the thing worth
            // saying out loud, and it is what gives the other person
            // something to open with.
            const agreed = theirs !== undefined && theirs === answers[i];
            return (
              <li key={question.id}>
                <p className="text-[0.7rem] text-[var(--muted)]">{question.prompt}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                  {question.options[answers[i]]}
                  {agreed && (
                    <span className="label text-[0.5rem] text-[var(--gold-deep)]" title="You both said this">
                      · both
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function TwoLanterns({
  disabled,
  onPlay,
}: {
  disabled?: boolean;
  onPlay: (answers: number[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    LANTERN_QUESTIONS.map(() => null),
  );
  const [sending, setSending] = useState(false);

  const complete = answers.every((a) => a !== null);

  async function submit() {
    if (!complete) return;
    setSending(true);
    capture("lanterns_played");
    await onPlay(answers as number[]);
    setSending(false);
    setOpen(false);
    setAnswers(LANTERN_QUESTIONS.map(() => null));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="btn-quiet w-full px-4 py-2.5 text-sm disabled:opacity-40"
      >
        Play Two Lanterns — three questions, no opener needed
      </button>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label text-[var(--gold-deep)]">Two Lanterns</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Answer three, and they see them. They answer back.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="shrink-0 text-lg leading-none text-[var(--muted)]"
        >
          ×
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {LANTERN_QUESTIONS.map((question, i) => (
          <li key={question.id}>
            <p className="text-sm">{question.prompt}</p>
            <div className="mt-1.5 flex gap-2">
              {question.options.map((option, optionIndex) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={answers[i] === optionIndex}
                  onClick={() =>
                    setAnswers((prev) => prev.map((a, j) => (j === i ? optionIndex : a)))
                  }
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    answers[i] === optionIndex
                      ? "border-transparent bg-[var(--teak)] text-[var(--cream)]"
                      : "border-[var(--rule)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={submit}
        disabled={!complete || sending}
        className="btn-gold mt-4 w-full px-4 py-2.5 text-sm disabled:opacity-40"
      >
        {sending ? "Sending…" : complete ? "Send my answers" : "Answer all three"}
      </button>
    </div>
  );
}

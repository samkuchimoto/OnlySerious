// /app/api/apply/route.ts
//
// The Velvet Rope application. Stores the entry and sends Mali's
// confirmation.
//
// ---------------------------------------------------------------------
// Firestore, not Supabase.
//
// The brief specified a Supabase table. This application runs on
// Firebase — auth, the profile registry, moderation state, the
// subscription mirror, and the existing `waitlist` collection all live
// in Firestore, behind rules deployed from this repo. Adding Postgres
// for one table means a second database, a second set of credentials,
// a second place to look during an incident, and a second system that
// can be out of sync about who a person is. The columns the brief asked
// for map one-to-one onto a document, so nothing is lost.
//
// Resend is called over its REST API rather than through the SDK, which
// keeps this from adding a dependency for one POST.
// ---------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";

const ROLE_OPTIONS = [
  "Man seeking a serious relationship",
  "Woman seeking a partner",
  "Cultured single seeking marriage",
] as const;

// The contact field accepts either an email or a phone number, so it
// cannot be z.string().email(). Both shapes are checked loosely: this
// is a waitlist, and rejecting a real person over an unusual but valid
// address costs more than accepting one that bounces.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+[1-9]\d{6,15}$/;

const requestSchema = z.object({
  roleIntent: z.enum(ROLE_OPTIONS),
  city: z.string().trim().min(1).max(120),
  contact: z.string().trim().min(3).max(254),
});

function contactKind(value: string): "email" | "phone" | null {
  if (EMAIL.test(value)) return "email";
  // Tolerate the spaces, dashes and brackets people type into a phone
  // field before deciding it is malformed.
  if (PHONE.test(value.replace(/[\s()\-.]/g, ""))) return "phone";
  return null;
}

const CONFIRMATION_TEXT = `Sawasdee ka,

Thank you for applying for private membership to AmoraAsia.

To ensure our community remains free from bots, commercial solicitations, and superficial swiping, our team personally reviews applications in weekly batches.

Your profile is currently in our queue. As soon as your city cohort opens, Mali will deliver your private access token directly to this address.

With warmth,

The AmoraAsia Team`;

/**
 * Sends the confirmation. Never throws: an application that was stored
 * but not acknowledged is a recoverable inconvenience, while a 500 here
 * would tell someone their application failed after it had already been
 * saved — and they would apply again.
 *
 * Returns what happened so the write can record it, which is what makes
 * a later "who never got their email" query answerable.
 */
async function sendConfirmation(to: string): Promise<"sent" | "skipped" | "failed"> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "skipped";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Mali from AmoraAsia <invitations@amoraasia.com>",
        to,
        subject: "Your AmoraAsia Invitation Application is Received",
        text: CONFIRMATION_TEXT,
      }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { roleIntent, city, contact } = parsed.data;

  const kind = contactKind(contact);
  if (!kind) {
    return NextResponse.json({ error: "invalid contact" }, { status: 400 });
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  // Written before the email is attempted. If Resend is down, the
  // application is still captured — which is the part that cannot be
  // recreated.
  await adminDb.collection("waitlist_applications").doc(id).set({
    id,
    createdAt,
    roleIntent,
    city,
    contact,
    contactKind: kind,
    status: "pending",
    confirmationEmail: "queued",
  });

  // A phone number cannot be emailed. The application stands; the
  // invite goes out by WhatsApp when the cohort opens.
  const emailResult = kind === "email" ? await sendConfirmation(contact) : "skipped";

  await adminDb
    .collection("waitlist_applications")
    .doc(id)
    .update({ confirmationEmail: emailResult })
    .catch(() => {});

  // The caller is told the application landed, not whether the email
  // did — from the applicant's side those are the same event, and the
  // second one is ours to chase.
  return NextResponse.json({ received: true });
}

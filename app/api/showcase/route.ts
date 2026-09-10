// /app/api/showcase/route.ts
//
// The public data behind the homepage: how many members are active
// right now, and the handful who have agreed to be shown to visitors
// who are not signed in.
//
// ---------------------------------------------------------------------
// Why this route exists rather than a hard-coded array.
//
// The brief for the homepage specified "142 members active right now"
// and six to eight named candidate cards. Both numbers and all of those
// people would have been invented.
//
// The count is a commercial claim. Stating a false one to induce a
// signup is a misleading action under the EU Unfair Commercial
// Practices Directive (2005/29/EC), which applies to this operator
// directly. It is also self-defeating: the first thing a new member
// does is look at the grid, and a registry that cannot produce 142
// people has just proved its own homepage wrong.
//
// The profiles are worse. A fabricated person carrying a "Lotus
// Verified" badge is a fake profile with a trust seal on it — the exact
// artefact this platform's entire pitch claims to have eliminated, and
// the practice the FTC pursued Match Group over. There is no version of
// that which is safe to ship.
//
// So both are real. The count is computed from the same 15-minute
// window the rest of the app uses, and the cards come from members who
// have explicitly opted in.
// ---------------------------------------------------------------------
//
// Consent, and why opt-in is not optional here.
//
// firestore.rules deliberately requires a signed-in reader before any
// profile is legible — "an active profile isn't meant to be scraped by
// anyone without an account". Putting members on the open web reverses
// that decision for them, and their photographs and city are personal
// data. So publication is a per-member flag that defaults to absent,
// this route reads nothing else, and no amount of traffic to the
// homepage can widen it.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { freshnessOf } from "@/lib/discovery";
import { MARKETS, isInMarket } from "@/lib/markets";
import { calculateAge, type UserProfile } from "@/lib/types";

// Recomputed at most once a minute. The homepage is the most-hit route
// on the site and this is a Firestore collection scan; a live number is
// worth one query a minute, not one per visitor.
export const revalidate = 60;

/** Only what a card renders. Nothing else leaves the server — no
 *  surname, no bio, no phone, no exact last-seen timestamp. */
interface ShowcaseMember {
  id: string;
  displayName: string;
  age: number;
  city: string;
  occupation: string | null;
  photoUrl: string | null;
  verified: boolean;
  voiceIntroSeconds: number | null;
}

export async function GET() {
  try {
    const snap = await adminDb.collection("users").where("status", "==", "active").get();
    const profiles = snap.docs.map((d) => d.data() as UserProfile).filter((p) => !p.paused);

    const liveCount = profiles.filter((p) => freshnessOf(p) === "live").length;
    const memberCount = profiles.length;

    // Members per launch market, so the city tiles on the homepage can
    // carry a real number rather than the phrase "members in this city",
    // which implies a quantity without ever committing to one. A hub
    // with nobody in it reports zero and the tile says so — an honest
    // zero on a launch market reads as early, which is true, where a
    // vague label reads as evasive.
    const cityCounts: Record<string, number> = {};
    for (const market of MARKETS) {
      cityCounts[market.id] = profiles.filter((p) => isInMarket(p.country, market.id)).length;
    }

    const members: ShowcaseMember[] = profiles
      // The consent gate. Absent means no, which is what every existing
      // member currently is.
      .filter((p) => p.publicShowcase === true)
      .filter((p) => p.photos?.[0]?.moderationStatus === "approved")
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        // First name only. A full name plus a city plus a photograph on
        // a public page is enough to find someone offline.
        displayName: p.displayName.split(" ")[0],
        age: calculateAge(p.birthdate),
        city: p.city,
        occupation: p.occupation ?? null,
        photoUrl: p.photos[0].url,
        verified: Boolean(p.selfieVerified),
        voiceIntroSeconds:
          p.voiceIntro?.moderationStatus === "approved" ? p.voiceIntro.durationSeconds : null,
      }));

    return NextResponse.json({ liveCount, memberCount, cityCounts, members });
  } catch (err) {
    // The homepage must render regardless. Zeroes make the header and
    // the grid fall back to their honest empty states rather than
    // breaking the page.
    console.error("showcase load failed:", err);
    return NextResponse.json({ liveCount: 0, memberCount: 0, cityCounts: {}, members: [] });
  }
}

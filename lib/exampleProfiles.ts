// /lib/exampleProfiles.ts
//
// Illustrative example cards for the public homepage.
//
// ---------------------------------------------------------------------
// What these are, and the four things that keep them honest.
//
// These are NOT members. They are AI-generated portraits with invented
// details, shown to demonstrate how a profile appears — the same thing
// a screenshot in a product tour does, except interactive.
//
// The original brief asked for exactly this data wearing a "Lotus
// Verified" badge and presented as the registry. That version is a fake
// profile carrying a trust seal, which is the practice this platform
// sells itself as being free of and the one the FTC pursued Match Group
// over. The difference between that and this is not the pixels, it is
// whether the page tells the truth about them. So:
//
//   1. Every card carries a visible "Example" chip.
//   2. The grid is introduced as illustrative, above the fold of it.
//   3. A caption under the grid says the photography is AI-generated
//      and does not depict members.
//   4. No verification badge appears on any of them — that badge means
//      a real selfie passed a real check, and none of these did.
//
// The moment real members opt in (UserProfile.publicShowcase), the grid
// renders them instead and these disappear. Nothing here is load-bearing.
//
// Cities are matched to what is actually visible behind each portrait —
// the Wat Arun ones say Bangkok, the Phuket café ones say Phuket — so
// the examples are at least internally coherent rather than randomly
// captioned.
// ---------------------------------------------------------------------

export interface ExampleProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  occupation: string;
  photo: string;
  /** Seconds, for the gated "Listen to Voice Intro" affordance. */
  voiceSeconds: number;
}

export const EXAMPLE_PROFILES: ExampleProfile[] = [
  { id: "ex1", name: "Ploi", age: 27, city: "Bangkok", occupation: "Architect", photo: "/examples/example-01.webp", voiceSeconds: 12 },
  { id: "ex2", name: "Fahsai", age: 26, city: "Bangkok", occupation: "Marketing lead", photo: "/examples/example-02.webp", voiceSeconds: 14 },
  { id: "ex3", name: "Nara", age: 29, city: "Bangkok", occupation: "Dentist", photo: "/examples/example-03.webp", voiceSeconds: 11 },
  { id: "ex4", name: "Kanya", age: 31, city: "Chiang Mai", occupation: "Hotelier", photo: "/examples/example-04.webp", voiceSeconds: 15 },
  { id: "ex5", name: "Praewa", age: 28, city: "Phuket", occupation: "Dive instructor", photo: "/examples/example-05.webp", voiceSeconds: 13 },
  { id: "ex6", name: "Siriporn", age: 30, city: "Phuket", occupation: "Chef", photo: "/examples/example-06.webp", voiceSeconds: 12 },
  { id: "ex7", name: "Maria", age: 29, city: "Metro Manila", occupation: "Financial analyst", photo: "/examples/example-07.webp", voiceSeconds: 10 },
  { id: "ex8", name: "Ratana", age: 27, city: "Chiang Mai", occupation: "Textile designer", photo: "/examples/example-08.webp", voiceSeconds: 14 },
];

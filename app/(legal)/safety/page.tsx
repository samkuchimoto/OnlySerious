import Link from "next/link";

const SECTIONS = [
  {
    title: "Before you meet",
    items: [
      "Keep the conversation on the platform until you're comfortable — you're not obligated to share your phone number, social media, or address early.",
      "Video call before meeting in person if you can. It's a normal, reasonable ask.",
      "Be wary of anyone who asks for money, gifts, or financial help — report it. This is exactly what our messaging filter is built to catch.",
      "Search their name and photos online if something feels off.",
    ],
  },
  {
    title: "Meeting in person",
    items: [
      "Meet in a public place for the first time, and get there and back yourself.",
      "Tell a friend or family member where you're going and who with.",
      "Stay sober enough to make good decisions, and keep your phone charged.",
      "Trust your instincts — if something feels wrong, you can leave at any time, no explanation needed.",
    ],
  },
];

// Categorized cards (Hinge's Safety-tab pattern) instead of one long
// scroll of headings — a trust signal worth being able to skim,
// especially during a women-first prelaunch push where safety is the
// first real objection a new registrant has.
export default function Safety() {
  return (
    <>
      <h1>Dating Safety</h1>

      <div className="mt-2 flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-xl border border-neutral-200 p-5">
            <h2 className="text-base font-medium text-neutral-900">{section.title}</h2>
            <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-neutral-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="text-base font-medium text-neutral-900">If something goes wrong</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            Report and Block are available on every profile (look for the ••• menu) and take effect immediately —
            Block also removes that person from your Browse right away. If you&apos;re ever in immediate danger,
            contact local emergency services first; reporting to us afterward helps us act on the account.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="text-base font-medium text-neutral-900">More on this</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            <Link href="/community-guidelines" className="w-fit text-neutral-600 underline underline-offset-2 hover:text-neutral-900">
              Community Guidelines
            </Link>
            <Link href="/terms" className="w-fit text-neutral-600 underline underline-offset-2 hover:text-neutral-900">
              Terms of Service
            </Link>
            <Link href="/privacy" className="w-fit text-neutral-600 underline underline-offset-2 hover:text-neutral-900">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

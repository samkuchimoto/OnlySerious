import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-y-2 px-6 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
          <Link href="/terms" className="transition-colors hover:text-neutral-900">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-neutral-900">
            Privacy
          </Link>
          <Link href="/community-guidelines" className="transition-colors hover:text-neutral-900">
            Guidelines
          </Link>
          <Link href="/safety" className="transition-colors hover:text-neutral-900">
            Safety
          </Link>
        </div>
      </header>
      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <div className="flex flex-col gap-4 pt-4 text-sm leading-relaxed text-neutral-700 [&_h1]:text-2xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:text-neutral-900 [&_h1]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-neutral-900">
          {children}
        </div>
      </section>
    </main>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Counts page changes inside the app since it was opened, so Back knows whether
// there's an in-app page to go back to (vs. a page opened directly or from outside).
let pagesVisited = 0;

/** Rendered once in the layout; counts in-app page changes. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    pagesVisited += 1;
  }, [pathname]);
  return null;
}

/**
 * In-app back button. The home-screen app has no browser back button, so this goes
 * back to where you came from, or to the home grid if the page was opened directly.
 */
export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (pagesVisited > 1 ? router.back() : router.push("/"))}
      className="-ml-1 inline-flex items-center gap-1 rounded-full px-1 py-1 text-sm text-muted hover:text-fg"
    >
      <span aria-hidden>←</span> {label}
    </button>
  );
}

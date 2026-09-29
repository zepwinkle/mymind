"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** While items are still being read by the AI, refresh the page every few seconds. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}

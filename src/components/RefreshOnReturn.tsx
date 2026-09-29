"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Reloads the page's data when you come back to the app (e.g. after sharing from
 * TikTok), since the home-screen app has no refresh button or pull-to-refresh.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt = 0;
    const onChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 2000) router.refresh();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [router]);
  return null;
}

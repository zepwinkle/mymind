import { after } from "next/server";
import { headers } from "next/headers";
import { internalToken } from "./auth";
import { processItem } from "./ingest";
import { updateItem } from "./items";
import type { Item } from "./types";

/** The site's own address, as seen by the current request. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Reads and tags an item in the background. On Netlify this hands the work to a
 * background function (netlify/functions/process-item), which runs to completion on
 * its own. Elsewhere (local dev) it falls back to running after the response.
 */
export async function startProcessing(id: string, options: { refetch?: boolean } = {}): Promise<void> {
  try {
    const res = await fetch(`${await requestOrigin()}/.netlify/functions/process-item`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/json", "x-mymind-token": await internalToken() },
      body: JSON.stringify({ id, refetch: options.refetch === true }),
      signal: AbortSignal.timeout(8000),
    });
    await res.body?.cancel().catch(() => {});
    if (res.status === 202) return;
  } catch {
    // Not on Netlify, or the function is unreachable: fall through.
  }
  after(() => processItem(id, options));
}

const STALE_MS = 2 * 60 * 1000;

/** Restarts items that have been stuck on "Reading…" for a while (e.g. an interrupted run). */
export async function restartStale(items: Pick<Item, "id" | "status" | "updated_at">[]): Promise<void> {
  const stale = items
    .filter((i) => i.status === "processing" && Date.now() - Date.parse(i.updated_at) > STALE_MS)
    .slice(0, 5);
  for (const item of stale) {
    // Touching the row resets its clock so it isn't restarted again on the next page load.
    await updateItem(item.id, { status: "processing", error: null });
    await startProcessing(item.id, { refetch: true });
  }
}

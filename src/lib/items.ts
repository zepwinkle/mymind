import "server-only";
import { withThumbnails } from "./storage";
import { db } from "./supabase";
import type { Collection, Item, ItemView, SmartFilter } from "./types";

/** "chick noodles" -> "chick:* & noodles:*" so partial words match as you type. */
export function toPrefixQuery(q: string): string | undefined {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return words?.length ? words.map((w) => `${w}:*`).join(" & ") : undefined;
}

export interface ItemQuery {
  q?: string;
  kind?: string;
  tag?: string;
  collection?: Collection;
  limit?: number;
}

export async function listItems({ q, kind, tag, collection, limit = 300 }: ItemQuery): Promise<ItemView[]> {
  const manual = collection?.type === "manual";
  let query = db()
    .from("items")
    .select(manual ? "*, collection_items!inner(collection_id)" : "*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (manual) query = query.eq("collection_items.collection_id", collection.id);
  if (collection?.type === "smart") {
    const f: SmartFilter = collection.filter ?? {};
    if (f.kinds?.length) query = query.in("kind", f.kinds);
    if (f.tags?.length) query = query.overlaps("tags", f.tags);
    const fq = f.query && toPrefixQuery(f.query);
    if (fq) query = query.textSearch("search", fq, { config: "english" });
  }

  const tsq = q && toPrefixQuery(q);
  if (tsq) query = query.textSearch("search", tsq, { config: "english" });
  if (kind) query = query.eq("kind", kind);
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const items = (data as unknown as (Item & { collection_items?: unknown })[]).map((row) => {
    const item = { ...row };
    delete item.collection_items;
    return item as Item;
  });
  return withThumbnails(items);
}

export async function getItem(id: string): Promise<ItemView | undefined> {
  const { data } = await db().from("items").select("*").eq("id", id).maybeSingle<Item>();
  if (!data) return undefined;
  return (await withThumbnails([data]))[0];
}

/** How many items there are of each kind, for the filter chips. */
export async function kindCounts(): Promise<Map<string, number>> {
  const { data } = await db().from("items").select("kind").not("kind", "is", null).limit(5000);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  return counts;
}

export async function listCollections(): Promise<Collection[]> {
  const { data, error } = await db().from("collections").select("*").order("name");
  if (error) throw new Error(error.message);
  return data as Collection[];
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  const { data } = await db().from("collections").select("*").eq("id", id).maybeSingle<Collection>();
  return data ?? undefined;
}

export async function collectionIdsForItem(itemId: string): Promise<Set<string>> {
  const { data } = await db().from("collection_items").select("collection_id").eq("item_id", itemId);
  return new Set((data ?? []).map((r) => r.collection_id as string));
}

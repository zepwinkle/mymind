import { query, setClause } from "./db";
import { withThumbnails } from "./storage";
import type { Collection, Item, ItemView, SmartFilter } from "./types";

/** "chick noodles" -> "chick:* & noodles:*" so partial words match as you type. */
export function toPrefixQuery(q: string): string | undefined {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return words?.length ? words.map((w) => `${w}:*`).join(" & ") : undefined;
}

/**
 * For group filters: commas separate alternatives, so "sew, sewing machine" finds items
 * mentioning "sew" OR both "sewing" and "machine".
 */
export function toAnyOfQuery(q: string): string | undefined {
  const parts = q.split(",").map(toPrefixQuery).filter((p): p is string => Boolean(p));
  return parts.length ? parts.map((p) => `(${p})`).join(" | ") : undefined;
}

const ITEM_COLUMNS = `i.id, i.created_at, i.updated_at, i.url, i.source, i.status, i.error, i.caption, i.author,
  i.thumbnail_path, i.media_paths, i.title, i.kind, i.summary, i.tags, i.details, i.note, i.completed_at`;

export interface ItemQuery {
  q?: string;
  kind?: string;
  tag?: string;
  completed?: boolean;
  collection?: Collection;
  limit?: number;
}

export async function listItems({ q, kind, tag, completed, collection, limit = 300 }: ItemQuery): Promise<ItemView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: (n: string) => string, value: unknown) => {
    params.push(value);
    where.push(sql(`$${params.length}`));
  };

  if (collection?.type === "manual") {
    add((n) => `exists (select 1 from collection_items ci where ci.item_id = i.id and ci.collection_id = ${n})`, collection.id);
  }
  if (collection?.type === "smart") {
    const f: SmartFilter = collection.filter ?? {};
    // Categories, tags and words: by default an item needs to match any one of them.
    const conditions: string[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    if (f.kinds?.length) conditions.push(`i.kind = any(${param(f.kinds)}::text[])`);
    if (f.tags?.length) conditions.push(`i.tags && ${param(f.tags)}::text[]`);
    const fq = f.query && toAnyOfQuery(f.query);
    if (fq) conditions.push(`i.search @@ to_tsquery('english', ${param(fq)})`);
    if (conditions.length) where.push(`(${conditions.join(f.match === "all" ? " and " : " or ")})`);
    if (typeof f.completed === "boolean") where.push(f.completed ? "i.completed_at is not null" : "i.completed_at is null");
  }
  if (completed !== undefined) where.push(completed ? "i.completed_at is not null" : "i.completed_at is null");
  const tsq = q && toPrefixQuery(q);
  if (tsq) add((n) => `i.search @@ to_tsquery('english', ${n})`, tsq);
  if (kind) add((n) => `i.kind = ${n}`, kind);
  if (tag) add((n) => `${n} = any(i.tags)`, tag);

  params.push(limit);
  const items = await query<Item>(
    `select ${ITEM_COLUMNS} from items i
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by i.created_at desc
     limit $${params.length}`,
    params,
  );
  return withThumbnails(items);
}

export async function getItem(id: string): Promise<ItemView | undefined> {
  if (!isUuid(id)) return undefined;
  const [item] = await query<Item>(`select ${ITEM_COLUMNS} from items i where i.id = $1`, [id]);
  return item ? (await withThumbnails([item]))[0] : undefined;
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<void> {
  const { sql, params } = setClause(patch, 2);
  if (sql) await query(`update items set ${sql} where id = $1`, [id, ...params]);
}

export async function completedCount(): Promise<number> {
  const [row] = await query<{ count: number }>(`select count(*)::int as count from items where completed_at is not null`);
  return row?.count ?? 0;
}

/** How many items there are of each kind, for the filter chips. */
export async function kindCounts(): Promise<Map<string, number>> {
  const rows = await query<{ kind: string; count: number }>(
    `select kind, count(*)::int as count from items where kind is not null group by kind`,
  );
  return new Map(rows.map((r) => [r.kind, r.count]));
}

export async function listCollections(): Promise<Collection[]> {
  return query<Collection>(`select * from collections order by lower(name)`);
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  if (!isUuid(id)) return undefined;
  const [group] = await query<Collection>(`select * from collections where id = $1`, [id]);
  return group;
}

export async function collectionIdsForItem(itemId: string): Promise<Set<string>> {
  if (!isUuid(itemId)) return new Set();
  const rows = await query<{ collection_id: string }>(`select collection_id from collection_items where item_id = $1`, [itemId]);
  return new Set(rows.map((r) => r.collection_id));
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

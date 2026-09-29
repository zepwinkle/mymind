import { normalizeTags } from "./ai";
import { KINDS, type SmartFilter } from "./types";

/** Validates the "new group" / "edit group" form body. */
export function parseCollectionInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const type = body.type === "smart" ? "smart" : "manual";
  const raw = (body.filter ?? {}) as Record<string, unknown>;
  const filter: SmartFilter = {};
  if (type === "smart") {
    const kinds = Array.isArray(raw.kinds) ? raw.kinds.filter((k) => (KINDS as readonly string[]).includes(String(k))) : [];
    const tags = Array.isArray(raw.tags) ? normalizeTags(raw.tags.map(String)) : [];
    const query = typeof raw.query === "string" ? raw.query.trim().slice(0, 200) : "";
    if (kinds.length) filter.kinds = kinds.map(String);
    if (tags.length) filter.tags = tags;
    if (query) filter.query = query;
  }
  return { name, type, filter } as const;
}

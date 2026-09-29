import { query } from "./db";

export interface MyTag {
  name: string;
  description: string | null;
}

/** Tags are stored lowercase, like the AI's, so filters and groups match them exactly. */
export function cleanTagName(raw: string): string {
  return raw.toLowerCase().replace(/^#+/, "").replace(/[,\s]+/g, " ").trim().slice(0, 40);
}

export async function listMyTags(): Promise<MyTag[]> {
  return query<MyTag>(`select name, description from my_tags order by name`);
}

export async function saveMyTag(name: string, description: string): Promise<void> {
  await query(
    `insert into my_tags (name, description) values ($1, $2)
     on conflict (name) do update set description = excluded.description`,
    [name, description || null],
  );
}

export async function deleteMyTag(name: string): Promise<void> {
  await query(`delete from my_tags where name = $1`, [name]);
}

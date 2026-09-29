import { getDatabase, type DatabaseConnection } from "@netlify/database";

let connection: DatabaseConnection | undefined;

/**
 * Runs a parameterized SQL query ($1, $2, …) against Netlify Database and returns the rows.
 * On Netlify the connection is configured automatically; locally, `netlify dev` provides it.
 */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  connection ??= getDatabase();
  const rows = await connection.sql.unsafe(text, params, { rowMode: "object" });
  // Drivers differ on timestamps (Date vs string); always hand back ISO strings.
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) row[key] = value.toISOString();
    }
  }
  return rows as T[];
}

/** Builds "col = $n" assignments for an UPDATE, starting at parameter $start. */
export function setClause(values: Record<string, unknown>, start = 1): { sql: string; params: unknown[] } {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined);
  return {
    sql: entries
      .map(([col, v], i) => {
        if (!/^[a-z_]+$/.test(col)) throw new Error(`Bad column name: ${col}`);
        const isJson = v !== null && typeof v === "object" && !Array.isArray(v);
        return `${col} = $${start + i}${isJson ? "::jsonb" : ""}`;
      })
      .join(", "),
    params: entries.map(([, v]) => (v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v)),
  };
}

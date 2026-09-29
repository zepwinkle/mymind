import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "media";

let client: SupabaseClient | undefined;

/** Server-only Supabase client using the service-role key (never sent to the browser). */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

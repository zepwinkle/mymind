// Single-person login: a password for the web app, and a separate token for the
// iPhone Shortcut. Uses Web Crypto so it also runs inside proxy.ts.

export const SESSION_COOKIE = "mymind_session";

async function hmac(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Values pasted into a hosting dashboard often pick up stray spaces or line breaks.
function env(name: "APP_PASSWORD" | "SAVE_TOKEN"): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function passwordConfigured(): boolean {
  return Boolean(env("APP_PASSWORD"));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The cookie value for a logged-in browser. Changing APP_PASSWORD logs every browser out. */
export async function sessionValue(): Promise<string> {
  const password = env("APP_PASSWORD");
  if (!password) throw new Error("APP_PASSWORD must be set (see .env.example).");
  return hmac(password, "mymind-session-v1");
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !env("APP_PASSWORD")) return false;
  return safeEqual(cookie, await sessionValue());
}

export async function isValidPassword(password: string): Promise<boolean> {
  const expected = env("APP_PASSWORD");
  if (!expected) return false;
  // Compare digests so the comparison length doesn't depend on the input.
  return safeEqual(await hmac("pw", password.trim()), await hmac("pw", expected));
}

/** True when a request carries either the browser session cookie or the Shortcut's token. */
export async function isAuthorized(request: Request): Promise<boolean> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const token = env("SAVE_TOKEN");
  if (bearer && token && token.length >= 16) {
    if (safeEqual(await hmac("tok", bearer), await hmac("tok", token))) return true;
  }
  const cookie = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return isValidSession(cookie ? decodeURIComponent(cookie) : undefined);
}

/** Secret the app uses to call its own background job (derived from APP_PASSWORD). */
export async function internalToken(): Promise<string> {
  const password = env("APP_PASSWORD");
  if (!password) throw new Error("APP_PASSWORD must be set (see .env.example).");
  return hmac(password, "mymind-internal-v1");
}

export async function isInternalRequest(request: Request): Promise<boolean> {
  const given = request.headers.get("x-mymind-token");
  if (!given || !env("APP_PASSWORD")) return false;
  return safeEqual(await hmac("tok", given), await hmac("tok", await internalToken()));
}

export function unauthorized(): Response {
  return Response.json({ error: "Not signed in" }, { status: 401 });
}

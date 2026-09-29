import { SESSION_COOKIE, isValidPassword, sessionValue } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => undefined);
  const password = String(form?.get("password") ?? "");
  if (!(await isValidPassword(password))) {
    // Slow down guessing a little.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 204,
    headers: {
      "set-cookie": `${SESSION_COOKIE}=${await sessionValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`,
    },
  });
}

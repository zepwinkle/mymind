import { headers } from "next/headers";
import Link from "next/link";
import { Header } from "@/components/Header";

export default async function SetupPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-site.netlify.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const endpoint = `${proto}://${host}/api/save`;
  const tokenSet = (process.env.SAVE_TOKEN ?? "").length >= 16;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 leading-relaxed">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← Back
        </Link>
        <h1 className="font-serif text-4xl">Save from your iPhone</h1>
        <p>
          The <b>“Save to mymind”</b> Shortcut adds this app to your Share menu. Share any TikTok, Pin, Instagram post or
          web page, add an optional note and screenshot, and it lands here, tagged by AI.
        </p>

        <div className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-sm text-muted">Your save address (the Shortcut sends things here)</p>
          <code className="block break-all rounded-lg bg-chip p-2 text-sm">{endpoint}</code>
          <p className="text-sm text-muted">Your save token</p>
          <p className="text-sm">
            {tokenSet ? (
              <>
                It&apos;s the <code>SAVE_TOKEN</code> value you set in Netlify (Project configuration → Environment variables). (It&apos;s not shown here on
                purpose.)
              </>
            ) : (
              <span className="text-red-600">
                Not set yet. Add a <code>SAVE_TOKEN</code> environment variable (at least 16 random characters).
              </span>
            )}
          </p>
        </div>

        <p>
          Step-by-step instructions for building the Shortcut are in{" "}
          <code>docs/iphone-shortcut.md</code> in the project.
        </p>

        <p className="text-sm text-muted">
          Tip: in Safari, tap Share → <b>Add to Home Screen</b> to open mymind like an app.
        </p>
      </main>
    </>
  );
}

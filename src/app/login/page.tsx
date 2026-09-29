"use client";

import { useState } from "react";
import { buttonClass, inputClass } from "@/components/Modal";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", { method: "POST", body: new FormData(e.currentTarget) });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(res.status === 503 && data.error ? data.error : "That password didn't work.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4 text-center">
        <h1 className="font-serif text-5xl">mymind</h1>
        <input name="password" type="password" placeholder="Password" autoFocus className={inputClass} autoComplete="current-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={`${buttonClass} w-full`} disabled={busy}>
          {busy ? "…" : "Open"}
        </button>
      </form>
    </main>
  );
}

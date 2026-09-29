import Link from "next/link";
import { AddButton } from "./AddButton";

export function Header({ q, action = "/", hidden }: { q?: string; action?: string; hidden?: Record<string, string> }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          mymind
        </Link>
        <form action={action} className="flex-1">
          {Object.entries(hidden ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search your mind…"
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-base outline-none placeholder:text-muted focus:border-accent"
          />
        </form>
        <AddButton />
      </div>
    </header>
  );
}

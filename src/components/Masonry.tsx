"use client";

import { Children, useEffect, useState } from "react";

// Explicit flex columns instead of CSS `columns`: Safari sometimes fails to paint
// cards (image, background and border) inside multi-column layouts.
const BREAKPOINTS: [query: string, columns: number][] = [
  ["(min-width: 1024px)", 5],
  ["(min-width: 640px)", 3],
];

function currentColumns(): number {
  return BREAKPOINTS.find(([q]) => window.matchMedia(q).matches)?.[1] ?? 2;
}

export function Masonry({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const update = () => setColumns(currentColumns());
    update();
    const lists = BREAKPOINTS.map(([q]) => window.matchMedia(q));
    lists.forEach((l) => l.addEventListener("change", update));
    return () => lists.forEach((l) => l.removeEventListener("change", update));
  }, []);

  // Deal cards out left-to-right so the newest items stay along the top row.
  const items = Children.toArray(children);
  const cols: React.ReactNode[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, i) => cols[i % columns].push(item));

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      {cols.map((col, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          {col}
        </div>
      ))}
    </div>
  );
}

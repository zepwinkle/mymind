import type { Source } from "./link-preview";

export const KINDS = [
  "recipe",
  "fashion",
  "home",
  "beauty",
  "fitness",
  "lifestyle",
  "travel",
  "design",
  "shopping",
  "quote",
  "learning",
  "entertainment",
  "other",
] as const;

export type Kind = (typeof KINDS)[number];

export const KIND_LABELS: Record<Kind, string> = {
  recipe: "Recipes",
  fashion: "Fashion",
  home: "Home & interiors",
  beauty: "Beauty",
  fitness: "Fitness",
  lifestyle: "Lifestyle & wellbeing",
  travel: "Travel & places",
  design: "Art & design",
  shopping: "Shopping",
  quote: "Quotes",
  learning: "Learning & how-to",
  entertainment: "Fun & entertainment",
  other: "Other",
};

export interface ItemDetails {
  ingredients?: string[];
  steps?: string[];
  extracted_text?: string;
}

export interface Item {
  id: string;
  created_at: string;
  updated_at: string;
  url: string | null;
  source: Source;
  status: "processing" | "ready" | "failed";
  error: string | null;
  caption: string | null;
  author: string | null;
  thumbnail_path: string | null;
  media_paths: string[];
  title: string | null;
  kind: Kind | null;
  summary: string | null;
  tags: string[];
  details: ItemDetails;
  note: string | null;
  completed_at: string | null;
}

/** An item plus a short-lived URL for its thumbnail. */
export interface ItemView extends Item {
  thumbnail_url: string | null;
  /** Thumbnail first, then any extra images (carousel slides). */
  image_urls: string[];
}

export interface SmartFilter {
  kinds?: string[];
  tags?: string[];
  query?: string;
  /** true = only completed items, false = only ones not completed yet. */
  completed?: boolean;
  /** Whether items must match any (default) or all of the categories / tags / words. */
  match?: "any" | "all";
}

export interface Collection {
  id: string;
  created_at: string;
  name: string;
  type: "manual" | "smart";
  filter: SmartFilter;
}

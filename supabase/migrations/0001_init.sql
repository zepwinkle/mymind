-- mymind schema: saved items, groups (manual + smart), and a private storage bucket.
-- Run this once in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- where it came from
  url text,
  source text not null default 'web',          -- tiktok | instagram | pinterest | youtube | web | image | note
  status text not null default 'processing',   -- processing | ready | failed
  error text,

  -- scraped from the link preview
  caption text,
  author text,
  thumbnail_path text,                          -- path inside the "media" storage bucket

  -- written by the AI (editable)
  title text,
  kind text,                                    -- recipe | fashion | home | travel | ...
  summary text,
  tags text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,   -- e.g. { ingredients: [], steps: [], extracted_text: "" }

  -- written by you
  note text,

  search tsvector
);

create index if not exists items_created_at_idx on items (created_at desc);
create index if not exists items_kind_idx on items (kind);
create index if not exists items_tags_idx on items using gin (tags);
create index if not exists items_search_idx on items using gin (search);

create or replace function items_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.search :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.kind, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.note, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.caption, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.author, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.details ->> 'extracted_text', '')), 'D') ||
    setweight(to_tsvector('english', coalesce(new.details ->> 'ingredients', '')), 'D');
  return new;
end;
$$;

drop trigger if exists items_before_write on items;
create trigger items_before_write
  before insert or update on items
  for each row execute function items_before_write();

-- Groups. "manual" groups hold hand-picked items; "smart" groups are saved filters
-- (e.g. every item whose kind is recipe) and fill themselves.
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  type text not null default 'manual' check (type in ('manual', 'smart')),
  filter jsonb not null default '{}'::jsonb      -- { kinds?: string[], tags?: string[], query?: string }
);

create table if not exists collection_items (
  collection_id uuid not null references collections (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);

create index if not exists collection_items_item_idx on collection_items (item_id);

-- The app talks to the database only from the server with the service-role key,
-- so lock the tables away from the public (anon) API entirely.
alter table items enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;

-- Private bucket for thumbnails and screenshots (served through short-lived signed URLs).
-- Guarded so this file also runs on a plain Postgres without Supabase Storage.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('media', 'media', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

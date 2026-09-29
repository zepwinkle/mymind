-- Your own tags (e.g. "healthy", "dinner"). The AI adds them to items whenever they apply,
-- guided by the optional description of what each one means to you.
create table if not exists my_tags (
  name text primary key,
  description text,
  created_at timestamptz not null default now()
);

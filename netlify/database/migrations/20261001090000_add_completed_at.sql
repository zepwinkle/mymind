-- "Completed" checkbox: when you've read the book, sewn the pattern, been to the place.
-- Null means not completed; otherwise it's when you ticked it off.
alter table items add column if not exists completed_at timestamptz;
create index if not exists items_completed_at_idx on items (completed_at) where completed_at is not null;

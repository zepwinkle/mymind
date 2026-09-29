-- Extra images for posts with more than one (e.g. TikTok photo carousels).
-- thumbnail_path stays the first/cover image; media_paths holds the rest, in order.
alter table items add column if not exists media_paths text[] not null default '{}';

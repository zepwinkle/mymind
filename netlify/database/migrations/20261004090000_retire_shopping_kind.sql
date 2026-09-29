-- The "shopping" category was retired (products are now filed under what they are, with the
-- "wishlist" tag for things to buy). Move existing items to "other" so Re-run AI can re-file them,
-- and drop it from any automatic group filters.
update items set kind = 'other' where kind = 'shopping';

update collections
set filter = jsonb_set(
  filter,
  '{kinds}',
  coalesce(
    (select jsonb_agg(k) from jsonb_array_elements(filter -> 'kinds') as k where k <> to_jsonb('shopping'::text)),
    '[]'::jsonb
  )
)
where filter -> 'kinds' @> to_jsonb(array['shopping']);

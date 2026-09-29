-- Starter set of the owner's own tags. Runs once; editing or removing them later in the app
-- is not undone by this file (existing tags are left as they are).
insert into my_tags (name, description) values
  ('breakfast', $$Eaten in the morning: eggs, oats, porridge, overnight oats, granola, yoghurt bowls, pancakes, smoothies, toast toppings, breakfast muffins. Not general baking or desserts.$$),
  ('lunch', $$A light-to-medium meal for midday: salads, soups, sandwiches, wraps, grain bowls, toasties, light pastas. Can also be dinner. Not snacks or sweet treats.$$),
  ('packed lunch', $$Travels well and can be eaten cold or reheated at work: salads that don't go soggy, grain/pasta salads, wraps, frittata, soups, leftovers-style dishes, bento. Not dishes that must be eaten hot and fresh, crispy/fried food, or things that fall apart.$$),
  ('dinner', $$A main evening meal: protein plus veg/carbs, curries, stews, pasta, traybakes, stir-fries, roasts. Not snacks, baking, desserts or breakfast foods.$$),
  ('healthy', $$Mostly whole foods: veg, lean protein, whole grains, beans, fruit. Not desserts, fried food, or dishes heavy in cream, sugar or processed ingredients.$$),
  ('high protein', $$A serving is clearly built around protein, roughly 25g or more: meat, fish, eggs, tofu/tempeh, Greek yoghurt, cottage cheese, protein powder, or lots of beans/lentils. Not dishes where protein is just a small topping.$$),
  ('freezer friendly', $$Freezes and reheats well: soups, stews, curries, chilli, bolognese, bakes, meatballs, burritos, bread, muffins, cookie dough. Not salads, raw veg, fried/crispy food, or cream/yoghurt sauces that split.$$),
  ('hosting', $$Good for feeding guests: sharing platters, grazing boards, dips, big-batch or make-ahead dishes, impressive centrepieces, crowd desserts, cocktails. Not single-portion everyday meals.$$),
  ('spring', $$Clearly suited to spring. Food: fresh greens, asparagus, peas, new potatoes, rhubarb, early strawberries, light fresh dishes. Clothes: light layers, trench coats, pastels, florals. Home/outings: blossom, gardening and planting, fresh flowers, spring cleaning. Leave out if the item isn't seasonal.$$),
  ('summer', $$Clearly suited to hot weather. Food: salads, BBQ/grilling, no-cook meals, stone fruit, berries, tomatoes, ice cream, iced drinks. Clothes: linen, sundresses, shorts, sandals, swimwear. Outings: beach, pool, picnics, eating outdoors. Leave out if the item isn't seasonal.$$),
  ('autumn', $$Clearly suited to autumn. Food: pumpkin, squash, apples, pears, mushrooms, warm spices, cosy bakes, crumbles. Clothes: knitwear, layering, boots, warm tones (rust, brown, burgundy, olive). Home/outings: falling leaves, harvest, cosy styling. Leave out if the item isn't seasonal.$$),
  ('winter', $$Clearly suited to cold weather. Food: soups, stews, roasts, slow-cooked dishes, hot drinks, rich comfort food. Clothes: coats, heavy knits, scarves, thermals. Home/outings: snow, fireplaces, candles, cosy interiors. Leave out if the item isn't seasonal.$$),
  ('treat meal', $$Indulgent rather than healthy: sweets, desserts, cakes, chocolate, deep-fried or heavily fried food, fast-food style dishes, very cheesy, creamy or sugary food. Usually the opposite of "healthy".$$),
  ('snack', $$Small bites between meals, not a full meal: energy balls, bars, dips with veg or crackers, popcorn, fruit-based snacks, small baked bites, yoghurt pots.$$),
  ('sewing pattern', $$Only when the item clearly is, or links to, an actual sewing pattern you could buy or download (a named pattern, pattern company or designer, a pattern shop or PDF pattern page). Not general sewing inspiration or tutorials without a pattern.$$),
  ('upcycle', $$Making something new from something old: refashioning clothes, thrifted or secondhand fabric, scraps, old furniture or household items given a new use or look.$$),
  ('hiking', $$Anything hiking: trails and walks, tramping routes, hiking gear and clothing, packing lists, trail snacks, hiking tips and safety.$$),
  ('camping', $$Anything camping or caravan related: campsites, tents, campervans and caravans, camp cooking, camping gear, packing lists, van organisation.$$),
  ('organisation', $$Storage, decluttering, tidying and cleaning systems, labelling, planners and routines, organising a room, drawer, pantry, wardrobe or van.$$),
  ('travel', $$Trips and places to visit: destinations, itineraries, accommodation, restaurants and cafes to try while away, packing tips, travel hacks.$$),
  ('gift ideas', $$Something that would make a good present for someone: products, handmade gifts, experiences, gift guides, stocking fillers, gift wrapping ideas.$$),
  ('piano', $$Anything piano: pieces and sheet music, songs to learn, technique and practice tips, music theory for piano, piano covers and tutorials.$$),
  ('house decor', $$Decorating and styling a home: interiors, furniture, colour schemes, art and wall styling, lighting, soft furnishings, room makeovers, decor to buy or make.$$),
  ('gardening', $$Anything gardening: growing vegetables, herbs, fruit or flowers, houseplants, garden design, planting guides, composting, garden DIY.$$)
on conflict (name) do nothing;

# mymind

A personal, AI-organised library for things you save: TikToks, Instagram posts, Pins, web pages,
screenshots and notes, inspired by the mymind app.

- **Save from anywhere**: an iPhone Share-menu Shortcut, or the **+ Save** button (link, image, note).
- **Thumbnails**: pulled from each link's preview and copied into your own storage, because platform
  image links expire. When a site needs a login (often Instagram), attach a screenshot instead.
- **AI tagging**: Claude looks at the image and caption (and your note) and writes a title, category,
  tags and summary. For recipes it also pulls out the ingredients and steps.
- **Search**: across titles, tags, captions, notes and text in images. Partial words work ("chick" finds chicken).
- **Groups**: *hand-picked* groups you add items to yourself, and *automatic* groups that fill
  themselves from a filter (e.g. every Recipe, or everything tagged "pasta").
- **Your notes** on every item, and you can edit anything the AI got wrong.

## How it fits together

```
iPhone Share → Shortcut ─┐
                         ├─► /api/save ─► Supabase (database + image storage)
Web app "+ Save" ────────┘        │
                                  └─ in the background: read link preview → save thumbnail
                                     → Claude tags it → shows up in your grid
```

Built with Next.js (web app + API), Supabase (Postgres + storage) and the Claude API.

## Setup

You'll need free accounts at **Supabase**, **Vercel** and the **Anthropic Console**.

1. **Supabase**: create a project. Open **SQL Editor**, paste in all of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it. This creates
   the tables and a private `media` storage bucket.
   Then in **Project Settings → API**, copy the **Project URL** and the **service_role** key.
2. **Anthropic**: create an API key at console.anthropic.com.
3. **Vercel**: *Add New → Project*, import this GitHub repo, and add these environment variables
   (see [`.env.example`](.env.example)):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `ANTHROPIC_API_KEY` | your Anthropic key |
   | `APP_PASSWORD` | the password you'll use to open the app |
   | `SAVE_TOKEN` | a long random string for the Shortcut (e.g. from a password generator) |

   Deploy. Open the site, sign in with your password, and in Safari tap **Share → Add to Home Screen**.
4. **iPhone Shortcut**: follow [`docs/iphone-shortcut.md`](docs/iphone-shortcut.md).

### Costs
Supabase and Vercel free tiers are plenty for personal use. Tagging uses Claude Opus 5.5 by default,
which costs roughly 1–2¢ per saved item. To make it cheaper, set `CLAUDE_MODEL=claude-sonnet-5-5`
(about half the price).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
npm test                     # unit tests
npm run lint && npm run typecheck
```

## Ideas for next steps
- "Vibe" search using embeddings (e.g. "cosy autumn dinners")
- Send a recipe to a Notion recipe hub
- Transcribe what's said in TikTok videos
- Browser extension for saving from a laptop

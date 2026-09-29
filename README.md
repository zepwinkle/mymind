# mymind

A personal, AI-organised library for things you save: TikToks, Instagram posts, Pins, web pages,
screenshots and notes, inspired by the mymind app.

- **Save from anywhere**: an iPhone Share-menu Shortcut, or the **+ Save** button (link, image, note).
- **Thumbnails**: pulled from each link's preview and copied into your own private storage, because platform
  image links expire. When a site needs a login (often Instagram), attach a screenshot instead.
- **AI tagging**: Claude looks at the image and caption (and your note) and writes a title, category,
  tags and summary. For recipes it also pulls out the ingredients and steps.
- **Search**: across titles, tags, captions, notes and text in images. Partial words work ("chick" finds chicken).
- **Groups**: *hand-picked* groups you add items to yourself, and *automatic* groups that fill
  themselves from a filter (e.g. every Recipe, or everything tagged "pasta").
- **Your notes** on every item, and you can edit anything the AI got wrong.

## How it fits together

Everything runs on **Netlify**:

```
iPhone Share → Shortcut ─┐
                         ├─► /api/save ─► Netlify Database (items, tags, groups)
Web app "+ Save" ────────┘        │       Netlify Blobs (thumbnails & screenshots, private)
                                  │
                                  └─ in the background: read link preview → save thumbnail
                                     → Claude tags it → shows up in your grid
```

Built with Next.js (web app + API) and the Claude API. The database schema lives in
[`netlify/database/migrations/`](netlify/database/migrations), and Netlify applies it automatically on every deploy.

## Setup

You need a **Netlify** account and an **Anthropic Console** account (for the AI tagging).

1. **Anthropic**: at console.anthropic.com, add some credit and create an API key.
2. **Netlify**: *Add new project → Import an existing project*, pick this GitHub repo, and keep the
   detected settings. Before the first deploy (or straight after), go to **Project configuration →
   Environment variables** and add:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your Anthropic key |
   | `APP_PASSWORD` | the password you'll use to open the app |
   | `SAVE_TOKEN` | a long random string for the Shortcut (e.g. from a password generator) |

   Then **Deploys → Trigger deploy**. Settings only take effect after a new deploy.
   The database and image storage are created automatically on the first deploy, with no setup needed.
3. Open your site, sign in with your password, and in Safari tap **Share → Add to Home Screen**.
4. **iPhone Shortcut**: follow [`docs/iphone-shortcut.md`](docs/iphone-shortcut.md).

> Netlify Database needs a Netlify account on a **credit-based plan** (all new accounts are).
> If the first deploy says the database feature isn't available for your account, your account is on
> an older plan. Switch plans under Team settings → Billing.

### Costs
Everything runs on Netlify credits. On the free plan the monthly allowance is shared by:
- **Production deploys**: 15 credits each, the biggest cost. Batch changes into fewer deploys.
- **AI tagging**: through Netlify's AI Gateway, so no Anthropic key is needed. The default
  model is Claude Opus 5.5 (about 2.5–3 credits per save). On the free plan, set
  `CLAUDE_MODEL` = `claude-sonnet-5-5` to roughly halve that; tag quality stays very good.
  To pay Anthropic directly instead of using Netlify credits, set your own `ANTHROPIC_API_KEY`.
- Hosting, database and bandwidth, which are small for personal use.

## Local development

```bash
npm install
npm install -g netlify-cli
netlify link                          # connect to your Netlify site
netlify dev                           # runs the app with a local database + blob storage
netlify database migrations apply     # first time only: create the tables locally
npm test                              # unit tests
npm run lint && npm run typecheck
```

## Ideas for next steps
- "Vibe" search using embeddings (e.g. "cosy autumn dinners")
- Send a recipe to a Notion recipe hub
- Transcribe what's said in TikTok videos
- Browser extension for saving from a laptop

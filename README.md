# Nutrition Tracker

Personal nutrition tracker for one user. Photograph food, Claude (`claude-fable-5`) estimates items and portions, every item passes human review (accept / edit / remove), totals track against daily targets, and corrections feed a prompt-side calibration loop. Mobile-first PWA on Vercel, tuned for an iPhone Pro Max.

## Local run

Requirements: Node 20+, a Postgres database (Neon works; so does local Postgres).

1. Clone the repo.
2. `cp .env.example .env.local` and fill in every value (see the comments in `.env.example`; `DATABASE_URL_UNPOOLED` matters for schema pushes).
3. `npm install`
4. `npm run db:push` (creates the 4 tables; uses the unpooled URL)
5. `npm run seed` (targets plus 3 example meals and 2 planned dinners; idempotent, never truncates)
6. `npm run dev` and open http://localhost:3000, then sign in with your `APP_PASSWORD`.

### Phone loop on your LAN

```
npm run dev -- --hostname 0.0.0.0
```

Then open `http://<your-mac-ip>:3000` on the phone (same Wi-Fi). The auth cookie is non-secure outside production, so plain HTTP works on the LAN. Do the real PWA install against the production deploy, not the LAN.

## Vercel handover

1. Push this repo to GitHub and **import it into Vercel** (Add New > Project). The first build without env vars is expected to fail or produce a broken deploy; it gets replaced in step 4.
2. In the project's **Storage tab**:
   - **Create a Neon Postgres database** and connect it to the project. This injects `DATABASE_URL` (pooled) plus the unpooled URLs automatically.
   - **Create a Blob store** and connect it. This injects `BLOB_READ_WRITE_TOKEN`.
3. In **Settings > Environment Variables**, add:
   - `ANTHROPIC_API_KEY` (an Anthropic API key; the org must have default 30-day retention, see troubleshooting)
   - `APP_PASSWORD` (the single shared password; pick a long one)
4. **Redeploy** (Deployments > latest > Redeploy) so the build picks up the env vars.
5. Locally, pull the connected env and set up the database:
   ```
   npx vercel link        # if not already linked
   npx vercel env pull .env.local
   npm run db:push
   npm run seed
   ```
6. Open the production URL on the phone, sign in, and **Add to Home Screen** (Share > Add to Home Screen) for the standalone app.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run lint` | Production build / ESLint |
| `npm run db:push` | Push the Drizzle schema (prefers `DATABASE_URL_UNPOOLED`) |
| `npm run seed` | Idempotent seed: targets, 3 logged meals, 2 planned dinners |
| `npm run icons` | Re-rasterise `public/icon.svg` into the PWA icon set |

## Notes

- The Insights tab answers "did I hit my goals today": direction-aware bars with a target tick per nutrient (calories, carbs, fat and sugar are limits; protein and fibre are minimums), week dots, a 4 week grid, goal hit rates over fully-logged days, a logging streak and a 30 day calorie trend with a 7 day rolling average. Sugar tracks total sugars (label figure) against the UK 90g reference intake, editable in Settings.

- The seeded example meals include corrections (an edited rice portion, an edited bread weight, a removed butter item) so the calibration loop has data on day one. They are written as generically true UK portion facts; deleting the example meals removes their influence on calibration.
- All totals compute from reviewed `final_*` values only; planned dinners never count until you convert them via review.
- Export (Settings) produces one CSV with three labelled sections: meals x items, targets, calibration notes.
- "Update calibration" writes rules only when repeated corrections support a clear pattern; with only a handful of one-off corrections it will honestly report "No clear patterns found" and keep existing rules.

## Troubleshooting

- **Every Claude request fails with a 400**: `claude-fable-5` requires the organisation's data retention to be at the 30-day default. Zero-data-retention orgs cannot use it; check the retention setting in the Anthropic Console.
- **"Claude could not analyse this photo"**: the model refused, usually because the photo shows more than food (people, documents). Retake with just the plate in frame, or use "Enter by hand".
- **First query of the day is slow**: Neon scales to zero; the first connection cold-starts the database. Subsequent requests are fast.
- **`db:push` fails with prepared-statement or DDL errors**: you are pushing through the pooled URL. Set `DATABASE_URL_UNPOOLED` (or `POSTGRES_URL_NON_POOLING`) in `.env.local`; `vercel env pull` includes it when Neon is connected.
- **Analysis times out on the phone**: mobile Safari aborts fetches around 60s; the app already caps at 55s and shows a retry card. Live timings on this setup: text analyse ~15s, image analyse ~7s, distil ~10s.

## On-device checklist (needs the physical iPhone)

Deferred verification that cannot run from a build machine:

1. Camera capture: the + button > Take a photo opens the camera directly and the downscaled upload completes on mobile data.
2. Add to Home Screen from the production deploy; app launches standalone (no Safari chrome) with the correct icon.
3. Airplane mode: launching the installed app shows the styled offline page; going back online recovers.
4. Safe areas: tab bar and capture button clear the home indicator; the date header clears the notch.
5. Live analyse: photograph a real meal and confirm items, portions and the review flow end to end.
6. Spreadsheet import from the Files app (.xlsx and .csv) previews and commits.

# CLAUDE.md

## What this is

Personal nutrition tracker for one user (Andrew). Mobile-first PWA deployed on Vercel. He photographs food, Claude estimates the items and approximate portions, he reviews each item with thumbs up or down, and it logs to daily and weekly trackers against his targets. He can also import a spreadsheet of planned evening meals. Single user, single deploy. No multi-tenancy, no marketing pages, no analytics.

## Product rules (non-negotiable)

1. No AI estimate is ever saved without human review. The review screen lists every suggested item with name, portion and macros. Each item gets: thumbs up (accept), edit (adjust grams or values), or remove.  
2. Every verdict is stored and used to calibrate future prompts (see Feedback loop). This is prompt-side calibration, not model training. Never claim the model "learns" in UI copy; say "calibrated to you".  
3. UI copy: British English (fibre, analyse), percentages as numerals, no em dashes or en dashes.  
4. Mobile-first, one-handed use. The primary action is one big camera button.  
5. All app data lives server-side in Postgres. Never use localStorage for app data.

## Stack (You decide)

- Next.js (App Router), TypeScript strict, Tailwind  
- Drizzle ORM with Postgres (Neon via the Vercel Marketplace)  
- Vercel Blob for photo storage  
- Anthropic API for all estimation, model: Fable-5 
- Recharts for charts, SheetJS (xlsx) for spreadsheet parsing, zod for validation  
- Auth: single shared password from APP\_PASSWORD, checked in middleware, sets an httpOnly cookie. No auth provider.

## Environment variables

ANTHROPIC\_API\_KEY, DATABASE\_URL, BLOB\_READ\_WRITE\_TOKEN, APP\_PASSWORD. Provide .env.example. Fail at boot with a clear message naming any missing variable.

## Data model (Drizzle)

- meals: id, date, slot (breakfast | lunch | dinner | snack), name, source (photo | spreadsheet | manual), status (logged | planned), photo\_url, notes, created\_at  
- meal\_items: id, meal\_id, name, ai\_portion\_desc, ai\_grams, ai\_kcal, ai\_protein\_g, ai\_carbs\_g, ai\_fat\_g, ai\_fibre\_g, ai\_confidence, verdict (up | edited | removed), final\_grams, final\_kcal, final\_protein\_g, final\_carbs\_g, final\_fat\_g, final\_fibre\_g  
- targets: single row: kcal, protein\_g, carbs\_g, fat\_g, fibre\_g. Editable in settings. Seed: 2250 kcal, 140 protein, 230 carbs, 75 fat, 30 fibre.  
- calibration\_notes: id, note, active, created\_at

All totals and charts compute from final\_\* values only. On thumbs up, final\_\* copies ai\_\*.

## AI endpoints

### POST /api/analyse

Accepts either an image URL (photo already uploaded to Blob) or a text description of a meal. One Claude call per request containing:

1. System prompt: expert nutrition estimator, assume UK portion sizes and UK supermarket brands, return JSON only, no prose, no code fences.  
2. The active calibration\_notes (max 10).  
3. Up to 10 past corrected meal\_items with roughly matching names (simple ILIKE), formatted as "AI estimated X, Andrew corrected to Y".

Response schema: { "meal\_name": string, "items": \[{ "name": string, "portion\_desc": string, "grams": int, "kcal": int, "protein\_g": number, "carbs\_g": number, "fat\_g": number, "fibre\_g": number, "confidence": number 0 to 1 }\], "notes": string } Parse defensively: strip stray fences, validate with zod, retry once on invalid JSON, surface a friendly error after that.

### POST /api/distil

The feedback loop. Pulls the last 50 meal\_items with verdict edited or removed, asks Claude to write up to 10 short calibration rules (example: "Rice portions run about 250g cooked, not 180g"), and replaces the active calibration\_notes. Triggered by an "Update calibration" button in settings. Settings also lists current rules with the ability to delete any.

## Features

1. Capture: big \+ button opens the camera (input with capture="environment") or gallery. Upload to Blob, then analyse. Also a text quick-add box using the same endpoint.  
2. Review screen: the human evaluation step. Item list with thumbs up, edit, remove. Portion edit is a grams stepper; macros scale linearly with grams unless individually overridden. Save writes the meal and items in one transaction.  
3. Spreadsheet import: accepts .csv or .xlsx of planned evening meals. Columns are flexible; detect a date column and a meal name column, kcal and macros optional. Show a preview table, estimate missing values through /api/analyse in text mode, save rows as status planned dinners on their dates. One tap converts planned to logged, with the option to re-analyse from a fresh photo.  
4. Today view: kcal ring vs target, macro bars, list of today's meals.  
5. Week view: 7-day kcal trend with target line, average macro split, planned vs actual for dinners.  
6. Settings: targets, calibration rules, CSV export of all data.

## PWA

Manifest, icons, installable, standalone display. No offline sync in v1; show a friendly offline message.

## Conventions

- Route handlers or server actions only; no secrets client-side  
- zod validation at every boundary  
- Small components, colocated by route  
- Seed script creates targets, 3 example logged meals and 2 planned dinners so no screen is ever empty  
- Scripts: dev, build, lint, db:push, seed

## Definition of done

- npm run build and npm run lint pass clean  
- Fresh clone, .env.local, db:push, seed, dev gives a fully working app  
- README.md covers local run plus the exact Vercel handover: import the GitHub repo, create Neon Postgres and a Blob store from the Vercel dashboard Storage tab and connect both to the project, add ANTHROPIC\_API\_KEY and APP\_PASSWORD, redeploy, run db:push  
- ASSUMPTIONS.md lists every call you made without asking
- An app that I can have on my phone locally, build for dimensions of a pro max iphone. 


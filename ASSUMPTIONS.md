# ASSUMPTIONS

Every call made without asking, grouped by area.

## Build environment

- The app was first built in a cloud session (no `.env.local`, no egress to Neon/Blob/Anthropic; verified against local Postgres with the AI and Blob routes exercised structurally), then recreated file-for-file on this Mac where the populated `.env.local` lives. On this machine the previously untestable pieces were verified live: schema push and seed against the real Neon database, a real Blob upload, analyse text mode (~15s, valid schema, and the seeded rice correction visibly applied in the result), analyse image mode (~7s; a blank photo correctly returns zero items, which the client maps to its "no food found" card), and distil (~10s; with only 3 one-off seed corrections it correctly reported no clear patterns and kept existing rules).
- SheetJS is installed from the official CDN tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) as the plan specified; the npm registry `xlsx` package is abandoned at 0.18.5 with known vulnerabilities.
- `create-next-app` produced Next.js 16.3.0, so the auth gate lives in `src/proxy.ts` (Next 16 renamed middleware to proxy; identical matcher semantics).

## Settled defaults

- Europe/London defines "today"; dates are stored as `YYYY-MM-DD` strings; one photo per meal.
- Slots are breakfast, lunch, dinner, snack and drink; "dinner" is stored in the database but displayed as "Tea" everywhere (Andrew's vocabulary, matching his meal-plan sheet). Labels live in src/lib/slots.ts. The whole Today screen swipes between days (left = next, right = previous): the page follows the finger once horizontal intent is clear (touch-action pan-y keeps vertical scrolling native), springs back below a 70px commit threshold, and on commit the old day slides out while the new one slides in from the matching side.
- Week runs Monday to Sunday; both Today and Week page backwards and forwards.
- Dark mode follows the system (`prefers-color-scheme`); no in-app toggle.
- Layout tuned at 430x932 (iPhone Pro Max) with safe-area padding; usable on any phone width.

## Review and the rule 1 gate

- Conversion mode (logging a planned meal) resets every item verdict to unreviewed client-side, so the Save gate applies exactly as for a fresh analysis; the DB placeholder verdict `up` from import is never trusted as a real review. Ordinary edit of a logged meal carries verdicts over.
- Server-enforced invariants (`resolveFinals`): `up` copies `ai_*` to `final_*` and is rejected when `ai_kcal` is NULL; `edited` requires grams and kcal; `removed` nulls finals but keeps the row. Client-sent finals are never trusted for `up` or `removed`.
- Saving a meal that stays `planned` ("Save plan") skips `resolveFinals` and stores placeholder verdicts and finals as sent. Rationale: the verdict gate exists to protect logged data; planned meals never count in totals, and conversion re-collects real verdicts. Without this, imported rows lacking an estimate could never be edited while planned.
- Removed items stay in the save payload and the DB (calibration data). On update, DB rows with verdict `removed` that the client did not send are re-inserted unchanged so calibration history cannot be lost by the client.
- A manual item (typed name, grams and values) is saved as verdict `edited` with `ai_*` NULL: the human supplied the numbers, so nothing needed accepting.
- "Estimate macros" on an added item uses analyse text mode and still requires a verdict.
- Item names are editable directly on the review card. The item editor offers "Suggest values from name" with an optional Small, Medium or Large size (asked because cup and portion size drives drink calories): it re-runs analyse text mode on the renamed item and replaces the item's AI estimate and finals, so Accept, gram scaling and calibration behave exactly as for a fresh analysis. The analyse prompt also instructs that prepared drinks and dishes are named as themselves (a latte, not espresso plus foamed milk).
- Confidence is surfaced only as a "Low confidence" badge below 0.6; raw scores are never shown.
- When the last non-removed item is removed, Save is replaced by "All items removed. Delete the meal instead?".

## Calibration loop

- Calibration queries require `verdict IN ('edited','removed') AND ai_kcal IS NOT NULL AND ai_confidence IS NOT NULL`, so manual items and spreadsheet-supplied numbers (which leave `ai_confidence` NULL) never feed calibration. "Last 50" therefore means the last 50 AI-estimated corrections.
- Image mode cannot ILIKE-match item names before the photo is analysed, and CLAUDE.md requires one Claude call per request, so image mode falls back to the 10 most recent corrections. Text mode matches words of 4+ characters from the description (deduped, capped at 8) via ILIKE. This is a spec-internal conflict resolved in favour of one call per request.
- Distil deactivates old notes rather than deleting them (history retained); deletes from Settings are hard deletes.
- If distil returns zero rules, existing notes are kept untouched.
- Seeded corrections are crafted as generically true UK portion facts (cooked rice runs ~250g, wholemeal slices run ~40g each) so they cannot mis-calibrate; deleting the example meals removes their influence.

## AI integration

- At Andrew's request (2026-08-10), analyse runs on `claude-haiku-4-5` to cut cost per image by roughly 10x per token, and distil moved from Fable 5 to `claude-opus-5` ahead of his Max subscription lapsing (Opus 5 is a drop-in at half Fable's price: thinking on by default, same fallback beta, no 30-day retention requirement). This supersedes the spec's Fable-for-all-estimation line; both models are single constants in src/lib/ai/client.ts.
- Distil model `claude-opus-5` via `client.beta.messages.create` with `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`, `max_tokens: 16000`; `thinking` is never passed (always on; explicit disable is a 400) and neither are temperature or top_p. Analyse runs at effort low, distil at effort medium, both with structured output JSON schemas (no numeric bounds; zod enforces ranges after).
- `stop_reason` is branched on every call: refusal arrives as HTTP 200 and maps to a friendly in-flow error; truncation likewise.
- Auto-retry happens once and only on a cheap parse/zod failure; refusal or API errors return immediately so the user's "Try again" is the second model call (avoids stacking two thinking calls against mobile Safari's ~60s fetch abort). Client fetches for analyse/distil carry a 55s AbortController deadline.
- An analysis returning zero items is treated as failure client-side with its own message.
- `maxDuration = 300` on both AI routes assumes Vercel Fluid compute.

## Data and API

- Totals sum `final_*` where `status='logged' AND verdict <> 'removed'`; planned meals appear only in the planned-vs-actual comparison.
- Text quick-add saves `source:'manual'`, photo meals `'photo'`, imported dinners `'spreadsheet'`. Re-analysing a planned meal from a fresh photo updates source to `'photo'` (UpdateMeal.source is optional and only sent then).
- Export is one CSV with three labelled sections (meals x items flat rows including meal_created_at, targets, calibration notes), UTF-8 BOM, CRLF, RFC 4180 quoting. Text cells beginning with a formula trigger character (=, +, -, @) are defused with a leading apostrophe because imported and AI-written names are untrusted and the file targets Excel.
- Blob photos are public-but-unguessable (random suffix); orphaned photos are kept in v1 (deleting a meal does not delete its Blob).
- The auth cookie is hex(HMAC-SHA256(key=APP_PASSWORD, msg constant)): deterministic and stateless, so rotating the password signs out every device. 180-day maxAge, httpOnly, sameSite lax, `secure` in production only (so LAN HTTP phone testing works).
- Login sleeps 750ms on a wrong password.

## Import

- Preview renders as stacked rows for one-handed use, not a wide table.
- Weekly-grid sheets (weekday names across the header, meal slots down the side, dinners in a row labelled Tea, Dinner, Supper or Evening) are auto-detected and transposed: each weekday column resolves to its next upcoming date starting from today, later columns always advance, and a trailing repeat weekday lands the following week. Empty cells are skipped; Breakfast and Lunch rows are ignored because the import creates planned dinners. The resolved dates are shown in the preview for checking before commit.
- Date parsing: JS Dates (SheetJS `cellDates`), Excel serials (epoch arithmetic, equivalent to `SSF.parse_date_code`), `dd/mm/yyyy` with UK day-first priority, and ISO. Month-first is used only when day-first is impossible.
- Duplicate dates keep the last row by default, flagged and toggleable; the commit schema rejects duplicates outright.
- Committing replaces only planned dinners on each date; logged meals are never touched.
- Rows whose numbers came from the sheet keep `ai_confidence` NULL; only the estimate step sets it (AI provenance). Estimated rows aggregate the analysis items into one meal item, with confidence = the minimum item confidence.
- Estimate failures stay importable with a "No estimate" chip; those items require full manual entry at log time.

## Repeat meals

- Repeats are templates saved from already-reviewed logged meals (Save as repeat on the meal's edit screen; managed in Settings). Logging one replays the human-approved final values as manual "edited" items in a single tap from the + menu: no AI call is made, so a repeated breakfast costs zero tokens. Replayed items carry no ai_* values, so repeats never feed the calibration loop (the original corrections were counted once, when first reviewed). The review gate is not re-applied because nothing new is estimated; the logged meal stays editable like any other. Items whose grams were unknown replay with 0g so the server's edited-verdict invariant holds.

## Quantities, photo attach and discard learning

- Countable items: the analyser now returns count and a singular unit word ("2 eggs" is count 2, unit "egg") for naturally counted foods, stored as meal_items.unit, ai_count and final_count. The review card gets a "How many?" stepper that scales grams and every unpinned macro linearly from the AI baseline; stepping back to the AI's own count returns the item to unreviewed rather than pretending it was hand edited. The item editor gains one-shot scale chips (x half, x three-quarters, x1.5, x2) relative to the AI portion; tapping the active chip again returns to x1. No custom multiplier field: the grams stepper already covers arbitrary amounts.
- Photo attach: a saved meal without a photo gets an "Add a photo" button in edit mode; the upload happens immediately but the photo is only kept on Save. A meal with a photo gets "Re-analyse from photo" behind an explicit confirm, which sends the meal name and item names as a hint the model must treat as ground truth for identification, using the photo only to size portions. Re-analysis replaces the items with fresh unreviewed ones.
- Discard learning: binning a fresh AI analysis (the close button on a draft review) now asks one optional question, "What was it actually?". The AI's original reading plus the answer is stored in a new discarded_analyses table and fed to distil (last 15), which is prompted to write identification rules from repeated misreadings. A skipped note still records the rejection, formatted as "binned without saying what it was". With a note given, one tap relaunches analysis from the description and the resulting meal keeps the original photo. Closing an edit or conversion review keeps the old plain "Discard changes?" confirm, and nothing is recorded.
- Discarded analyses are exported as a fourth CSV section, and each records whether a photo or a typed description was binned so distil never blames the camera for a misread description. Snapping a fresh photo for a planned Tea counts as a binnable analysis too; re-opened saved meals never do. Re-analysing a saved meal demotes its replaced AI-estimated corrections to removed history rows instead of deleting them, so past learning survives. The count stepper always lands on whole counts even after a grams tweak leaves a fractional one, and stepping back to the AI's count restores the full AI baseline.

## Home screen

- The app opens on a calm Home screen at /, with the full diary moved to /today (all diary links, swipes and post-save redirects follow it; the tab bar gains a Home tab). Built from a research pass over nutrition and wellbeing app landing screens; key rules adopted: the camera button is the single loud element and stays one tap from open (MyFitnessPal's card-feed home regression motivated this), no raw numbers render on Home (the day glance is fill shapes only, whole card links to Today), tonight's planned Tea gets its own card with Log it and Snap it instead, a recent-meals photo strip shows the last 8 photographed meals (hidden when none), and a weekly consistency line counts only days logged, never misses (nothing renders at zero). All Home copy is descriptive, never evaluative, and next-day compensation framing is banned. The Home CTAs deep-link into the existing capture launcher (?capture=sheet opens the action sheet, ?capture=repeat the repeats list). Deferred to v2: a Settings toggle to hide the day glance, and the weekly memory card in the photo strip.

## Insights and sugar tracking

- Sugar was added end to end (estimation schema, review, targets, import, export) to power the Insights tab. It tracks TOTAL sugars, the label's "of which sugars" figure, with a default ceiling of 90g (the UK label reference intake). The NHS 30g a day figure is for free sugars, which labels do not declare separately and Claude cannot reliably distinguish; the Settings caption explains the difference. Meal items logged before the sugar column existed have NULL sugar and count as 0 in totals.
- Goals are direction-aware (src/lib/goals.ts), tuned by Andrew: calories, carbs and fat are bands with a green zone of 90 to 105% of target (near-miss from 75% under to 125% over, off beyond); sugar is a pure ceiling (green at or under 105% of the limit); protein and fibre are floors from 90% with no upper penalty. An overrun of 25% or more past a limit or budget renders red. A day scores only when it has 2 or more logged meals and at least 50% of the calorie target, so a barely-logged day is never a green tick or a miss; the headline on-track verdict uses calories and protein only, with the other goals shown as a hit count.
- Insights copy is adherence-neutral with one exception at Andrew's request: an overrun of 25% or more past a limit renders red (segment and label); smaller overruns stay amber. Overruns are stated as facts ("12g over the limit") and every rate prints its denominator over scored days only. The streak counts logged days, not goals hit, and totals are computed over the fetched 5 week window (a longer history would need a wider query, noted as v2).
- The day boundary for scoring is the meal's stored date, which the user picks at capture; no 3am boundary shifting is applied because meals are bucketed explicitly, not by timestamp.
- These design choices follow a research pass over MacroFactor, Cronometer, Lose It, MyFitnessPal and Apple Health patterns (direction-aware bars with a target tick, amber-never-red overruns, honest in-progress denominators, adherence-neutral trend framing with a 7 day rolling average).

## Apple Health sync

- Metric set was reviewed with Andrew: steps, active energy, resting energy, exercise minutes, resting heart rate, body weight and individual workouts are ingested; distance, flights, heart rate detail and sleep were ruled out as noise for a nutrition tracker. Resting energy is taken alongside active so "burned" can be shown honestly as a total rather than the active slice alone.
- Apple Health has no cloud API, so data is pushed from the phone by a Shortcuts automation (docs/APPLE-HEALTH.md) to POST /api/activity/ingest. The route is bearer-authed with APP_PASSWORD (Shortcuts cannot hold the session cookie) and exempted from cookie auth in the proxy matcher; no new environment variable was added.
- Every metric is nullable end to end at Andrew's request ("make sure the app doesn't break if it doesn't have all the data"): Watch-less days send steps alone, cards render only the fields present, and a day with no data renders no Activity card at all. Ingest merges rather than replaces (COALESCE per column), so a null never overwrites a stored value and re-runs are idempotent; the workouts array replaces per date, with an absent key leaving stored workouts untouched. The flip side is documented: a wrong non-null value is corrected by re-pushing, not clearable to blank over the API.
- Numbers are coerced from text and blanks are treated as missing, because Shortcuts renders absent samples as empty strings. Values are rounded server-side (weight to 0.1 kg).
- Weight is expected roughly monthly, so it appears as a dated reading (Today card and latest-in-week line), not a trend chart; a Settings toggle (targets.show_weight) hides it everywhere. Copy stays descriptive: "Ate X kcal, burned Y kcal" with no earned-calories or compensation framing, matching the Home screen rules.
- Individual workouts come from the Workout app via Find Workouts in the same shortcut: type, duration, active kcal and start time, listed on the day's Activity card and counted on the Week card. daily_activity and workouts are exported as fifth and sixth CSV sections.

## UI and PWA

- Hand-rolled SVG kcal ring and macro bars; Recharts only for the week chart (client leaf, renders after mount).
- Hand-written ~40 line service worker: pre-caches `/offline`, network-first navigations. `/offline` is fully self-contained (inline styles) so it renders styled from cache alone.
- Week averages are taken over days with at least 1 logged meal; macro split uses energy shares at 4/4/9 kcal per gram with fibre shown as grams.
- Capture drafts live in React memory only (no localStorage, per product rule 5); abandoning a draft costs at most an orphaned Blob upload.
- A second optional photo of the packaging nutrition label can be added on the slot picker for anything packaged (cereal boxes, ready meals, meat packs). Both photos go to the model in one analyse call with an instruction to work out whether the label is per 100g, per portion or per pack and scale to what the meal photo actually shows. A failed label upload degrades gracefully to a single-photo analysis.
- Photos are downscaled client-side (longest edge 1600px, JPEG 0.8) before a background Blob client upload during slot picking; an undecodable photo (e.g. HEIC on a browser that cannot read it) gets a dedicated error card and is never uploaded raw.
- The planned dinner camera icon deep-links to `/?date=<date>&capture=photo&slot=dinner&convert=<mealId>`: the capture flow opens with Dinner pre-selected (the slot picker is still shown), and the resulting review is a conversion of that planned meal, so Save issues a PUT that logs the plan with source updated to photo, rather than creating a duplicate meal. The deep link fires per navigation (cancelling strips the query params so a repeat tap works), and it opens the action sheet as well as attempting the camera directly, since some browsers block a programmatic camera open outside a user gesture.
- "Enter by hand" from an error card never infers the slot: if no slot was picked before the error, it routes through the slot picker (button reads Continue) before opening the empty review.

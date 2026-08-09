# Implementation Plan: Nutrition Tracker (full app, one session)

## Context

Single-user mobile-first PWA on Vercel for Andrew: photograph food, Claude (`claude-fable-5`) estimates items and portions, every item passes human review (thumbs up / edit / remove), totals track against daily targets, and corrections feed a prompt-side calibration loop. The repo is greenfield: only CLAUDE.md (authoritative spec), a fully populated `.env.local` (all 4 required vars plus unpooled Neon URLs), and a linked Vercel project. The entire app is built in this session.

This plan was drafted by three parallel design agents (data/API, UI/UX, build sequencing), merged, then adversarially reviewed against CLAUDE.md, technical feasibility, and the product decisions below; all confirmed findings (3 blockers, 6 majors, ~20 minors) are folded in.

## Settled product decisions (from Andrew — do not re-litigate)

1. **Slot picker always shown** before analysis (photo and text paths), never inferred from clock or AI. Even pre-filled paths (planned dinner camera icon) still render the picker with the slot pre-selected.
2. **Full back-logging**: Today view has date arrows; any past day can be viewed and added to with the date pre-set. Planned dinners on past dates still show their card and convert normally.
3. **Logged meals fully editable/deletable**: tapping a meal reopens the review screen; post-save edits become corrections (`verdict='edited'`) feeding calibration.
4. **Week = Monday to Sunday**, arrows page both back and forward (forward shows future planned dinners).

Settled defaults: Europe/London for "today"; dates stored as `YYYY-MM-DD` strings; one photo per meal.

**Rule 1 reconciliation** ("no AI estimate saved without review" vs "one tap converts planned to logged"): tapping **Log it** opens the review screen pre-filled; Save completes conversion. When a meal opens in **conversion mode** (status `planned` → logging), all item verdicts are **reset to unreviewed client-side** so the Save gate applies exactly as for a fresh analysis — the DB placeholder `up` is never trusted as "Andrew agreed". Ordinary edit of already-logged meals keeps verdict carry-over.

## Stack & scaffold

- Next.js App Router, TypeScript strict, **Tailwind v4** (CSS-first `@theme`, no config file), `--src-dir`, alias `@/*`, ESLint flat config as scaffolded.
- Scaffold: `create-next-app` refuses non-empty dirs → scaffold into `_scaffold/` with `--skip-install`, `rsync -a` into root (excluding `.git`), merge `.gitignore` (`node_modules`, `.next`, `.env*`, `.vercel`, `!.env.example`), delete `_scaffold`, install once.
- **Next major**: scaffold `@latest`; write all pages/handlers with `await params` / `await searchParams` (valid on 15 and 16). At the phase 1 checkpoint record the scaffolded major and use the matching auth-file name (`src/middleware.ts` on 15, `src/proxy.ts` on 16 — identical matcher semantics).
- `next.config.ts`: add `serverExternalPackages: ["pg"]` (avoids the `cloudflare:sockets` bundling build failure; harmless if already external).

| Dependency | Purpose |
|---|---|
| `drizzle-orm` + `pg` (node-postgres) | Real interactive transactions (meal+items save, distil replace). Pooled `DATABASE_URL` at runtime; unpooled for migrations |
| `@vercel/functions` | `attachDatabasePool(pool)` for Fluid compute |
| `@vercel/blob` | client upload + server `handleUpload` |
| `@anthropic-ai/sdk` | Claude |
| `zod`, `recharts` | validation; week charts |
| `xlsx` from SheetJS CDN tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) | npm registry copy is abandoned/vulnerable |
| `dotenv` | `drizzle.config.ts` env loading |
| dev: `drizzle-kit`, `tsx`, `sharp` | push; scripts; icon rasterisation |

No date library — `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' })` + string math in `src/lib/dates.ts`.

Scripts: `dev`, `build`, `lint`, `db:push` (drizzle-kit push), `seed` (`tsx --env-file=.env.local scripts/seed.ts`), `icons`.

## File tree

```
/  .env.example  drizzle.config.ts  README.md  ASSUMPTIONS.md
  public/ sw.js  icon.svg  icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
  scripts/ seed.ts  icons.ts
  src/
    middleware.ts (or proxy.ts)     # cookie auth gate (edge)
    instrumentation.ts              # boot env check (skipped when NEXT_PHASE=phase-production-build)
    db/ schema.ts  index.ts         # 4 tables + 4 pgEnums; pg.Pool singleton on globalThis + attachDatabasePool
    lib/
      env.ts auth.ts dates.ts schemas.ts totals.ts queries.ts calibration.ts csv.ts
      ai/ client.ts prompts.ts jsonSchemas.ts analyse.ts distil.ts
      import/ detect.ts             # client-safe column detection + UK date normalisation
    app/
      layout.tsx globals.css manifest.ts
      offline/page.tsx              # self-contained: inline <style>, zero client JS (SW pre-caches it)
      login/ page.tsx login-form.tsx
      api/ login logout upload analyse distil meals meals/[id] targets calibration/[id] import/commit export  (route.ts each)
      (app)/                        # authed group — layout exports dynamic = "force-dynamic"
        layout.tsx                  # AppShell: TabBar + CaptureLauncher overlay + OfflineBanner
        page.tsx                    # Today at "/" (?date=)
        _today/ date-header kcal-ring macro-bars slot-group meal-card planned-dinner-card
        meal/[id]/page.tsx          # ReviewScreen in edit or conversion mode
        week/ page.tsx week-pager kcal-trend-chart macro-split-card planned-vs-actual
        settings/ page.tsx targets-form calibration-card export-button sign-out-button
        import/ page.tsx file-step mapping-chips preview-list estimate-step confirm-footer
        _components/ tab-bar offline-banner
          capture/ capture-launcher action-sheet photo-preview text-quick-add slot-picker analysing-card error-card
          review/ review-screen review-header item-card item-editor grams-stepper macro-field removed-item-row add-item-card review-footer
          ui/ sheet button chip stepper skeleton toast
```

## Database schema (`src/db/schema.ts`)

```ts
export const slotEnum    = pgEnum("slot",    ["breakfast", "lunch", "dinner", "snack"]);
export const sourceEnum  = pgEnum("source",  ["photo", "spreadsheet", "manual"]);
export const statusEnum  = pgEnum("status",  ["logged", "planned"]);
export const verdictEnum = pgEnum("verdict", ["up", "edited", "removed"]);

meals:      id serial PK · date date(mode:"string") NN · slot NN · name text NN · source NN ·
            status NN default "logged" · photo_url text · notes text ·
            created_at timestamptz NN defaultNow  — indexes (date), (date,status)
meal_items: id serial PK · meal_id FK → meals.id onDelete cascade NN · name text NN ·
            ai_portion_desc text · ai_grams int · ai_kcal int · ai_protein_g/carbs/fat/fibre real ·
            ai_confidence real · verdict NN ·
            final_grams int · final_kcal int · final_protein_g/carbs/fat/fibre real
            — indexes (meal_id), (verdict)
targets:    id int PK (always 1) · kcal/protein_g/carbs_g/fat_g/fibre_g int NN
calibration_notes: id serial PK · note text NN · active bool NN default true · created_at timestamptz NN
```

- `ai_*` nullable, preserved forever (calibration data). `final_*` NULL when removed. Manual items have `ai_*` NULL.
- **Provenance rule**: `ai_confidence` is populated ONLY when the numbers came from `/api/analyse`. Spreadsheet-supplied macros leave it NULL, so calibration queries (`ai_kcal IS NOT NULL AND ai_confidence IS NOT NULL`) never treat file numbers as AI estimates.
- `drizzle.config.ts`: dotenv `.env.local`; url = `DATABASE_URL_UNPOOLED ?? POSTGRES_URL_NON_POOLING ?? DATABASE_URL`, with a console warning when falling back (pooled URLs break DDL). `.env.example` documents `DATABASE_URL_UNPOOLED` prominently, not as an afterthought.
- Env validation: `lib/env.ts` zod-parses the 4 required vars, cached `getEnv()` naming every missing var; `instrumentation.ts` calls it at boot but **skips when `NEXT_PHASE === "phase-production-build"`** (so repo-import builds without secrets don't die); `db/index.ts` and `ai/client.ts` also call it at module init.

## Auth

- Cookie `nt_auth` = hex(HMAC-SHA256(key `APP_PASSWORD`, msg `"nutrition-tracker-session-v1"`)). Deterministic, stateless; password rotation signs out all devices. `httpOnly; sameSite=lax; maxAge 180d`; `secure` **prod only** (LAN HTTP phone testing works).
- `lib/auth.ts` edge-safe Web Crypto: `deriveToken`, `safeEqual` (compares SHA-256 digests — timing-safe).
- Middleware matcher excludes `login`, `api/login`, `_next/*`, icons, `manifest.webmanifest`, `sw.js`, `offline`. API failures → 401 JSON; pages → redirect `/login`.
- `POST /api/login` (750ms sleep on failure), `POST /api/logout`.

## AI integration

`lib/ai/client.ts`: every call = `client.beta.messages.create` with `model: "claude-fable-5"`, `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`, `max_tokens: 16000`. **Never pass `thinking`** (always on; explicit disable 400s); never `temperature`/`top_p`. Always branch on `stop_reason` (`"refusal"` arrives as HTTP 200; `"max_tokens"` = truncated) before reading content. Typed cast if SDK types lag `fallbacks`/`output_config`. Both AI routes: `export const maxDuration = 300; export const dynamic = "force-dynamic"`.

### POST /api/analyse

- Structured output: `output_config: { effort: "low", format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA } }` — schema is CLAUDE.md's exact response shape (`meal_name`, `items[{name, portion_desc, grams, kcal, protein_g, carbs_g, fat_g, fibre_g, confidence}]`, `notes`), `additionalProperties:false` everywhere, no numeric bounds (unsupported) — zod enforces confidence 0..1 after.
- Messages: image mode `[{type:"image", source:{type:"url", url: blobUrl}}, {type:"text", text:"Estimate the food items and portions in this meal photo."}]`; text mode one text block.
- System prompt (assembled in order): expert nutrition estimator · UK portion sizes and UK supermarket brands · cooked weights in grams · British English food names · confidence 0–1 · JSON only, no prose, no fences. Then "Calibration rules from previous corrections" (active notes, max 10, omit if none). Then "Recent corrections the user made" (max 10), formatted `AI estimated X, Andrew corrected to Y` / `AI suggested X; Andrew removed it entirely`.
- Correction matching (`lib/calibration.ts`): **text mode** — lowercase words ≥ 4 chars from the description, dedupe, cap 8, `verdict IN ('edited','removed') AND ai_kcal IS NOT NULL AND ai_confidence IS NOT NULL AND (name ILIKE ...) ORDER BY id DESC LIMIT 10`. **Image mode** — names unknown pre-call, so fall back to the 10 most recent corrections (same filters, no ILIKE). One Claude call per request preserved; documented in ASSUMPTIONS as a spec-internal conflict.
- Flow: zod body → context → **one call** → `stop_reason` check → strip stray fences → `JSON.parse` → zod safeParse → **auto-retry once only on parse/zod failure** (cheap; per CLAUDE.md "retry once on invalid JSON"). Refusal/truncation returns immediately — the user's "Try again" button is the second model call (avoids two thinking calls stacked in one request vs mobile Safari's ~60s fetch abort). Second failure → `502 { ok:false, error:"Sorry, the analysis did not work. Please try again, or add the meal manually." }`. Nothing persisted.
- **Client side**: analyse/distil fetches wrapped in AbortController with ~55s deadline mapped to the in-flow error cards. Phase 5 checkpoint times the call; >40s p95 at effort low is a red flag.
- `items: []` (valid but empty) is treated as analysis failure client-side: "Claude could not find any food in this photo. Try a clearer shot, or enter the meal by hand."

### POST /api/distil

Last 50 corrections (`verdict IN ('edited','removed') AND ai_kcal IS NOT NULL AND ai_confidence IS NOT NULL ORDER BY id DESC LIMIT 50`, joined to meals). Zero rows → 400 "No corrections yet. Review a few meals first." One call, `effort: "medium"`, schema `{rules: string[]}`; prompt: at most 10 one-sentence, concrete, quantitative British English rules (e.g. "Rice portions run about 250g cooked, not 180g"), only where repeated patterns support them. Zod → `slice(0,10)`. **If rules come back empty: keep existing notes untouched**, return "No clear patterns found in your recent corrections. Existing rules kept." Otherwise one transaction: deactivate all active notes, insert new ones (history retained; Settings deletes are hard deletes).

Retention note: `claude-fable-5` requires 30-day org retention (not ZDR); persistent 400s on every request = retention config. README troubleshooting + ASSUMPTIONS.

## API surface

Reads are server-component queries (`lib/queries.ts`: `getDay` — includes planned meals for ANY date, `getWeek`, `getMeal`, `getTargets`, `getActiveNotes`); HTTP is writes + AI + upload + export. Date/week navigation is URL state (`/?date=`, `/week?start=`); mutations then `router.refresh()`. Envelope `{ok:true,data}` / `{ok:false,error}`; every body zod-parsed.

Key zod (`lib/schemas.ts`): `DateString`, enums, `AnalysisResult` (confidence `.min(0).max(1)`), `AnalyseRequest` (discriminated union image/text), `MealItemInput` (verdict + nullable ai_*/final_*), and:

- `CreateMeal`: date, slot, name, source, status (default "logged"), photo_url?, notes?, items min 1, **superRefine: ≥ 1 item with verdict ≠ 'removed'**.
- `UpdateMeal`: same but **status required, no default** (a partial payload must never silently convert planned→logged), and **source optional** — sent as `'photo'` by the fresh-photo re-analyse path so provenance stays truthful.

Server-enforced verdict invariants (`resolveFinals`, used by create and update — client finals never trusted):
- `up` → server copies `final_* = ai_*`; **rejected when `ai_kcal` IS NULL** (no baseline to accept).
- `edited` → `final_grams` + `final_kcal` required; server stores received finals. Manual items arrive as `edited` with `ai_*` null.
- `removed` → server nulls `final_*`; row still inserted (calibration data).

| Route | Behaviour |
|---|---|
| `POST /api/upload` | Blob `handleUpload` token exchange: `allowedContentTypes: [jpeg,png,webp]`, 10MB, `addRandomSuffix` |
| `POST /api/meals` | one `db.transaction`: insert meal + items via `resolveFinals` |
| `PUT /api/meals/[id]` | one transaction, replace-all items — **but DB rows with verdict `removed` absent from the payload are re-inserted unchanged** (server preserves calibration history; not trusted to the client). Handles edit and planned→logged conversion |
| `DELETE /api/meals/[id]` | items cascade; Blob photo left (v1) |
| `PUT /api/targets` | upsert id=1 |
| `DELETE /api/calibration/[id]` | hard delete |
| `POST /api/import/commit` | see import |
| `GET /api/export` | **all data**: one CSV with labelled sections — meals×items flat rows, blank line, `targets` section, blank line, `calibration_notes` section (each with its own header). UTF-8 BOM, RFC-4180 |

Totals (`lib/totals.ts`, single source of truth): sum `final_*` where `status='logged' AND verdict <> 'removed'`, grouped by date; planned meals only in the dedicated planned-vs-actual comparison.

## Screens

**Shell**: bottom tab bar (Today `/`, Week, Settings; 56pt + safe-area) + floating 64pt **"+" capture button** bottom-centre (thumb zone, product rule 4) on Today and Week. From Week, capture defaults date to today.

**Capture flow** (client overlay, draft in React memory only — rule 5, no localStorage):
0. "+" → action sheet: Take a photo (`capture="environment"`), Choose from library, Type it in, Import spreadsheet, Cancel. Non-today banner when back-logging.
1. Photo: client downscale (canvas, longest edge 1600px, JPEG 0.8 — normalises HEIC, cuts tokens) then **background Blob client upload** during slot pick. **Decode failure → dedicated error card** ("We could not read that photo. Try taking it again.") — no raw-HEIC upload (token would reject it and Claude can't read HEIC anyway). Text: description textarea.
2. **Slot picker — always, both paths**: 2×2 grid + date row + sticky Analyse (waits for upload).
3. Analysing card ("Analysing your meal…" / "Checking portions against UK sizes"), Cancel abandons draft.
4. Review screen.

Error states are in-flow cards (never toasts): upload failed / could-not-analyse (retry) / refusal ("Claude could not analyse this photo. Try a clearer shot of just the food…") / offline / server error — each with Try again / Enter by hand / Cancel. "Enter by hand" opens review with zero items + add-item form open, so model failure never blocks logging.

**Review screen** (shared: new draft, edit mode, conversion mode):
- Header: close (discard confirm) · editable name · slot chip · date chip · photo thumb · model notes caption.
- Item cards: name + "Low confidence" amber badge only when `confidence < 0.6` (no raw scores); verdict bar Accept / Edit / Remove (44pt):
  - Accept: `final = ai`; tap again unsets. **Disabled when `ai_kcal` NULL** (no-estimate items open straight in edit requiring grams + kcal).
  - Edit: grams stepper (step 5g, hold-accelerate, tappable value); macros scale linearly `final = ai × final_grams/ai_grams` until a macro is individually overridden (pin + Reset); collapse sets `edited`.
  - Remove: greyed strikethrough + Undo; **stays in payload as `removed`**.
- Add item: name + grams then Estimate macros (`/api/analyse` text mode; result still needs a verdict) or manual values. Inline error on the card ("Could not estimate that. Try again or enter the values yourself.") — keeps typed values.
- Footer: live totals + **Save, disabled until every item has an explicit verdict** ("Review 2 more items", pulse on tap). No Accept-all. When the last non-removed item is removed: "All items removed. Delete the meal instead?"
- Edit mode (logged meal): verdicts carry over; any change flips item to `edited`; footer adds Delete meal (confirm).
- **Conversion mode (planned meal)**: verdicts reset to unreviewed on open; footer offers **Save plan** (stays planned, no gating — planned never counts in totals), **Log it** (gated conversion, PUT `status:"logged"`), **Delete plan** (confirm).

**Today (`/`, `?date=`)**: sticky date header with arrows + swipe (forward allowed); SVG kcal ring (overflow arc + "over" subline) + 4 macro bars; slot-grouped meal cards (photo, name, kcal + macros, **source line — no clock time**, whole card → `/meal/[id]`); planned dinner card (dashed, "Planned" chip, renders on past dates too) with Log it + camera icon (capture with Dinner pre-selected — slot picker still shown) + body tap → review (planned mode); empty states per spec.

**Week (`/week`, `?start=`)**: Mon–Sun pager (back AND forward; future weeks = dashed placeholders + Planned chips + "No logged days this week"); Recharts BarChart (client leaf, render after mount) with kcal target `ReferenceLine`, tap bar → day; average macro split (energy share % 4/4/9, fibre as grams) over days with ≥ 1 logged meal; planned-vs-actual dinner rows (Logged as planned / Swapped / Not logged / Planned).

**Settings**: targets editor (stepper rows, sticky Save); calibration card "Calibrated to you" — copy: "Claude adjusts its estimates using rules written from your corrections. It is calibrated to you; the model itself does not learn." (no storage claim) — rules list with delete, Update calibration button; import row; Export all data (CSV); sign out.

**Login**: single big password field.

**Visual language**: light + dark via `prefers-color-scheme`, Tailwind v4 `@theme` tokens (zinc surfaces, indigo primary, macro colours protein cyan / carbs amber / fat rose / fibre emerald — never colour-only); system font, `tabular-nums`, 4pt grid, ≥ 44pt targets, 48pt full-width primary buttons, safe-area padding, tuned at 430×932. British English, numerals for percentages, no em/en dashes anywhere.

## Spreadsheet import (`/import`, 3 steps)

Client-side SheetJS parse (instant preview, no multipart); server only re-validates at commit.
1. **Choose file** (`.csv,.xlsx`): `XLSX.read(buf, {cellDates:true})`, first sheet.
2. **Check**: column detection — date by header regex else ≥ 60% parseable values (JS dates, Excel serials via `SSF.parse_date_code`, `dd/mm/yyyy` UK-priority, ISO); name by regex else first texty column; optional kcal/protein/carbs/fat/fibre by regex. Tappable mapping chips to correct guesses. Preview as stacked mobile rows (ASSUMPTIONS: "preview table rendered as stacked rows for one-handed use") with Will-estimate / Check-date / Replaces-existing-plan flags. **Duplicate dates flagged here — "2 rows for Mon 11 Aug, keeping the last", toggleable**; `ImportCommit` superRefines duplicates away.
3. **Estimate & confirm**: rows lacking macros call analyse text mode sequentially ("Estimating 3 of 5…"); failures stay importable with a "No estimate" chip (`ai_*` NULL → full manual entry required at log time). Commit: one transaction; per row delete existing **planned** dinner on that date, insert meal (`slot:'dinner'`, `source:'spreadsheet'`, `status:'planned'`) + one item (`ai_*` from row **with `ai_confidence` NULL unless the estimate step produced it**, placeholder `verdict:'up'`, `final_*=ai_*` — placeholder only; conversion mode re-collects real verdicts).

## PWA

- `app/manifest.ts` (standalone, portrait, icons); `scripts/icons.ts` rasterises `icon.svg` via sharp.
- `public/sw.js` ~30 lines hand-rolled: pre-cache `/offline`, network-first navigations. **`/offline` is fully self-contained — inline `<style>`, zero client JS** — so it renders styled from cache alone.
- `appleWebApp` metadata, `viewport-fit=cover`, per-scheme `theme-color`.
- Phone loop: `next dev --hostname 0.0.0.0` + `http://<mac-ip>:3000` (non-secure cookie works on LAN); PWA install verified against the production deploy.

## Seed (`scripts/seed.ts`, idempotent)

1. Upsert targets id=1: 2250 / 140 / 230 / 75 / 30.
2. Only if `meals` empty: 3 logged meals (today breakfast + lunch, yesterday dinner) and 2 planned dinners (today+1, +2). Mixed verdicts so every pipeline has data: mostly `up`, two `edited`, one `removed` — **seeded "corrections" are crafted as generically true UK-portion facts** (e.g. cooked rice weight) so they cannot mis-calibrate; recognisable names; ASSUMPTIONS + README note that deleting the example meals removes their influence.
3. Never truncates; rerun is a no-op.

## Build order (commit at every checkpoint)

1. **Scaffold + deps** (`_scaffold` trick; xlsx from CDN; `serverExternalPackages: ["pg"]`) ✅ dev serves; build + lint clean; record Next major.
2. **Env + schema + push** (`env.ts`, instrumentation with build-phase guard, schema, pool, drizzle config) ✅ `db:push` via unpooled URL; select works.
3. **Seed** ✅ runs twice, counts stable.
4. **Auth** ✅ curl: no cookie → redirect/401; wrong password → 401; cookie set and accepted.
5. **`/api/analyse`** ✅ curl text + image modes return zod-valid JSON; 400 on bad body; call timed (>40s p95 at effort low = red flag).
6. **Capture + review + `POST /api/meals`** ✅ scripted Blob upload from node + curl analyse + create meal with the returned URL; desktop walkthrough at 430×932 (device steps deferred — see below); thumbs-up copies ai_*; `up` with NULL ai_kcal rejected.
7. **Today view** ✅ seed renders; back-log yesterday via text; totals exclude planned + removed.
8. **Meal edit/delete + conversion** ✅ edit flips to `edited`; delete cascades; **Log it then immediate Save is blocked** (verdict reset); convert a planned dinner dated yesterday → lands in yesterday's totals; planned card offers Save plan / Delete plan.
9. **Week view** ✅ trend + target line; back and forward paging; bar tap drills through.
10. **Settings + distil + export** ✅ distil produces rules that appear in the next analyse prompt (dev-logged); empty-rules guard keeps existing notes; export CSV contains meals×items + targets + calibration sections; copy says "calibrated to you".
11. **Spreadsheet import** ✅ 5-row xlsx (serial dates) + CSV (`dd/mm/yyyy`) both preview and commit; duplicate-date handling; re-import replaces planned only.
12. **PWA + polish** ✅ production deploy; build output lists all authed pages as dynamic (ƒ); offline page renders styled with airplane-mode simulated in devtools.
13. **Fresh-run rehearsal**: `rm -rf .next node_modules && npm ci && npm run build && npm run lint`; grep sweeps (below) ✅ exit 0.
14. **README + ASSUMPTIONS + .env.example**, final commit.

**Deferred human verification** (needs the physical iPhone; listed at the end of README, outside session DoD): camera capture on device, Add to Home Screen, standalone launch, real airplane-mode offline page, safe-area check.

## Risks & mitigations (top)

| Risk | Mitigation |
|---|---|
| Static prerender breaks handover + stale Settings | `dynamic = "force-dynamic"` on `(app)/layout.tsx`; verify ƒ in build output |
| Mobile Safari ~60s fetch abort vs Fable latency | effort low; auto-retry only on cheap parse failure; AbortController 55s → error card |
| `pg` bundling (`cloudflare:sockets`) | `serverExternalPackages: ["pg"]` |
| Vercel 4.5MB body vs photos | Blob client upload; bytes never transit a function |
| HEIC | canvas re-encode; decode failure → dedicated error card (no raw upload) |
| Refusal as HTTP 200 | `stop_reason` branch + `fallbacks:"default"` beta on every call |
| Spreadsheet numbers poisoning calibration | `ai_confidence` NULL marks non-AI provenance; filters require it NOT NULL |
| Pooled URL breaks DDL | drizzle config prefers unpooled + warns; `.env.example` documents it |
| SheetJS registry / serial dates | CDN tarball 0.20.3; `cellDates` + `SSF.parse_date_code` + UK date priority |
| Recharts SSR | client leaf components, render after mount |
| Build-time env explosions | lazy `getEnv()`; instrumentation skips build phase |

## README / ASSUMPTIONS

**README**: local run (clone → `.env.local` → install → db:push → seed → dev; LAN phone loop); exact Vercel handover per CLAUDE.md (import repo → Storage tab: create + connect Neon and Blob → add `ANTHROPIC_API_KEY` + `APP_PASSWORD` → redeploy (first build before env vars is expected to fail/be discarded) → `vercel env pull` → db:push → seed → Add to Home Screen); troubleshooting (Fable 400s = org retention; slow first query = Neon scale-to-zero; prepared-statement errors = pooled URL; "could not analyse" = safety refusal); the deferred on-device checklist.

**ASSUMPTIONS.md** records every unasked call, including: settled defaults; conversion-mode verdict reset as the rule 1 mechanism; image-mode corrections use 10 most recent (ILIKE impossible pre-analysis — spec-internal conflict with "one call per request"; text mode uses word ILIKE); manual + spreadsheet-provenance items excluded from calibration queries ("last 50" = last 50 AI-estimated corrections); text quick-add saves `source:'manual'`, photos `'photo'`, fresh-photo re-analyse of a planned meal updates source to `'photo'`; import preview as stacked rows; export layout (3 labelled CSV sections); confidence surfaced only as a sub-0.6 badge; removed items persisted; distil deactivates (history kept), Settings deletes are hard; Blob photos public-but-unguessable, orphans kept v1; auth cookie = HMAC of APP_PASSWORD, 180d, secure prod-only; hand-rolled SVG ring + macro bars, Recharts for week charts; hand-written SW for the offline page only; effort low/medium, max_tokens 16000, server-side fallback beta, 30-day retention required; seed corrections are generically-true UK-portion facts; `maxDuration=300` assumes Fluid; dark mode follows system, no toggle; week averages over days with ≥ 1 logged meal.

## Definition-of-done verification

| Item | Check |
|---|---|
| build + lint | `rm -rf .next && npm run build && npm run lint` → 0; all authed pages dynamic (ƒ) |
| Fresh clone | temp-dir clone + `.env.local` + `npm ci` + db:push + seed + dev → click through all 6 features |
| Rule 1 gate | untouched save blocked; **Log it → immediate Save blocked**; `resolveFinals` inspected; `up` with NULL ai rejected |
| Calibration loop | edit → `edited` row → distil → rule appears in next analyse prompt (dev log) |
| Language | `grep -rE 'analyze|fiber|—|–' src/` clean |
| One transaction | inspect + kill-test rollback |
| No localStorage | `grep -r localStorage src/` empty |
| AI contract | curl both modes zod-valid; 400 / 401 / refusal-502 paths |
| Export all data | CSV contains items + targets + calibration sections |
| Seed idempotent | run twice, counts stable |
| Env failure | unset one var → boot error names it |

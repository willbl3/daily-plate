# Daily Plate

Live website: https://willbl3.github.io/daily-plate/

Responsive meal journal with private Supabase accounts, cloud saving, ingredient weights, daily calorie goals, year calendar, weigh-ins, meal estimates, recipes and College Station dining search.

## Accounts

Choose Sign in → Create an account. Usernames use 3–24 letters, digits or underscores. Passwords have 10–128 characters. Save the recovery code shown after signup; no email address is required. Use the same account on phone and computer to load your private journal.

Original device-only logs remain intact. After signing in, use Import this device’s original journal to copy them into cloud storage. This replaces the account journal after confirmation. Export first if you need both copies.

Sidebar status reports whether edits reached the cloud. Offline edits stay in an account-specific cache and sync when online. Cloud updates load on focus and every 30 seconds while visible. Version conflicts pause syncing and offer export, loading the cloud copy or explicitly replacing it. Sign-out waits for pending saves and removes the local account cache; cloud data remains.

## Features

- Ingredient weights in grams, ounces, pounds or label servings; recipe batch servings and portions eaten.
- Meal editing, deletion, repeat-today and daily completion.
- Adult calorie calculator, cut/maintain/gain pace, overrides, dated goal history and hover/focus/tap explanations.
- Full year calorie calendar: green completed days within tolerance, red completed days outside it or past unfinished meal logs, current in-progress days amber, unlogged/future days neutral.
- Tap any past calendar square to add/edit a weigh-in or open its food journal. Weight-only days stay neutral for calories; blue dots mark weigh-ins.
- Weight history, lb/kg display, trend chart and a seven-calendar-day average anchored to the latest weigh-in. Weight logs do not automatically change calorie goals.
- Twelve rough meal estimates with stated portions/ranges, including tacos and spaghetti.
- Six meal-prep recipes with ingredient-derived portion nutrition, steps/storage guidance; save personal recipes too.
- Ten balanced restaurant order ideas, distinguishing published nutrition, calculated builds and rough estimates.
- More than 70 starting College Station-area restaurant names, menu/name search, map links and optional live OpenStreetMap expansion. Coverage is not exhaustive; verify locations and business status. Listings do not imply published macros. Missing nutrition routes to estimates/custom labels.
- JSON backup export/import. Backups contain private data.

## Backend and privacy

The frontend remains buildless on GitHub Pages. config.js contains public browser keys only. Supabase provides the service-role key to the Edge Function at runtime; it is never in source or browser code.

daily_plate_journals stores one JSON document and monotonic revision per account. RLS requires auth.uid() = user_id for reads/writes. The save_daily_plate_journal RPC rejects stale revisions. Recovery hashes and rate-limit records deny all browser-role access. account-register.ts is the deployed Edge Function; supabase-schema.sql records the initial deployed schema.

Username accounts use internal synthetic email identifiers (username@users.dailyplate.invalid), not contact addresses. Supabase Auth hashes passwords and manages sessions. Signup/recovery are rate-limited. Recovery codes contain 128 random bits and are stored only as SHA-256 hashes server-side.

vendor-supabase.js is the official UMD client pinned to supabase-js 2.118.0 (MIT). Google Fonts loads externally. Optional nearby lookup calls Overpass only on click and sends a fixed area query, not personal profile data.

## Run and checks

Serve the directory with any static HTTP server, e.g. python -m http.server 8080. No frontend build is required. Signup/recovery CORS permits the production GitHub origin; test these there or configure an authorized development origin.

Run node verify.cjs for 36 functional checks. Live API checks also verified signup, independent sessions, private saving/loading, account isolation, stale-write rejection, denial of anonymous/recovery-table reads and code-based recovery. Synthetic QA accounts were removed.

## Nutrition sources

Mifflin–St Jeor: https://pubmed.ncbi.nlm.nih.gov/2305711/

NIH planner: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner

Food storage: https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts

Menu sources are linked in the app and food-data.js. Generic foods/recipes are estimates; product labels and portions matter. Pace initially uses 500 kcal/day per 1 lb/week, capped at a 25% maintenance deficit or 15% surplus, with 1,500 kcal male / 1,200 female floors. Weight and muscle change are not guaranteed.

## Workouts, Apple Health and calorie balance

The journal homepage shows calories in, calories out and net total (food minus resting plus active expenditure). Calories out uses entered/imported resting energy or a whole-day Mifflin estimate, plus the daily Move total when present, otherwise logged workout active calories. Daily Move totals already include workouts; these are never added twice. Missing unlogged movement means the estimate is incomplete. Current-day totals are provisional, and the food goal is not automatically increased by exercise.

Log workouts using active kcal directly, or estimate net energy above rest from MET, weight and duration. The red Apple Move ring records active kcal; Exercise ring minutes are tracked separately and do not add calories.

Apple Health is file-based rather than live HealthKit access: Health app > profile > Export All Health Data, then select export.zip or export.xml. Import reads the file locally in streamed chunks; only the reviewed activity summaries and workouts are saved/synced. Unrelated health records and the full export are not uploaded. Select a date range (90 days by default, three years max) and one sample/workout source. Daily ring summaries take priority; different device sources are not summed. Exact energy-record duplicates and repeat workout imports are deduplicated. Raw sample totals can differ from Health’s own source-priority calculations. Energy samples use their recorded start-date day; sessions crossing midnight are assigned to the start day.

ZIP support uses fflate 0.8.3 (MIT), bundled with its license in vendor-fflate.js. File reads limit compressed input to 500 MB and expanded XML to 1 GB. Very large exports may require extracting export.xml separately.

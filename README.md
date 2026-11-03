# Daily Plate

A responsive, buildless meal tracker. Live site: https://willbl3.github.io/daily-plate/

## Features

- Ingredient search, custom nutrition labels, gram/ounce/pound weights and serving counts.
- Recipe batch servings and portion calculations; calories, protein, carbs and fat.
- Meals by date with editing, deletion, repeat-today and completed-day controls.
- Adult calorie calculator using Mifflin–St Jeor, activity and cut/maintain/gain pace; optional calorie override.
- Goal history effective by date, configurable tolerance, and all twelve calendar months.
- Green completed days within tolerance, red completed days outside it or past unfinished logs, amber current in-progress logs, neutral unlogged/future days.
- Selected US Chick-fil-A and McDonald's menu snapshots with nutrition source links. Not a live restaurant API or a complete menu. Checked November 3, 2026; menu formulations may change. Generic ingredients are estimates; custom labels take precedence for branded products.
- Local browser persistence, JSON backup export/import. No account or cross-device cloud sync. No profile or meal data is sent to GitHub. Google Fonts is the only external runtime resource.

## Run

Serve this directory with any static HTTP server, for example `python -m http.server 8080`, then open http://localhost:8080. No build, packages, API keys or secrets are required. GitHub Pages can serve `main` from `/ (root)`.

## Nutrition methodology

Mifflin–St Jeor: https://pubmed.ncbi.nlm.nih.gov/2305711/

NIH planning reference: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner

Calculator estimates use 500 kcal/day per 1 lb/week. Deficits capped at 25% maintenance, surpluses at 15%, with 1,500 kcal male / 1,200 kcal female floors. These are broad planning estimates, not individualized medical care or guaranteed rates of change. Protein starts at 1.8 g/kg (capped at 35% energy), fat at 25%, remaining calories from carbohydrates. Menu calories are kept as published rather than forced to equal rounded macro energy.

Restaurant snapshots: https://www.chick-fil-a.com/nutrition-allergens and the individual McDonald's product pages linked in the app.

## Privacy and backups

Data lives in localStorage under `daily-plate-v1`, tied to the browser and website origin. Browser data clearing removes it. Export before clearing storage, moving devices, or changing domains. Import replaces the current local dataset after confirmation and validates its structure. Backups contain personal profile and food-log data; keep them private. Repository source contains no personal logs or profile defaults.

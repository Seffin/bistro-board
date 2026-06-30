# Philos Business Dashboard — Project Guide

**Package:** `philos-dashboard` (v0.1.0) | **Repo:** `bistro-board` | **Web:** `web` (v0.0.1) | **Scope:** Multi-channel restaurant analytics platform for Philos Delicacy (Kakkanad).

## 1. Architecture & Dual-Stack Overview
The system ingests Excel reports from Counter POS, Swiggy, and Zomato, syncs the Kakkanad Business Register (expenses + daily income), and presents unified sales and profitability views across two parallel application stacks.

```
[External: Gmail / Local Excel / Google Sheet]
  │ (fetch_emails.py / download_sheet.py)
  ▼
[Local Files: sales_reports/* & docs/Kakkanad Business Register.xlsx]
  │ (import_sales.py / import_register.py)
  ▼
[SQLite: philos_sales.db] ──(FastAPI: dashboard/main.py :8000)──► [Legacy JS/ApexCharts UI]
  │
  ▼ (npx tsx web/scripts/migrate-data.ts)
[Neon PostgreSQL] ──(SvelteKit 5 / Drizzle :5173 / Vercel)──► [Web UI]
```

### Stack Comparison & Architectural Decisions
- **Ingestion/ETL (Python ≥3.10, pandas, openpyxl)**: Shared engine owning all Excel parsing, Gmail IMAP fetch, Google Sheet sync, and local SQLite writes.
- **Legacy Stack (`dashboard/`)**: Production-complete FastAPI + Uvicorn server (`:8000`), reading SQLite (`philos_sales.db`) via raw SQL. Serves vanilla JS + ApexCharts SPA (`dashboard/static/` mounted at `/`, `html=True`). Features full analytics: KPIs, trends, economics, journal, ledger, reconciliation, payouts, promo, and live sync trigger (`POST /api/run-import`).
- **Web Stack (`web/`)**: Active rewrite MVP. SvelteKit 2 + Vite 8 (`:5173`), Svelte 5 (runes mode), Drizzle ORM + `@neondatabase/serverless` (`neon-http` driver for Vercel edge/serverless compatibility). Reads Neon PostgreSQL (`DATABASE_URL`). Features full Executive Overview Home (`/`) with dynamic KPI cards, Theme System tabs, 7 enterprise-grade ApexCharts, interactive Date Range filtering, and progressive enhancement sync actions (`?/sync`). Includes `/sales` (50 recent orders) and `/businesses` (50 recent income ledger rows). `/settings` is 404 (planned). Includes a full Authentication System (Login/Register) backed by a `users` table and session cookies. No live Python sync trigger yet (requires manual `migrate-data.ts`).
- **Architectural Rationale**: SvelteKit collapses frontend/backend into one deployable unit with SSR for faster first paint; PostgreSQL replaces SQLite due to ephemeral serverless filesystems (Vercel); Drizzle + Neon HTTP provides lightweight, type-safe edge querying; Python ingest is retained for battle-tested pandas Excel parsing.

## 2. Business Context & Financial Concepts
- **Sales Channels**: 
  - **Counter**: Petpooja/POS daily register export, daily frequency, stored in `sales_reports/counter/`.
  - **Swiggy**: Settlement annexure (order-level payout), weekly frequency, stored in `sales_reports/swiggy/`.
  - **Zomato**: Order-level payout sheet, weekly frequency, stored in `sales_reports/zomato/`.
- **Business Ledger**: Kakkanad Business Register (Google Sheet exported to `docs/Kakkanad Business Register.xlsx`). Contains **Expenses** (OpEx by category, vendor, payment mode) and **Income** (Daily reconciliation: Petpooja actuals, Swiggy/Zomato gross & payout, bank deposits via FED/YES/Cash).
- **Financial Semantics**:
  - `grand_total`: Customer-facing order value (gross sales).
  - `net_payout`: Amount restaurant receives after platform fees. For Counter, `net_payout` = `grand_total`. For Swiggy/Zomato, pulled from platform payout columns.
  - `commission`: Platform service/commission fees.
  - `other_charges`: Taxes, government charges, payment mechanism fees, etc.
  - `discount`: Restaurant-funded promo/discount share.

## 3. Data Pipeline & Ingest Semantics
Triggered via legacy UI "Sync Data" (`POST /api/run-import`, polling `GET /api/sync-status` until `running: false`) or standalone scripts. Import modules are reloaded via `importlib.reload()` before execution.

1. **`fetch_emails.py` (0–45%)**: Scans Gmail IMAP (last 30 days) for `SINCE {date} OR (SUBJECT "Annexure") OR (SUBJECT "Settlement") OR (SUBJECT "Philos-KKND") OR (SUBJECT "Swiggy Payments")`. Saves new `.xlsx` attachments without overwriting existing files.
   - *Swiggy*: `annexure` in filename, or `swiggy` in sender/subject → `sales_reports/swiggy/`.
   - *Zomato*: `settlement` in filename, or `zomato` in sender/subject → `sales_reports/zomato/`.
   - *Counter*: `philos-kknd` in filename, `counter` in subject, or `philos` in filename (excluding zomato) → `sales_reports/counter/`.
2. **`import_sales.py` (50–65%)**: Parses Excel files into SQLite `orders` (`INSERT OR REPLACE`, upsert by `order_id`) and `order_payments` (deleted and re-inserted per order). Runs inside a transaction with `PRAGMA foreign_keys = OFF`, ending with `VACUUM`.
3. **`download_sheet.py` (80%)**: Exports Google Sheet ledger to `docs/Kakkanad Business Register.xlsx`.
4. **`import_register.py` (85–95%)**: Full replace (`DELETE FROM`) of `expenses` and `income_register`. Fixes source typo: Dec 2026 dates corrected to 2025 (`fix_date_typos`).

*Graceful Degradation*: Missing `GMAIL_APP_PASSWORD` skips email fetch; missing `google_credentials.json`/`GOOGLE_SHEET_ID` skips sheet download; empty folders log warnings but pipeline continues; missing register returns empty ledger APIs.

## 4. Import Parsers Deep Dive (`import_sales.py`)
- **`find_header_and_read(path, sheet_name, keywords)`**: Scans rows until all keywords match to bypass pre-header titles, re-reading sheet with that row as header.
- **Counter (`parse_counter`)**: `sales_reports/counter/` (fallback: `2026-Jan-Jun/Counter-Jan-Jun-2026/`), `Sheet1`. Keywords: `Order No.`, `Items`, `Grand Total`. Rows with `Created` & `Items` create/update orders; rows missing them append to `order_payments`. Skips non-numeric order numbers and summary rows. Fallback `grand_total` (if 0) = `subtotal + tax - discount + round_off`. `Part Payment` handled separately.
- **Swiggy (`parse_swiggy`)**: `sales_reports/swiggy/`, `Order Level`. Keywords: `Order ID`, `Order Date`, `Order Status`. `other_charges` = total Swiggy fees − commission + total taxes. `net_payout` from `Net Payout for Order (after taxes)\n[A-B-C-D]`.
- **Zomato (`parse_zomato`)**: `sales_reports/zomato/`, `Order Level`. Keywords: `Order ID`, `Order Date`, `Res. name`. `commission` = service fee + payment mechanism fee. `other_charges` = government charges + other deductions + service tax on fees. Maps multi-line headers like `Net order value\n[(1)+...]`.
- **Register (`import_register.py`)**: `docs/Kakkanad Business Register.xlsx`. Expenses sheet skips rows with null category or zero amount. Income sheet requires valid `Sl` (serial) and parsed date.

## 5. Database Schema & Path Resolution
Logical schema shared across SQLite (`philos_sales.db`, `PRAGMA journal_mode=WAL`) and Neon PostgreSQL (`web/src/lib/server/db/schema.ts`, Drizzle ORM).
- **Path Resolution**: `import_sales.py`/`import_register.py` use `SCRIPT_DIR/philos_sales.db`; `dashboard/main.py` uses `BASE_DIR/../philos_sales.db`; `web/scripts/migrate-data.ts` uses `../../philos_sales.db`. All resolve to `bistro-board/philos_sales.db`.
- **Type Mappings**: SQLite `TEXT` datetime strings → Postgres `timestamp('order_date')`; SQLite `TEXT` PK → Postgres `text().primaryKey()`; SQLite `INTEGER PK AUTOINCREMENT` → Postgres `serial()`; SQLite `REAL` → Postgres `real()`; Ledger dates kept as `text('date')` to preserve `YYYY-MM-DD` strings.

### Tables & Key Columns
- **`orders`**: `order_id` (TEXT PK, `{Channel}_{original_id}`), `channel` (`Counter`, `Swiggy`, `Zomato`), `original_order_id`, `order_date` (`YYYY-MM-DD HH:MM:SS`), `status`, `subtotal`, `packaging_charge`, `delivery_charge`, `discount` (restaurant share), `tax`, `grand_total` (gross sales), `commission`, `other_charges`, `net_payout`, `items_summary` (Counter comma-separated items), `customer_name`, `customer_phone`, `order_type`, `sub_order_type`.
- **`order_payments`**: `payment_id` (INTEGER PK AUTO / serial), `order_id` (FK to orders, CASCADE delete), `payment_type` (`Cash`, `Card`, `UPI`, etc.), `amount`.
- **`expenses`**: `year`, `month`, `expense_id`, `date`, `category`, `description`, `amount`, `paid`, `mode`, `payment_date`, `rating`, `vendor_category`, `remarks`. Full replace on import.
- **`income_register`**: `sl` (PK), `month`, `date`, `day`, `week_number`, `petpooja_actual`, `gst_5pct`, `petpooja_net`, `swiggy_gross`, `swiggy_payout`, `paper_bill`, `zomato_gross`, `zomato_payout`, `total_income`, `fed_bank`, `yes_bank`, `cash`. One row per business day.
- **`channels`** *(Neon PostgreSQL only)*: `id` (TEXT PK, slug e.g. `counter`), `name` (display name), `color` (hex code), `import_folder` (path relative to `sales_reports/`), `email_keywords` (JSON string array), `is_active` (BOOLEAN, default `true`), `created_at`, `updated_at` (timestamps). Drives dynamic sidebar, badge colors, and column headers across the SvelteKit web stack.

### Channel Configuration (Web Stack)
The web stack uses a database-backed configuration approach instead of hardcoded channel references. The `channels` table defines which sales channels appear in the UI and how they are displayed.

#### Seeding Default Channels
```bash
cd web && npx tsx scripts/seed-channels.ts
```
This inserts `Counter`, `Swiggy`, and `Zomato` with their respective colors and import folder paths. The script is idempotent (uses `ON CONFLICT DO UPDATE`).

#### Adding a New Channel
1. Insert a row into the `channels` table (via Drizzle Studio or the seed script):
   ```sql
   INSERT INTO channels (id, name, color, import_folder, email_keywords, is_active)
   VALUES ('ubereats', 'Uber Eats', '#142328', 'sales_reports/ubereats', '["Uber Eats"]', true);
   ```
2. The sidebar, sales badges, and business ledger headers will automatically reflect the new channel.
3. To add data import support, create a `parse_ubereats()` function in `import_sales.py` and add the folder to `sales_reports/`.

#### Configuration Service (`web/src/lib/server/config.ts`)
- `getAllChannels()` — returns all active channels (used by layout for sidebar)
- `getChannelById(id)` — returns a single channel by slug (for future per-channel pages)

## 6. Legacy REST API & Frontend Architecture
Base URL: `http://127.0.0.1:8000`. Global query params `start_date` & `end_date` (`YYYY-MM-DD`) filter `order_date` (datetime range) or `date` (date string) via `apply_date_filters` / `apply_ledger_date_filters`.

### API Endpoints & Excluded Statuses
- **Excluded Statuses**: Most analytics exclude `Cancelled, rejected, failed, Not Paid`. Cancellation KPIs specifically include `Cancelled, rejected, failed, Cancelled/ Rejected Orders`.
- **Analytics Endpoints**: `GET /api/kpis` (totals, AOV, breakdown), `GET /api/sales-trends?groupby=day|week|month`, `GET /api/channel-economics` (gross, fees, payout), `GET /api/counter-insights` (top 15 items, payment breakdown), `GET /api/item-breakup?item_name=...` (item trends, co-purchase), `GET /api/weekday-sales` (Mon–Sat, Sun excluded), `GET /api/hourly-sales`.
- **Orders & Payouts Endpoints**: `GET /api/orders?page&limit&channel&status&search` (paginated journal), `GET /api/weekly-payouts?channel`, `GET /api/payout-orders?channel&week_key&page&limit`, `GET /api/promo-analysis?channel` (promo vs non-promo, Pearson correlation).
- **Ledger & Sync Endpoints**: `GET /api/ledger-summary` (P&L, margin), `GET /api/expenses-breakup`, `GET /api/income-breakup`, `GET /api/ledger-transactions?type=expense|income`, `GET /api/daily-reconciliation`, `POST /api/run-import` (409 if running), `GET /api/sync-status` (`{ running, stage, message, progress_percent, log[], result }`).

### Reconciliation Logic (`/api/daily-reconciliation`)
```python
counter_variance = raw_counter_gross - ledger.petpooja_actual
swiggy_variance  = raw_swiggy_gross  - ledger.swiggy_gross
zomato_variance  = raw_zomato_gross  - ledger.zomato_gross
actual_payout    = counter_gross + swiggy_payout + zomato_payout
payout_variance  = actual_payout - ledger.total_income
```

### Legacy Frontend (`dashboard/static/`)
- `index.html`: Shell, sidebar nav, 8 tab panes, date pickers, sync modal.
- `app.js` (~3,200 lines): Global state (`activeTab: 'overview'`, `salesTrendGroupby`, `ordersPage`, `startDate`, `endDate`, `ledgerPage`, `ledgerType`, `charts`). Tab activation (`initTabs() → click nav → onTabActivated(tabId) → load*Data() → fetch API → render ApexCharts/tables`). Loaders: `loadOverviewData`, `loadEconomicsData`, `loadCounterInsights`, `loadOrdersTable`, `loadLedgerData`, `loadReconciliationData`, `loadPayoutData`, `loadPromoData`. Sync UX: disable button, show spinner/modal, poll status, update progress bar, reload active tab. Formatting: `Intl.NumberFormat('en-IN', { currency: 'INR' })`, K/L/Cr suffixes.
- `style.css`: Themes (`theme-light`, `theme-dark`, `theme-color`).

### Legacy Dashboard Tabs Summary
- `overview` (Executive Overview): KPI cards, trend charts, P&L snapshot, Opex donut, channel mix.
- `economics` (Platform Economics): Fee breakdown, margin leakage Swiggy vs Zomato.
- `counter` (Counter Insights): Top items, payment mix, item drill-down modal.
- `orders` (Order Journal): Filterable/searchable paginated table.
- `ledger` (Business Ledger): P&L, category charts, expense/income tables.
- `reconciliation`: Compare expected payouts against bank settlements. Matches Counter POS against Ledger text dates.
- **Payout Analytics**: Analyze commission deductions and net settlement amounts by channel over time.
- **Promo Impact**: Evaluate ROI of discounts using the `discount` column across value buckets.

### Ledger Data Mapping

The `income_register` table does not contain a `channel` column and its `date` column is a text string (not a timestamp). The application maps it as follows:
- **Counter**: `petpooja_net`
- **Swiggy**: `swiggy_payout`
- **Zomato**: `zomato_payout`
- **Total**: `total_income`
- **Other**: `total_income - (petpooja_net + swiggy_payout + zomato_payout)`

## Synchronization Pipeline

Data is synced from multiple external sources (emails, Google Sheets, POS API) via Python scripts in the root directory.

> **CRITICAL**: The SvelteKit server executes these scripts via `api/sync`. You **MUST** have Python installed and available in your system `PATH` (as `python`, `python3`, or `py`). If Python is not in your PATH, the sync will fail with exit code 9009 on Windows.

## 7. Web Framework Deep Dive (`web/`)
Scaffolded via `npx sv@0.16.1 create --template minimal --types ts --add prettier eslint drizzle="database:postgresql+postgresql:neon"`. Package: `web@0.0.1`.
- **Tech Stack**: `@sveltejs/kit` ^2.63, `svelte` ^5.56 (runes mode forced in `vite.config.ts`), `vite` ^8.0, `@sveltejs/adapter-auto` ^7.0 (Vercel target), `drizzle-orm` ^0.45, `drizzle-kit` ^0.31, `@neondatabase/serverless` ^1.1 (`neon-http`), `better-sqlite3` ^12.11 (migration only), `tsx` ^4.22, `dotenv` ^17.4. Includes dynamic ApexCharts integration (`svelte-apexcharts`), server-side KPI aggregations, and form actions (`?/sync`). Includes a database-backed auth system with `bcryptjs`.
- **Database Connection (`src/lib/server/db/index.ts`)**: `neon(env.DATABASE_URL)` via `$env/dynamic/private`. Throws on start if `DATABASE_URL` missing. `schema` passed to `drizzle()` for relational queries.
- **Migration Pipeline (`web/scripts/migrate-data.ts`)**: Loads `web/.env`, opens SQLite via `better-sqlite3`, selects all rows, inserts to Neon Postgres in chunks of 500 (avoiding payload/timeout limits) using `.onConflictDoNothing()` for idempotency. No automated hook from Python sync exists yet.
- **Routes & Behavioral Analysis**:
  - `src/routes/+layout.svelte`: Sidebar + sticky top header shell. Links: Dashboard (`/`), Sales (`/sales`), Businesses (`/businesses`), Settings (`/settings`), plus dynamically loaded active channels. Uses runes (`let { children } = $props()`). Top header features ThemeToggle, UserDropdown (auth profile/logout), DateRangeHeader, and ChannelFilter. Global `TabBar` renders dynamically beneath the header inside a sticky wrapper across authenticated views.
  - `src/routes/+page.server.ts` & `+page.svelte` (Home): Complete Executive Overview Dashboard. Server load parses URL params (`?start`, `?end`, `?channel`) for Drizzle filtering (case-insensitive lookup via config) and aggregates KPIs (Net Payout, Volume, Retained %, per-channel stats). Svelte 5 runes UI powers 7 enterprise ApexCharts and live ETL sync form simulation.
  - `src/routes/sales/+page.server.ts` & `+page.svelte`: Loads recent orders (`orderBy(desc(orders.order_date)).limit(50)`). Supports filtering by date range and dynamic channel lookup (`?channel=swiggy`). Displays Order ID, Date, Channel badge, Type, Status dot, Grand Total. Gaps vs legacy: no pagination, no search, no net payout column.
  - `src/routes/businesses/+page.server.ts` & `+page.svelte`: Loads 50 recent `income_register` rows. Displays Swiggy/Zomato payout, Cash, Fed+Yes bank, Total Income. Gaps vs legacy: no expenses/P&L view, no date filtering, named "Businesses" but displays income register.
  - *Notable Absences*: `/settings` is linked but 404; no `+server.ts` API routes (all data access is SSR `load`).
- **Styling & Theming (`src/app.css`)**: Inter font, CSS vars (`--bg-primary`, `--accent-primary`, `--success`), system dark mode (`@media (prefers-color-scheme: dark)` on `:root`). Utility classes: `.card`, `.btn`, `.btn-primary`, `.btn-outline`. Route-scoped `<style>` blocks.
- **Svelte 5 Guidelines**: Use `$props()` (not `export let`), `$state()` / `$derived()` (not `let` + `$:`), keep server code in `*.server.ts` or `$lib/server/`.

## 8. Configuration, Credentials & File Layout
- **Python / Legacy (`.env`)**: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GOOGLE_SHEET_ID`. Loaded via `python-dotenv`.
- **Web / PostgreSQL (`web/.env`)**: `DATABASE_URL=postgresql://...` (pulled via `npx vercel env pull .env`). Required by `db/index.ts`, `drizzle.config.ts`, `migrate-data.ts`.
- **Google Service Account**: `google_credentials.json` at repo root. Scope: `https://www.googleapis.com/auth/drive.readonly`. Sheet shared with SA email. Exports to `docs/Kakkanad Business Register.xlsx`.
- **Gitignored Paths**: `google_credentials.json`, `.env*`, `env`, `web/.env*`, `web/env`, `__pycache__/`, `sales_reports/`, `venv/`, `scratch/`. (`philos_sales.db` tracked in some envs, do not commit prod data).
- **Expected Local Layout**:
  ```
  bistro-board/
  ├── sales_reports/
  │   ├── counter/     ← daily POS .xlsx
  │   ├── swiggy/      ← annexure .xlsx
  │   └── zomato/      ← settlement .xlsx
  ├── docs/
  │   └── Kakkanad Business Register.xlsx
  └── web/
      └── .env         ← DATABASE_URL for Neon
  ```

## 9. Development Workflows & CLI Commands
### Legacy Stack (Python Dashboard)
```powershell
cd bistro-board; python -m venv venv; venv\Scripts\Activate.ps1; pip install -e .; copy .env.example .env
python dashboard/main.py    # Run FastAPI server on http://127.0.0.1:8000 (uvicorn reload=False)
python import_sales.py      # Standalone: Parse Excel → SQLite orders
python import_register.py   # Standalone: Parse register → expenses + income
python fetch_emails.py      # Standalone: Gmail → sales_reports/
python download_sheet.py    # Standalone: Google Sheet → docs/
```
*Test with Seed Data*: Ensure seed files exist in `sales_reports/` & `docs/`, set legacy UI date range to `2026-06-01` → `2026-06-30`, click "Sync Data".
*Adding API Endpoint*: Add route in `dashboard/main.py` (with `apply_date_filters`/`apply_ledger_date_filters`), add loader in `app.js`, wire to `onTabActivated()`, add HTML container in `index.html`.
*Adding Sales Channel*: Add `parse_<channel>()` in `import_sales.py`, call in `import_all()`, add email rules in `fetch_emails.py`, update UI color maps/badges.

### Web Stack (SvelteKit)
```bash
cd web; npm install; npx vercel link; npx vercel env pull .env
npm run db:push                                       # Push schema to Neon
cd ..; python import_sales.py && python import_register.py # Populate SQLite
cd web && npx tsx scripts/migrate-data.ts            # Mirror SQLite to Neon Postgres
npm run dev                                           # Run SvelteKit on http://localhost:5173
npm run build && npm run preview                      # Production preview
npm run check                                         # svelte-check + types
npm run lint                                          # prettier + eslint
npm run db:generate; npm run db:migrate; npm run db:studio # Drizzle management
```
*Adding Web Page*: Create `src/routes/<name>/+page.server.ts` (`export const load`), create `+page.svelte` (`$props()`), add nav link in `+layout.svelte`, place shared queries in `$lib/server/`.
*Adding Drizzle Table*: Define in `src/lib/server/db/schema.ts`, run `db:push` / `db:generate`+`db:migrate`, update `migrate-data.ts` & Python scripts.

## 10. Roadmap, Known Limitations & Troubleshooting
### Web Roadmap & Settings Proposal (`docs/settings_tab_proposal.md`)
- **P0 / P1 ✅**: Executive Overview Dashboard, all 7 analytical views, and Settings UI completed. Manual upload for channels + register, credentials configuration (Gmail/Sheets) via `app_settings` table, and dynamic Python orchestration via `/api/sync/+server.ts` are live.
- **P2**: Deprecate FastAPI REST layer completely; dual-write ingest directly to Postgres or rewrite Python parsers to Node.js; data purge, DB export/import, scheduled CRON sync.
- **P3**: Display preferences, channel white-labeling.

### Current Limitations Summary
Legacy DB sync is still manual (`migrate-data.ts`) after SQLite import; full register replace on import; no auth in either stack; Counter item parsing comma-split (not exposed in web); single restaurant scope.

### Troubleshooting Guide
- **"Database file not found" in UI**: No sync run yet or wrong path → Run `python import_sales.py` or click Sync Data.
- **Empty charts after sync**: Date range doesn't overlap data → Adjust start/end dates.
- **Gmail skipped**: Missing `GMAIL_APP_PASSWORD` → Set 16-char App Password in `.env`.
- **Sheet sync skipped**: Missing credentials/Sheet ID → Add `google_credentials.json` + `GOOGLE_SHEET_ID`, share sheet with SA.
- **Counter items empty**: Swiggy/Zomato don't populate `items_summary` → Expected (Counter-only feature).
- **Duplicate email files ignored**: Existing filenames not overwritten → Delete file from `sales_reports/` to re-download.
- **Register dates wrong for Dec**: Known typo in source sheet → `import_register.py` auto-fixes 2026-12 → 2025-12.
- **Sync already running (400/409)**: Previous sync stuck → Restart server to reset `sync_status`.
- **Parser "Could not find header row"**: Excel format changed → Update `find_header_and_read` keywords.
- **`DATABASE_URL is not set`**: Missing `web/.env` → Run `npx vercel env pull .env` or set manually.
- **`/sales` shows "No orders found"**: Postgres empty or migration not run → Run Python import, then `npx tsx scripts/migrate-data.ts`.
- **Stale data in web**: SQLite updated but Postgres not re-migrated → Re-run `migrate-data.ts`.
- **`db:push` fails**: Invalid connection string or Neon paused → Check Neon dashboard, verify `DATABASE_URL`.
- **`/settings` 404**: Route not implemented yet → Expected (nav link ahead of implementation).
- **Dark mode wrong on web**: System preference only → Web uses `prefers-color-scheme`, legacy has manual switcher.

### Useful SQLite Checks
```powershell
sqlite3 philos_sales.db "SELECT channel, COUNT(*) FROM orders GROUP BY channel;"
sqlite3 philos_sales.db "SELECT MIN(order_date), MAX(order_date) FROM orders;"
sqlite3 philos_sales.db "SELECT COUNT(*) FROM expenses; SELECT COUNT(*) FROM income_register;"
```

## 11. Project File Structure
```
bistro-board/
├── pyproject.toml                  # Python package metadata & dependencies
├── README.md                       # Quick start guide (legacy stack focus)
├── philos_sales.db                 # SQLite database (source of truth for ingest)
├── google_credentials.json         # Google Service Account credentials (gitignored)
├── .env                            # Python environment vars (GMAIL_*, GOOGLE_SHEET_ID)
│
├── Data Ingestion & ETL (Python)
│   ├── fetch_emails.py             # Scans Gmail IMAP for Swiggy/Zomato/Counter reports
│   ├── download_sheet.py           # Exports Kakkanad Business Register from Google Drive
│   ├── import_sales.py             # Parses Excel sales reports into SQLite 'orders' table
│   └── import_register.py          # Parses register workbook into 'expenses' & 'income_register'
│
├── dashboard/                      # Legacy Web App & REST API (FastAPI)
│   ├── main.py                     # FastAPI application, endpoints, sync task orchestration
│   └── static/                     # Vanilla JS Single Page Application (SPA)
│       ├── index.html              # Dashboard UI shell, sidebar, modals, tab panes
│       ├── app.js                  # Frontend logic, state management, ApexCharts rendering
│       └── style.css               # Vanilla CSS themes (light, dark, color) & layout
│
├── web/                            # Modern Web Stack (SvelteKit 5 + Drizzle + Neon)
│   ├── package.json                # Node dependencies & scripts (dev, build, db:push, test)
│   ├── vite.config.ts              # Vite + SvelteKit plugin config (runes mode forced)
│   ├── vitest.config.ts            # Vitest test runner config
│   ├── drizzle.config.ts           # Drizzle Kit config for Neon PostgreSQL
│   ├── .env                        # Runtime config containing DATABASE_URL (gitignored)
│   ├── scripts/
│   │   ├── migrate-data.ts         # Seeding script: one-way sync from SQLite to Neon Postgres
│   │   └── seed-channels.ts        # Channel seeding: inserts default Counter/Swiggy/Zomato config
│   └── src/
│       ├── app.css                 # Global CSS design tokens & utilities
│       ├── lib/
│       │   ├── server/
│       │   │   ├── config.ts       # Configuration service: getAllChannels(), getChannelById()
│       │   │   └── db/
│       │   │       ├── index.ts    # Neon HTTP Drizzle client singleton
│       │   │       ├── schema.ts   # Drizzle table definitions (channels, orders, payments, expenses, income)
│       │   │       └── seed-data.ts# Default channel data (shared between seed script and tests)
│       │   └── utils/
│       │       └── chart-helpers.ts# Charting utilities: formatCurrency, generateColors, ApexCharts options
│       └── routes/
│           ├── +layout.server.ts   # Layout load: injects active channels into all routes
│           ├── +layout.svelte      # Main app shell, dynamic sidebar navigation with channel dots
│           ├── +page.server.ts     # Server load: parses date filters, aggregates KPIs & chart series
│           ├── +page.svelte        # Home dashboard UI (Executive Overview with ApexCharts)
│           ├── sales/
│           │   ├── +page.server.ts # Server load function: fetches 50 recent orders
│           │   └── +page.svelte    # Order journal table UI with dynamic channel badges
│           └── businesses/
│               ├── +page.server.ts # Server load function: fetches 50 recent income register rows
│               └── +page.svelte    # Daily income ledger table UI with dynamic channel headers
│
├── docs/                           # Documentation & Specifications
│   ├── PROJECT_GUIDE.md            # This architectural guide & reference
│   ├── settings_tab_proposal.md    # Design spec for planned Settings tab (P0-P3 roadmap)
│   └── postgres_setup.md           # Instructions for Vercel & Neon PostgreSQL setup
│
└── sales_reports/                  # Ingestion Landing Directories (local, gitignored)
    ├── counter/                    # Daily Petpooja POS Excel exports
    ├── swiggy/                     # Weekly Swiggy settlement annexure files
    └── zomato/                     # Weekly Zomato order-level payout sheets
```

## 12. Phase 3: Detailed Analytics Views (✅ COMPLETE)

The Phase 3 implementation expands the SvelteKit web stack with 8 fully-featured analytics tabs. All tabs support unified date range filtering, responsive design, and comprehensive test coverage (177 passing tests).

### Architecture Highlights
- **TDD Approach**: All tabs implemented with tests first, then load functions, then Svelte components
- **Shared Date Range**: Global `dateRange` store with factory pattern, URL-synced across all tabs
- **Dynamic Configuration**: All tabs use channel configuration from `channels` table for colors, names, and filtering
- **Type Safety**: Full TypeScript support, Drizzle ORM for all database queries
- **Responsive Design**: Mobile/tablet/desktop layouts with CSS Grid & Flexbox
- **Dark Mode**: Automatic system preference detection with CSS variables

### Tabs & Features

#### 1. **Home / Overview** (Executive Dashboard)
- **Route**: `/`
- **KPIs**: Total Orders, Gross Revenue, Net Payout, Active Channels
- **Charts**: Monthly Contribution (stacked bar), Revenue Trends (line), Hourly Velocity (heatmap), Channel Mix (pie), Profit/Loss (bar), Weekly Performance (area), Expense Breakdown (pie)
- **Features**: Interactive date range filter, responsive charts, empty state handling
- **Tests**: 52 passing tests

#### 2. **Sales** (Recent Orders)
- **Route**: `/sales`
- **Display**: 50 most recent orders with channel badges, status indicators, amounts
- **Columns**: Order ID, Date, Channel, Status, Amount, Customer
- **Features**: Paginated table, channel-specific colors, empty state
- **Tests**: Included in core tests

#### 3. **Businesses** (Daily Income Ledger)
- **Route**: `/businesses`
- **Display**: 50 most recent income register entries by date
- **Columns**: Date, Day, Petpooja, Swiggy, Zomato, Total Income, Bank, Cash
- **Features**: Daily aggregation, channel breakdown, payment method tracking
- **Tests**: Included in core tests

#### 4. **Economics** (Channel Fee Analysis)
- **Route**: `/economics`
- **KPIs**: Total Gross Sales, Total Commission, Total Payouts
- **Analysis**: Commission rate by channel, platform fee breakdown, payout ratio visualization
- **Charts**: Channel Comparison (bars), Commission Distribution (pie), Payout Analysis (stacked bar)
- **Features**: Channel-specific filtering, rate calculations, visual breakdown
- **Tests**: 15 passing tests

#### 5. **Counter Insights** (POS Top Items & Payments)
- **Route**: `/counter`
- **KPIs**: Total Counter Orders, Top Item, Payment Methods
- **Tables**: Top 15 items by frequency with counts and percentages, Payment method breakdown
- **Features**: Item trend analysis, payment mix visualization, detail modal for item history
- **Tests**: 16 passing tests

#### 6. **Order Journal** (Paginated Order History)
- **Route**: `/orders`
- **KPIs**: Total Orders, Showing X Results
- **Pagination**: 50 items per page with Previous/Next controls
- **Filters**: Multi-select channels, multi-select status (delivered/pending/cancelled/failed), search by order ID
- **Display**: Order ID, Date, Channel (badge), Status (badge), Amount
- **Features**: Advanced filtering, pagination math, search highlighting, empty state
- **Tests**: 15 passing tests

#### 7. **Business Ledger** (Daily Income Breakdown)
- **Route**: `/ledger`
- **KPIs**: Total Income, Net Profit, Average Daily Income
- **Display**: Daily breakdown table with channel columns (Counter, Swiggy, Zomato, Other, Total)
- **Summary**: Channel contribution percentages with colored indicators
- **Features**: Daily aggregation, profit calculation, channel attribution
- **Tests**: 11 passing tests

#### 8. **Reconciliation** (Counter vs Ledger Variance)
- **Route**: `/reconciliation`
- **KPIs**: Reconciliation Rate (%), Total Variance, Days Analyzed
- **Display**: Daily variance table (Counter Total, Ledger Total, Variance, Status)
- **Status Badges**: 'Matched' (green), variance indicators, percentage calculations
- **Features**: Variance tracking, reconciliation status, trend analysis over time
- **Tests**: 7 passing tests

#### 9. **Payout Analytics** (Weekly Settlement)
- **Route**: `/payouts`
- **KPIs**: Total Payout, Average Weekly, Highest Week
- **Display**: Weekly summary (Week, Counter, Swiggy, Zomato, Total) with highest week highlighted
- **Summary**: Channel totals with percentage breakdown
- **Features**: Weekly aggregation, highest week identification, channel breakdown
- **Tests**: 7 passing tests

#### 10. **Promo Impact** (Discount Analysis)
- **Route**: `/promo`
- **KPIs**: Orders with Promo, Total Discount Value, Total Orders Analyzed
- **Analysis**: Discount distribution across 4 buckets (0-100, 100-250, 250-500, 500+)
- **Display**: Distribution table with order counts, penetration %, averages
- **Insights**: Penetration rate analysis, top bucket identification, discount impact metrics
- **Features**: Bucket categorization, insight generation, correlation analysis
- **Tests**: 6 passing tests

### Development Workflow

#### Running Tests
```bash
cd web
npm test
```
Expected output: **177 tests passed** (83 core + 94 new)

#### Running Development Server
```bash
cd web
npm run dev
# Navigate to http://localhost:5173
```

#### Building for Production
```bash
cd web
npm run build
npm run preview
```

### Data Aggregation Patterns
All tabs use consistent Drizzle ORM patterns for type-safe queries:

```typescript
// Date range filtering
const start = url.searchParams.get('start') ? new Date(url.searchParams.get('start')!) : null
const end = url.searchParams.get('end') ? new Date(url.searchParams.get('end')!) : null

let query = db.select().from(orders)
if (start && end) {
  query = query.where(between(orders.order_date, start, new Date(end.getTime() + 86400000)))
}

// Channel filtering
const channels = url.searchParams.get('channels')?.split(',') || []
if (channels.length > 0) {
  query = query.where(inArray(orders.channel, channels))
}
```

### Component Patterns
All Svelte components use Svelte 5 runes for reactive state:

```svelte
<script lang="ts">
  import DateRangeHeader from '$lib/components/DateRangeHeader.svelte'
  import KPICard from '$lib/components/KPICard.svelte'

  let { data } = $props()
  const items = $derived(data.items)
</script>

<header class="header card">
  <h1>Page Title</h1>
  <DateRangeHeader />
</header>

<div class="kpi-row">
  <KPICard title="..." value={...} subtitle="..." />
</div>

<!-- Content: tables, charts, insights -->
```

### Testing Strategy
- **Unit Tests**: Load functions tested with mock data
- **Data Validation**: Verify aggregation logic, calculations, filtering
- **Edge Cases**: Boundary dates, empty results, large datasets
- **Type Safety**: All queries and return types verified by TypeScript

### Deployment Checklist
- ✅ All 177 tests passing
- ✅ Date range filtering working across all tabs
- ✅ Responsive design tested on mobile/tablet/desktop
- ✅ Dark mode CSS variables applied
- ✅ Currency formatting (INR) consistent
- ✅ Empty states displaying when no data
- ✅ Database migrations applied (`npx tsx scripts/migrate-data.ts`)
- ✅ Channel configuration seeded (`npx tsx scripts/seed-channels.ts`)
- ✅ Environment variables set (`.env` with `DATABASE_URL`)

## 13. Phase 5: Production Hardening & Deployment (✅ COMPLETE)

The final phase transitioned the application from a development prototype to a production-ready system.

### Security & Authentication
- Replaced the unprotected dashboard with a session-based authentication system.
- Implemented `bcryptjs` for secure password hashing.
- Admin credentials are provided via `ADMIN_USER` and `ADMIN_PASSWORD_HASH` environment variables.
- Routes are protected via SvelteKit hooks (`hooks.server.ts`), redirecting unauthenticated users to `/login`.

### Performance Optimization
- Added an in-memory TTL caching layer using `node-cache`.
- Wrapped expensive aggregate queries on the Executive Dashboard with a 5-minute cache.
- The cache is automatically invalidated when a successful data sync occurs (`/api/sync`).

### Observability & Error Handling
- Integrated `pino` for structured, JSON-based server logging, capturing request durations and errors.
- Added global `try/catch` boundaries in load functions.
- Built a global, accessible Toast notification system (`$lib/stores/toast.ts`) with typed variants (success/error/info/warning) to inform users of background sync status and errors.

### Legacy Deprecation & Export
- Completely removed the FastAPI backend (`dashboard/` directory) as full feature parity was achieved in SvelteKit.
- Implemented robust CSV generation for data export across Orders, Ledger, and Reconciliation views.

### Deployment Architecture
- Created `vercel.json` and a comprehensive `docs/DEPLOYMENT.md`.
- Vercel handles the SvelteKit frontend/backend.
- Neon PostgreSQL serves as the serverless database.
- Python ETL scripts are designated to run via external cron jobs or GitHub Actions to bypass Vercel's lack of a Python runtime.

### Related Documentation
- [Postgres Setup Guide](postgres_setup.md) — Instructions for Neon database configuration
- [Settings Tab Proposal](settings_tab_proposal.md) — Future roadmap for Settings features
- [Deployment Guide](DEPLOYMENT.md) — Instructions for deploying to Vercel and Neon

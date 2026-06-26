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
- **Web Stack (`web/`)**: Active rewrite MVP. SvelteKit 2 + Vite 8 (`:5173`), Svelte 5 (runes mode), Drizzle ORM + `@neondatabase/serverless` (`neon-http` driver for Vercel edge/serverless compatibility). Reads Neon PostgreSQL (`DATABASE_URL`). Partial parity: `/sales` (50 recent orders), `/businesses` (50 recent income ledger rows). Home (`/`) is placeholder UI; `/settings` is 404 (planned). No auth or live sync trigger yet (requires manual `migrate-data.ts`).
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
- `reconciliation` (Reconciliation): Daily variance (POS vs ledger).
- `payouts` (Payouts): Weekly settlement rollups, expandable order detail.
- `promo` (Promo Analysis): Discount buckets, promo % trends, correlation scatter.

## 7. Web Framework Deep Dive (`web/`)
Scaffolded via `npx sv@0.16.1 create --template minimal --types ts --add prettier eslint drizzle="database:postgresql+postgresql:neon"`. Package: `web@0.0.1`.
- **Tech Stack**: `@sveltejs/kit` ^2.63, `svelte` ^5.56 (runes mode forced in `vite.config.ts`), `vite` ^8.0, `@sveltejs/adapter-auto` ^7.0 (Vercel target), `drizzle-orm` ^0.45, `drizzle-kit` ^0.31, `@neondatabase/serverless` ^1.1 (`neon-http`), `better-sqlite3` ^12.11 (migration only), `tsx` ^4.22, `dotenv` ^17.4. (Missing: charts, auth, sync upload actions).
- **Database Connection (`src/lib/server/db/index.ts`)**: `neon(env.DATABASE_URL)` via `$env/dynamic/private`. Throws on start if `DATABASE_URL` missing. `schema` passed to `drizzle()` for relational queries.
- **Migration Pipeline (`web/scripts/migrate-data.ts`)**: Loads `web/.env`, opens SQLite via `better-sqlite3`, selects all rows, inserts to Neon Postgres in chunks of 500 (avoiding payload/timeout limits) using `.onConflictDoNothing()` for idempotency. No automated hook from Python sync exists yet.
- **Routes & Behavioral Analysis**:
  - `src/routes/+layout.svelte`: Sidebar + top header shell. Links: Dashboard (`/`), Sales (`/sales`), Businesses (`/businesses`), Settings (`/settings`). Uses runes (`let { children } = $props()`). Mock search bar & avatar. Static active nav styling on Dashboard link.
  - `src/routes/+page.svelte` (Home): Mock UI/placeholder. Hardcoded stats (`$124,500`), static CSS bar chart, mock "Download Report" button.
  - `src/routes/sales/+page.server.ts` & `+page.svelte`: Loads 50 recent orders (`orderBy(desc(orders.order_date)).limit(50)`). Displays Order ID, Date, Channel badge (Swiggy orange, Zomato red, Counter blue), Type, Status dot (green for `delivered`/`printed`), Grand Total. Gaps vs legacy: no pagination, no channel/status filters, no search, no date range, no net payout column.
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
- **P0**: Automate SQLite → Postgres sync post-import; replace placeholder home dashboard with real KPIs; manual upload for channels + register in Settings tab (no credentials required).
- **P1**: Port reconciliation and economics views; implement `/settings` tab (move Gmail/Sheets config from `.env` to UI + `settings.json`).
- **P2**: Deprecate FastAPI REST layer once parity reached; dual-write ingest directly to Postgres; data purge, DB export/import, scheduled sync.
- **P3**: Display preferences, channel white-labeling.
*Planned Endpoints*: `/api/settings`, `/api/upload/{channel}`, `/api/data/purge/{channel}`.

### Current Limitations Summary
Hardcoded ingest config (Legacy); full register replace on import; no auth in either stack; dual DB sync is manual (`migrate-data.ts`); incomplete web feature parity (MVP tables only); Counter item parsing comma-split (not exposed in web); single restaurant scope; `/settings` route 404 in web.

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
│   ├── package.json                # Node dependencies & scripts (dev, build, db:push)
│   ├── vite.config.ts              # Vite + SvelteKit plugin config (runes mode forced)
│   ├── drizzle.config.ts           # Drizzle Kit config for Neon PostgreSQL
│   ├── .env                        # Runtime config containing DATABASE_URL (gitignored)
│   ├── scripts/
│   │   └── migrate-data.ts         # Seeding script: one-way sync from SQLite to Neon Postgres
│   └── src/
│       ├── app.css                 # Global CSS design tokens & utilities
│       ├── lib/server/db/
│       │   ├── index.ts            # Neon HTTP Drizzle client singleton
│       │   └── schema.ts           # Drizzle table definitions (orders, payments, expenses, income)
│       └── routes/
│           ├── +layout.svelte      # Main app shell, sidebar navigation, header
│           ├── +page.svelte        # Home dashboard UI (placeholder metrics)
│           ├── sales/
│           │   ├── +page.server.ts # Server load function: fetches 50 recent orders
│           │   └── +page.svelte    # Order journal table UI
│           └── businesses/
│               ├── +page.server.ts # Server load function: fetches 50 recent income register rows
│               └── +page.svelte    # Daily income ledger table UI
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

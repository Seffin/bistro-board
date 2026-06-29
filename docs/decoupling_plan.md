# Decoupling Plan for Bistro Board

The goal is to transition **Bistro Board** from a highly specific dashboard tailored to "Philos" into a generic, configuration-driven tool capable of supporting any multi-channel business. 

Based on the current codebase, the coupling exists primarily in the following areas:
1. **Hardcoded Channels**: "Swiggy", "Zomato", and "Counter" are hardcoded throughout SQL queries, API endpoints, frontend charts, and data importers.
2. **Specific Nomenclature**: "Philos", "philos_sales.db", and specific email subjects are hardcoded.
3. **Database Schema**: Tables have specific columns for specific channels (e.g., `swiggy_gross`, `zomato_gross`).

Here is a step-by-step plan to decouple the application:

## 1. Implement a Centralized Configuration (`settings.json`)
We will create a `settings.json` file in the project root to drive the entire application. It will define the business identity, the active sales channels, data import rules, and UI themes.
```json
{
  "business": {
    "name": "Bistro Board",
    "db_name": "business_data.db"
  },
  "channels": [
    {
      "id": "counter",
      "name": "Counter POS",
      "color": "#10b981",
      "import_folder": "sales_reports/counter",
      "email_subject_keywords": ["Counter", "POS"]
    },
    {
      "id": "swiggy",
      "name": "Swiggy",
      "color": "#f97316",
      "import_folder": "sales_reports/swiggy",
      "email_subject_keywords": ["Annexure", "Settlement", "Swiggy Payments"]
    },
    {
      "id": "zomato",
      "name": "Zomato",
      "color": "#ef4444",
      "import_folder": "sales_reports/zomato",
      "email_subject_keywords": ["Zomato"]
    }
  ]
}
```

## 2. Database Schema Refactoring
Instead of having wide tables with hardcoded columns (e.g., `swiggy_gross`, `zomato_gross`), we should pivot the data structure to relate to `channel_id`.
* **Changes**: 
  * Refactor tables (like `income_register`, `sales_data`, `payouts`) to use a relational `channel_id` column or dynamic JSON columns.
  * Standardize database naming (e.g., migrating `philos_sales.db` -> `bistro_data.db`).
  * *Note: If we want to avoid breaking too much at once, we can auto-generate the wide columns dynamically upon database initialization based on `settings.json`.*

## 3. Backend Refactoring (`dashboard/main.py`)
* Load `settings.json` at startup.
* Provide an endpoint `/api/config` to expose public configuration (like channel colors and names) to the frontend.
* Refactor SQL queries. Replace hardcoded `SELECT swiggy_gross, zomato_gross` and `for ch in ['Swiggy', 'Zomato']` with dynamic loops that iterate over `settings['channels']`.

## 4. Frontend Refactoring (`dashboard/static/app.js` & `index.html`)
* Fetch configuration from `/api/config` on load.
* Remove hardcoded `['Counter', 'Swiggy', 'Zomato']` arrays. 
* Dynamically generate table columns, chart series, and KPI cards based on the channels defined in the config.
* Replace hardcoded "Philos" text in the HTML/JS with `config.business.name`.

## 5. Data Importers Refactoring
* `fetch_emails.py`: Instead of hardcoded strings like `"Philos-KKND"`, read the `email_subject_keywords` array for each channel from `settings.json` to build the IMAP search query dynamically.
* `import_sales.py` & `import_register.py`: Update the parsers to map data to the new database schema based on the dynamically configured channels and their respective `import_folder`s.

---
### Implementation Progress

#### Phase 1: Configuration & Channel Management ✅ (Completed)
Database-backed channel configuration for the SvelteKit web stack, replacing all hardcoded channel references.

**Implemented (TDD — Red/Green/Refactor):**
- `channels` table in Drizzle schema (`web/src/lib/server/db/schema.ts`) with `id`, `name`, `color`, `import_folder`, `email_keywords`, `is_active`, `created_at`, `updated_at`
- Seed script (`web/scripts/seed-channels.ts`) — idempotent, inserts Counter/Swiggy/Zomato
- Configuration service (`web/src/lib/server/config.ts`) — `getAllChannels()`, `getChannelById()`
- Layout server load (`web/src/routes/+layout.server.ts`) — injects `channels` into all routes
- Dynamic sidebar with channel color dots (replaces hardcoded nav)
- Dynamic sales page badges using channel colors from config
- Dynamic businesses page column headers using channel names from config
- 20 unit/integration tests across 4 test files, all passing

**Key Design Decisions:**
- Used `text` PK (slug) for channels to match existing `orders.channel` values — no join needed
- `email_keywords` stored as JSON string in `text` column — metadata for Python pipeline, not queried by web app
- Configuration service filters by `is_active = true` so channels can be soft-disabled
- Channel colors applied via inline `style` attributes for maximum flexibility (no CSS class per channel)

#### Phase 2: Executive Overview Dashboard ✅ (Completed)
Dynamic, configuration-driven executive landing page (`/`) built with Svelte 5 runes and ApexCharts, replacing all hardcoded legacy dashboard widgets.

**Implemented (TDD — Red/Green/Refactor):**
- Server-side KPI aggregations (`web/src/routes/+page.server.ts`) calculating Net Payout, Revenue Retained %, Total Volume, Success Rate %, and dynamic per-channel stats (Gross Sales, Orders, Ticket AOV)
- Dynamic monthly grouping (`YYYY-MM`) directly from `orders.order_date` and `expenses.date`
- 7 enterprise-grade chart components (`web/src/lib/components/charts/`) wrapping ApexCharts with Svelte 5 runes and actions:
  - **Revenue Trends** (Line chart)
  - **Channel Mix** (Area chart)
  - **Profit & Loss Trend** (Combo Bar + Line chart)
  - **Expense Breakdown** (Donut chart)
  - **Hourly Velocity** (Bar chart, peak order volume 11:00 to 22:00)
  - **Weekly Performance** (Bar chart, weekday revenue distribution)
  - **Monthly Contribution** (Donut chart, aggregate channel revenue share)
- Dynamic Date Range Picker filtering (`?start=YYYY-MM-DD&end=YYYY-MM-DD`) utilizing Drizzle `between` clauses
- Progressive enhancement Sync form action (`?/sync`) simulating live ETL execution with Svelte 5 `$state` loading UI
- 40 unit/integration tests across 11 test files, 100% passing with zero `svelte-check` warnings

#### Phase 3: Detailed Analytics Views ✅ (Completed)
Expanded the SvelteKit web stack with 8 fully-featured analytics tabs, supporting unified date range filtering and responsive design.
- Implemented `/sales`, `/businesses`, `/economics`, `/counter`, `/orders`, `/ledger`, `/reconciliation`, `/payouts`, `/promo`.
- Shared date range sync via URL parameters.
- Comprehensive test coverage with 178 passing tests.

#### Phase 4: Settings UI & Data Import Decoupling ✅ (Completed)
- **Settings UI**: Built `/settings` with `ChannelsTab.svelte`, `UploadTab.svelte`, and `CredentialsTab.svelte`.
- **Database Configuration**: Added `app_settings` schema to store credentials.
- **Python ETL Decoupling**: Refactored `fetch_emails.py`, `import_sales.py`, and `download_sheet.py` to use `settings.json` generated by SvelteKit, removing hardcoded paths and keys.
- **End-to-End Orchestration**: Implemented `/api/sync/+server.ts` streaming endpoint that generates config and spawns the Python scripts sequentially, replacing the legacy REST trigger.

#### Phase 5: Production Hardening & Deployment ✅ (Completed)
Finalized the SvelteKit application for production deployment, focusing on security, performance, observability, and legacy deprecation.
- **Authentication**: Session-based login using bcrypt password hashing and `hooks.server.ts` protection.
- **Caching Layer**: In-memory TTL cache (`node-cache`) for expensive dashboard computations, with automatic invalidation post-sync.
- **Observability**: Structured JSON logging (`pino`) and global toast notifications.
- **Data Export**: Server-side CSV generation endpoints for Orders, Ledger, and Reconciliation views.
- **Legacy Deprecation**: Deleted the old FastAPI `dashboard/` and updated `pyproject.toml` and documentation.
- **Deployment Strategy**: Created `vercel.json` and a comprehensive `docs/DEPLOYMENT.md` guide covering Vercel + Neon.

#### Phase 6: UI Polish & User Management ✅ (Completed)
Finalized the user experience with modern aesthetics and robust user administration.
- **Authentication System**: Migrated to a database-backed session system (`users` table) with login and registration flows.
- **Modern UI & Theming**: Implemented a responsive dark/light mode toggle system (Svelte 5 `$state`), a premium SaaS-inspired colour palette, and glassmorphism micro-animations.
- **Header & Navigation**: Replaced the static profile area with a dynamic Avatar Dropdown, and refined the overall sidebar and header layout.
- **Default Standards**: Built a unified `date-filter` utility ensuring all dashboards and APIs consistently default to analyzing the last 30 days of data.

#### Phase 7: UI/UX Enhancements & Channel Filtering ✅ (Completed)
Finalized navigation ergonomics and implemented global channel filtering to streamline data analysis.
- **Top Tab Navigation**: Migrated all specific dashboard views (Platform Economics, Order Journal, etc.) from the sidebar into a sticky `TabBar` component positioned directly beneath the header. Implemented responsive flex wrapping to ensure tab visibility without horizontal scroll bars.
- **Header Channel Filter**: Introduced a unified `ChannelFilter` dropdown next to the Date Picker to allow seamless toggling between individual sales channels or aggregate views.
- **Persistent State Syncing**: Interlocked the `TabBar`, Sidebar, Date Picker, and `ChannelFilter` via `$page.url.searchParams`, ensuring navigation automatically preserves both date boundaries and channel focus across all views.
- **Database-Level Data Segregation**: Upgraded the primary `load` functions in `+page.server.ts` to consume the URL `channel` parameter, injecting dynamic `eq(orders.channel)` Drizzle filters. Chart components and KPI datasets implicitly inherited this filtered context to accurately reflect the active channel context.

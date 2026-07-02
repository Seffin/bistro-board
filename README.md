# Bistro Board

A pluggable, configuration-driven business analytics dashboard for multi-channel restaurants. Built with **SvelteKit 5**, **Drizzle ORM**, and **Neon PostgreSQL**, it integrates Counter POS, Swiggy, and Zomato sales reports alongside business ledgers (Expenses and Income register).

---

## 📂 Directory Layout

* **`web/`**: SvelteKit application — the sole frontend and backend.
* **`sales_reports/`**: Excel report landing directories:
  * `counter/`: Daily register sheets from POS.
  * `swiggy/`: Weekly settlement annexure files.
  * `zomato/`: Weekly order level payout sheets.
* **`docs/`**: Kakkanad Business Register Excel ledger and project documentation.
* **`fetch_emails.py`**: Auto-downloads reports matching custom subjects from Gmail.
* **`download_sheet.py`**: Syncs Google Sheets ledgers down to local files using a Service Account JSON.
* **`import_sales.py`**: Parses Excel reports into a unified database schema.
* **`import_register.py`**: Imports OpEx expenses and daily bank credits.

---

## 🚀 Getting Started

### 1. Setup Python Environment (for data import scripts)
```bash
python -m venv venv

# Activate on Windows (PowerShell)
venv\Scripts\Activate.ps1

# Activate on Mac/Linux
source venv/bin/activate

pip install -e .
```

### 2. Setup SvelteKit Web App
```bash
cd web
npm install
```

### 3. Configure Environment Variables
1. Copy `web/.env.example` to `web/.env` and fill in the values:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `SESSION_SECRET`: A random secret for signing session cookies
2. For Python data import, create a root `.env` with Gmail/Google credentials.

### 4. Run the Application
```bash
cd web
npm run dev
```

Open `http://localhost:5173` and log in with your configured credentials.

### 5. Push Database Schema
```bash
cd web
npm run db:push
```

---

## 📊 Features

- **Executive Dashboard**: KPIs, revenue trends, channel mix, P&L, expenses, hourly velocity, weekly performance, monthly summary with click-through drill-downs
- **Detailed Analytics**: Platform Economics, Channel Insights (Multi-Channel), Order Journal, Business Ledger, Reconciliation, Payout Analytics, Promo Impact (Before/After analysis)
- **Settings UI**: Channel CRUD, manual file upload, credential management
- **Authentication**: Session-based login with bcrypt password hashing
- **Caching**: In-memory TTL cache for expensive dashboard queries
- **Data Export**: CSV downloads for all table views
- **Structured Logging**: pino-based request and error logging

---

## 📦 Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment instructions (Vercel + Neon PostgreSQL).

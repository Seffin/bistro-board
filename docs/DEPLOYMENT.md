# Deployment Guide — Bistro Board

This guide covers deploying Bistro Board to **Vercel** with **Neon PostgreSQL** as the database.

---

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) account with a PostgreSQL database
- Node.js 18+ and npm installed locally
- Python 3.10+ (for data import scripts)

---

## 1. Database Setup (Neon)

1. Create a new project in [Neon Console](https://console.neon.tech).
2. Copy the **pooled connection string** (e.g., `postgresql://user:pass@host/dbname?sslmode=require`).
3. Push the schema from your local machine:
   ```bash
   cd web
   echo "DATABASE_URL=your_neon_connection_string" > .env
   npm run db:push
   ```
4. Seed initial channel data:
   ```bash
   npx tsx scripts/seed-channels.ts
   ```

---

## 2. Generate Session Secret

Generate a random string for your `SESSION_SECRET` (used to securely sign auth cookies):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Copy the output — you'll need it for Vercel.

---

## 3. Vercel Deployment

### Option A: Vercel CLI

```bash
cd web
npx vercel --prod
```

### Option B: GitHub Integration

1. Push the repository to GitHub.
2. Import the repository in Vercel Dashboard.
3. Set the **Root Directory** to `web/`.
4. Vercel auto-detects SvelteKit and configures the build.

### Environment Variables

Set the following in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | ✅ |
| `SESSION_SECRET` | Random string for signing session cookies (min 32 chars) | ✅ |
| `LOG_LEVEL` | Logging level (`info`, `warn`, `error`, `debug`) | ❌ (default: `info`) |
| `NODE_ENV` | Set to `production` | ❌ (auto-set by Vercel) |

---

## 4. Initial Auth Setup
Once deployed, navigate to `/register` on your Vercel domain to create your first administrator account. This will save a secure `bcrypt` hashed password in your Neon `users` table. Subsequent logins will use the `/login` route.

---

## 4. Python Data Import Scripts

The Python scripts (`fetch_emails.py`, `import_sales.py`, `import_register.py`, `download_sheet.py`) are responsible for data ingestion and run **outside** the Vercel deployment.

### Strategy Options

#### Option A: Local Cron Job (Recommended for small deployments)
Run the import scripts on a local machine or a small VPS via cron:

```bash
# Example crontab entry (runs daily at 2 AM)
0 2 * * * cd /path/to/bistro-board && python fetch_emails.py && python import_sales.py && python import_register.py
```

> **Note**: The Python scripts write to the Neon PostgreSQL database. Configure `DATABASE_URL` in a root `.env` file.

#### Option B: GitHub Actions (CI/CD approach)
Create a GitHub Action that runs the import scripts on a schedule:

```yaml
# .github/workflows/sync-data.yml
name: Sync Data
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -e .
      - run: python fetch_emails.py
        env:
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}
      - run: python import_sales.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - run: python import_register.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### Option C: Vercel's SvelteKit Sync Endpoint
The app includes a `/api/sync` endpoint that spawns Python scripts via `child_process`. This works in local development but **will not work on Vercel** (no Python runtime in Node.js serverless functions). Use Options A or B for production.

---

## 5. Database Migrations

When the schema changes:

```bash
cd web
npm run db:generate  # Generate migration files
npm run db:push      # Push schema to Neon
```

For production, run migrations before deploying:
```bash
DATABASE_URL=your_production_url npm run db:push
```

---

## 6. Verification Checklist

After deployment, verify:

- [ ] Login page loads at `/login`
- [ ] Invalid credentials show error
- [ ] Valid credentials redirect to dashboard
- [ ] Dashboard KPIs and charts render correctly
- [ ] Date range filtering works
- [ ] All analytics tabs load (Orders, Ledger, Reconciliation, etc.)
- [ ] Settings page loads and channels are listed
- [ ] CSV export downloads correctly
- [ ] Logout redirects to login
- [ ] API endpoints return 401 without authentication

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Database connection failed" | Check `DATABASE_URL` env var, ensure Neon project is active |
| "Invalid username or password" | Ensure you have registered an account at `/register` or verify your credentials |
| Login loop (keeps redirecting to /login) | Verify `SESSION_SECRET` is set, check cookie domain settings |
| Sync endpoint fails | Python scripts don't run on Vercel — use local cron or GitHub Actions |
| Blank charts/no data | Run data import scripts against the production database |

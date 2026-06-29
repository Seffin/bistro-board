# Bistro Board — Modern Web Stack

This is the modern web frontend and serverless backend for **Bistro Board** (Philos Business Dashboard), built with **SvelteKit 5**, **Drizzle ORM**, and **Neon Serverless PostgreSQL**.

## 🛠 Tech Stack & Architecture

- **Framework**: [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5 runes mode) + Vite 8
- **Language**: TypeScript
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech) (`@neondatabase/serverless` via `neon-http`)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team) + Drizzle Kit
- **Styling**: Vanilla CSS with customized design tokens & utilities (`src/app.css`)
- **Target Environment**: Vercel Serverless / Edge

## 🚀 Key Features & Routes

- **`/` (Dashboard Home)**: Executive Overview featuring dynamic KPI cards, Theme System tabs, and 7 interactive ApexCharts (Revenue Trends, Channel Mix, P&L Combo, Expense Donut, Hourly Velocity, Weekly Performance, and Monthly Contribution). Includes interactive Date Range filtering and live ETL Sync simulation.
- **`/sales` (Order Journal)**: Displays the 50 most recent orders across Counter POS, Swiggy, and Zomato with real-time payment status and channel badges.
- **`/businesses` (Income Register)**: Displays recent daily income ledger rows, including cash, bank deposits, and platform payouts.
- **`/settings` (Planned)**: Channel management, manual data uploads, and sync schedule configuration.

---

## 💻 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
This project requires a `DATABASE_URL` pointing to a Neon PostgreSQL instance. If your project is linked to Vercel, pull your environment variables locally into `.env`:
```bash
npx vercel link
npx vercel env pull .env
```
*(Make sure a `.env` file exists in the `web/` root containing `DATABASE_URL=postgresql://...`)*

### 3. Push Database Schema
Push the Drizzle ORM table definitions (`src/lib/server/db/schema.ts`) to your Neon Postgres instance:
```bash
npm run db:push
```

### 4. Seed / Migrate Data from SQLite
To populate your cloud PostgreSQL database with existing local data from the Python ingestion pipeline (`philos_sales.db`), run the one-way migration script:
```bash
npx tsx scripts/migrate-data.ts
```

### 5. Start Development Server
Start the Vite development server:
```bash
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Building & Production

To create a production build of the application:
```bash
npm run build
```

You can preview the production build locally with:
```bash
npm run preview
```

## 🧹 Code Quality & Management Scripts

- **Type Checking & Svelte Check**: `npm run check`
- **Linting & Formatting**: `npm run lint`
- **Drizzle Studio (Visual DB Manager)**: `npm run db:studio`
- **Generate Migrations**: `npm run db:generate`

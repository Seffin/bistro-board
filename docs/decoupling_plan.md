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
### Next Steps
If you agree with this approach, I propose we tackle this in the following phases:
1. **Phase 1: Configuration & UI Shell** - Create `settings.json`, create the `/api/config` endpoint, and update the frontend HTML/JS to use dynamic names and colors.
2. **Phase 2: Database & Backend APIs** - Refactor the database schema and update the API endpoints to aggregate data dynamically.
3. **Phase 3: Data Importers** - Update the Python scripts to read from `settings.json` and insert data generically.

How would you like to proceed?

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/server/db/schema.js';
import { and, gte, lte } from 'drizzle-orm';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../.env') });

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function check() {
	const rows = await db.select()
		.from(schema.income_register)
		.where(and(gte(schema.income_register.date, '2026-06-01'), lte(schema.income_register.date, '2026-06-30')));
	console.log('June 2026 rows from Neon PostgreSQL income_register:');
	for (const row of rows) {
		console.log(JSON.stringify(row));
	}
	process.exit(0);
}

check().catch(console.error);

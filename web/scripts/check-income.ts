import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/server/db/schema.js';
import { sql } from 'drizzle-orm';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set in .env');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function check() {
	console.log('Connecting to Neon DB and running queries...');

	// 1. Orders Gross Revenue (grand_total sum, excluding cancelled/failed)
	const orderRes = await db.select({
		total_gross: sql<number>`SUM(${schema.orders.grand_total})`,
		count: sql<number>`COUNT(*)`
	}).from(schema.orders).where(sql`${schema.orders.status} NOT IN ('cancelled', 'failed')`);

	// 2. Income Register total_income sum
	const incomeRes = await db.select({
		total_income: sql<number>`SUM(${schema.income_register.total_income})`,
		count: sql<number>`COUNT(*)`
	}).from(schema.income_register);

	console.log('\n--- OVERALL DATABASE STATS ---');
	console.log(`Orders Gross Revenue (excluding cancelled/failed): Rs ${(orderRes[0]?.total_gross || 0).toLocaleString('en-IN')} (across ${orderRes[0]?.count || 0} active orders)`);
	console.log(`Ledger Total Income: Rs ${(incomeRes[0]?.total_income || 0).toLocaleString('en-IN')} Lakhs (across ${incomeRes[0]?.count || 0} days recorded)`);
	console.log(`Wait, if Total Income is in Lakhs, Rs ${(incomeRes[0]?.total_income || 0)} Lakhs = Rs ${((incomeRes[0]?.total_income || 0) * 100000).toLocaleString('en-IN')}`);

	// Let's do a comparison on a common month, e.g. June 2026
	const startJune = new Date('2026-06-01T00:00:00Z');
	const endJune = new Date('2026-06-30T23:59:59Z');

	const orderJuneRes = await db.select({
		total_gross: sql<number>`SUM(${schema.orders.grand_total})`,
		total_net_payout: sql<number>`SUM(${schema.orders.net_payout})`
	}).from(schema.orders)
	.where(sql`${schema.orders.status} NOT IN ('cancelled', 'failed') AND ${schema.orders.order_date} BETWEEN ${startJune} AND ${endJune}`);

	const registerJuneRes = await db.select({
		total_income: sql<number>`SUM(${schema.income_register.total_income})`,
		total_petpooja_net: sql<number>`SUM(${schema.income_register.petpooja_net})`,
		total_swiggy_payout: sql<number>`SUM(${schema.income_register.swiggy_payout})`,
		total_zomato_payout: sql<number>`SUM(${schema.income_register.zomato_payout})`
	}).from(schema.income_register)
	.where(sql`${schema.income_register.date} BETWEEN '2026-06-01' AND '2026-06-30'`);

	console.log('\n--- JUNE 2026 COMPARISON ---');
	console.log('Orders table (raw POS + platform annexures):');
	console.log(`  Gross Revenue (grand_total): Rs ${(orderJuneRes[0]?.total_gross || 0).toLocaleString('en-IN')}`);
	console.log(`  Net Payout (net_payout sum):  Rs ${(orderJuneRes[0]?.total_net_payout || 0).toLocaleString('en-IN')}`);

	console.log('Income Register (Kakkanad Business Register Ledger):');
	console.log(`  Total Income (total_income sum): Rs ${(registerJuneRes[0]?.total_income || 0)} Lakhs (= Rs ${((registerJuneRes[0]?.total_income || 0) * 100000).toLocaleString('en-IN')})`);
	console.log(`  PetPooja Net (counter) sum:      Rs ${(registerJuneRes[0]?.total_petpooja_net || 0)} Lakhs (= Rs ${((registerJuneRes[0]?.total_petpooja_net || 0) * 100000).toLocaleString('en-IN')})`);
	console.log(`  Swiggy Payout sum:               Rs ${(registerJuneRes[0]?.total_swiggy_payout || 0)} Lakhs (= Rs ${((registerJuneRes[0]?.total_swiggy_payout || 0) * 100000).toLocaleString('en-IN')})`);
	console.log(`  Zomato Payout sum:               Rs ${(registerJuneRes[0]?.total_zomato_payout || 0)} Lakhs (= Rs ${((registerJuneRes[0]?.total_zomato_payout || 0) * 100000).toLocaleString('en-IN')})`);

	// Let's get breakdown of orders by channel in June 2026
	const channelJuneRes = await db.select({
		channel: schema.orders.channel,
		gross: sql<number>`SUM(${schema.orders.grand_total})`,
		net: sql<number>`SUM(${schema.orders.net_payout})`
	}).from(schema.orders)
	.where(sql`${schema.orders.status} NOT IN ('cancelled', 'failed') AND ${schema.orders.order_date} BETWEEN ${startJune} AND ${endJune}`)
	.groupBy(schema.orders.channel);

	console.log('\n--- ORDERS BY CHANNEL IN JUNE 2026 ---');
	for (const ch of channelJuneRes) {
		console.log(`  ${ch.channel}: Gross = Rs ${ch.gross?.toLocaleString('en-IN')}, Net Payout = Rs ${ch.net?.toLocaleString('en-IN')}`);
	}

	process.exit(0);
}

check().catch(console.error);

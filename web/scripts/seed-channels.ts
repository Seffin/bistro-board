/**
 * Seed script: Inserts default channels into the Neon PostgreSQL database.
 *
 * Usage:
 *   npx tsx scripts/seed-channels.ts
 *
 * Idempotent: uses onConflictDoUpdate so it can be run multiple times safely.
 * Requires DATABASE_URL in web/.env.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { channels } from '../src/lib/server/db/schema';
import { DEFAULT_CHANNELS } from '../src/lib/server/db/seed-data';

async function seed() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		console.error('❌ DATABASE_URL is not set. Check web/.env');
		process.exit(1);
	}

	const client = neon(connectionString);
	const db = drizzle(client);

	console.log('🌱 Seeding channels...');

	for (const channel of DEFAULT_CHANNELS) {
		await db
			.insert(channels)
			.values(channel)
			.onConflictDoUpdate({
				target: channels.id,
				set: {
					name: channel.name,
					color: channel.color,
					import_folder: channel.import_folder,
					email_keywords: channel.email_keywords,
					updated_at: new Date()
				}
			});
		console.log(`  ✅ ${channel.name} (${channel.id})`);
	}

	console.log(`\n🎉 Seeded ${DEFAULT_CHANNELS.length} channels successfully.`);
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});

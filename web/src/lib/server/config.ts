import { db } from '$lib/server/db';
import { channels } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export type Channel = typeof channels.$inferSelect;

/**
 * Returns all active channels from the database.
 * Used by the layout to build sidebar navigation and by pages for badge rendering.
 */
export async function getAllChannels(): Promise<Channel[]> {
	return db.select().from(channels).where(eq(channels.is_active, true));
}

/**
 * Returns a single channel by its slug ID.
 * Returns undefined if not found.
 */
export async function getChannelById(id: string): Promise<Channel | undefined> {
	const results = await db.select().from(channels).where(eq(channels.id, id));
	return results[0];
}

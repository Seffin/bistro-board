import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { channels } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const allChannels = await db.select().from(channels).orderBy(channels.name);
	return json(allChannels);
};

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	
	try {
		const newChannel = await db.insert(channels).values({
			id: data.id,
			name: data.name,
			color: data.color,
			import_folder: data.import_folder,
			email_keywords: data.email_keywords ? JSON.stringify(data.email_keywords) : null,
			is_active: data.is_active ?? true
		}).returning();
		
		return json(newChannel[0], { status: 201 });
	} catch (error: any) {
		return json({ error: error.message }, { status: 400 });
	}
};

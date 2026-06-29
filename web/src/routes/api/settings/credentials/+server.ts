import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { app_settings } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const CREDENTIAL_KEYS = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'GOOGLE_SHEET_ID'];

export const GET: RequestHandler = async () => {
	try {
		const settings = await db.select().from(app_settings).where(inArray(app_settings.key, CREDENTIAL_KEYS));
		
		const credentials: Record<string, string> = {
			GMAIL_USER: '',
			GMAIL_APP_PASSWORD: '',
			GOOGLE_SHEET_ID: ''
		};

		for (const setting of settings) {
			credentials[setting.key] = setting.value;
		}

		return json(credentials);
	} catch (error: any) {
		return json({ error: error.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	
	try {
		for (const key of CREDENTIAL_KEYS) {
			if (data[key] !== undefined) {
				// Upsert logic for Drizzle in PostgreSQL: insert, onConflictDoUpdate
				await db.insert(app_settings)
					.values({
						key,
						value: data[key],
						updated_at: new Date()
					})
					.onConflictDoUpdate({
						target: app_settings.key,
						set: {
							value: data[key],
							updated_at: new Date()
						}
					});
			}
		}
		
		return json({ success: true, message: 'Credentials updated successfully' });
	} catch (error: any) {
		return json({ error: error.message }, { status: 400 });
	}
};

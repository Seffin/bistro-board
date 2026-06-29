import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	verifyPassword,
	createSessionToken,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// The hooks.server.ts handle already redirects authenticated users away from /login.
	// This load function just returns an empty object for the page.
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required.', username });
		}

		// Check user in database
		const result = await db.select().from(users).where(eq(users.username, username));

		if (result.length === 0 || !verifyPassword(password, result[0].password_hash)) {
			return fail(401, { error: 'Invalid username or password.', username });
		}

		const sessionSecret = env.SESSION_SECRET || 'dev-fallback-secret-change-me';

		// Create session token and set cookie
		const token = createSessionToken(username, sessionSecret);
		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: env.NODE_ENV === 'production',
			maxAge: SESSION_MAX_AGE
		});

		throw redirect(303, '/');
	}
};

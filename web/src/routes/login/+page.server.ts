import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	verifyPassword,
	createSessionToken,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

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

		const adminUser = env.ADMIN_USER?.trim();
		let adminPasswordHash = env.ADMIN_PASSWORD_HASH?.trim();
		const sessionSecret = env.SESSION_SECRET || 'dev-fallback-secret-change-me';

		// Clean quotes if Vite passes them literally
		if (adminPasswordHash?.startsWith("'") && adminPasswordHash?.endsWith("'")) {
			adminPasswordHash = adminPasswordHash.slice(1, -1);
		} else if (adminPasswordHash?.startsWith('"') && adminPasswordHash?.endsWith('"')) {
			adminPasswordHash = adminPasswordHash.slice(1, -1);
		}

		if (!adminUser || !adminPasswordHash) {
			console.error('[AUTH] ADMIN_USER or ADMIN_PASSWORD_HASH not configured in environment.');
			return fail(500, { error: 'Authentication is not configured. Contact administrator.', username });
		}

		// Verify credentials
		if (username !== adminUser || !verifyPassword(password, adminPasswordHash)) {
			return fail(401, { error: 'Invalid username or password.', username });
		}

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

import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, createSessionToken } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { hashSync } from 'bcryptjs';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const fullName = data.get('fullName')?.toString().trim();
		const username = data.get('username')?.toString().trim();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();

		if (!fullName || !username || !email || !password || !confirmPassword) {
			return fail(400, { error: 'All fields are required', username, email, fullName });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match', username, email, fullName });
		}

		if (password.length < 6) {
			return fail(400, {
				error: 'Password must be at least 6 characters',
				username,
				email,
				fullName
			});
		}

		// Check if username or email exists
		const existingUser = await db.select().from(users).where(eq(users.username, username));

		if (existingUser.length > 0) {
			return fail(400, { error: 'Username is already taken', email, fullName });
		}

		const existingEmail = await db.select().from(users).where(eq(users.email, email));

		if (existingEmail.length > 0) {
			return fail(400, { error: 'Email is already registered', username, fullName });
		}

		// Hash password and insert user
		const passwordHash = hashSync(password, 10);

		await db.insert(users).values({
			username,
			email,
			full_name: fullName,
			password_hash: passwordHash
		});

		// Log the user in automatically
		const secret = env.SESSION_SECRET || 'fallback-secret-key-for-dev';
		const token = createSessionToken(username, secret);

		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: SESSION_MAX_AGE
		});

		throw redirect(303, '/');
	}
} satisfies Actions;

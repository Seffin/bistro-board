import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	throw redirect(303, '/login');
};

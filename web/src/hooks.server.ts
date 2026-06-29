import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifySessionToken, SESSION_COOKIE_NAME } from '$lib/server/auth';
import logger from '$lib/server/logger';

/**
 * Server hook: protects all routes except /login by checking for a valid session cookie.
 * On valid session, populates event.locals.user for downstream use.
 * Logs all requests with timing for observability.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const sessionSecret = env.SESSION_SECRET || 'dev-fallback-secret-change-me';
	const token = event.cookies.get(SESSION_COOKIE_NAME);

	if (token) {
		const username = verifySessionToken(token, sessionSecret);
		if (username) {
			event.locals.user = { username };
		}
	}

	// Allow access to /login and /register without authentication
	const isAuthPage = event.url.pathname === '/login' || event.url.pathname === '/register';

	if (!event.locals.user && !isAuthPage) {
		// API routes return 401 instead of redirecting
		if (event.url.pathname.startsWith('/api/')) {
			logger.warn({ path: event.url.pathname, method: event.request.method }, 'Unauthorized API request');
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(303, '/login');
	}

	// If already logged in and visiting an auth page, redirect to dashboard
	if (event.locals.user && isAuthPage) {
		throw redirect(303, '/');
	}

	const response = await resolve(event);
	const duration = Date.now() - start;

	// Log request with timing (skip static assets for noise reduction)
	if (!event.url.pathname.startsWith('/_app/') && !event.url.pathname.startsWith('/favicon')) {
		logger.info({
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			duration: `${duration}ms`,
			user: event.locals.user?.username || 'anonymous'
		}, 'request');
	}

	return response;
};

/**
 * Server error handler: logs errors with structured output via pino.
 */
export const handleError: HandleServerError = ({ error, event }) => {
	const err = error as Error;
	logger.error({
		method: event.request.method,
		path: event.url.pathname,
		error: err?.message || String(error),
		stack: err?.stack
	}, 'Unhandled server error');

	return {
		message: 'An unexpected error occurred. Please try again later.'
	};
};

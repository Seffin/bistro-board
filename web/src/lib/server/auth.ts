import { compareSync } from 'bcryptjs';
import { createHmac, randomBytes } from 'crypto';

// --- Constants ---
export const SESSION_COOKIE_NAME = 'bistro_session';
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export function verifyPassword(plaintext: string, hash: string): boolean {
	try {
		return compareSync(plaintext, hash);
	} catch {
		return false;
	}
}

/**
 * Create an HMAC-based session token encoding the username and expiry.
 * Format: base64(username:expiry):signature
 */
export function createSessionToken(username: string, secret: string): string {
	const expiry = Date.now() + SESSION_MAX_AGE * 1000;
	const payload = Buffer.from(`${username}:${expiry}`).toString('base64url');
	const signature = createHmac('sha256', secret).update(payload).digest('base64url');
	return `${payload}.${signature}`;
}

/**
 * Verify an HMAC session token and return the username if valid.
 * Returns null if the token is invalid or expired.
 */
export function verifySessionToken(token: string, secret: string): string | null {
	try {
		const [payload, signature] = token.split('.');
		if (!payload || !signature) return null;

		// Verify HMAC signature
		const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url');
		if (signature !== expectedSignature) return null;

		// Decode payload and check expiry
		const decoded = Buffer.from(payload, 'base64url').toString();
		const [username, expiryStr] = decoded.split(':');
		const expiry = parseInt(expiryStr, 10);

		if (!username || isNaN(expiry)) return null;
		if (Date.now() > expiry) return null;

		return username;
	} catch {
		return null;
	}
}

/**
 * Generate a random session secret (for first-time setup documentation).
 */
export function generateSecret(): string {
	return randomBytes(32).toString('base64url');
}

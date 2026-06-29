import { describe, it, expect } from 'vitest';
import { hashSync } from 'bcryptjs';
import {
	verifyPassword,
	createSessionToken,
	verifySessionToken,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '../auth';

describe('Auth Service', () => {
	const TEST_SECRET = 'test-secret-key-for-hmac-signing';

	describe('verifyPassword', () => {
		it('should return true for a correct password', () => {
			const hash = hashSync('correctPassword', 10);
			expect(verifyPassword('correctPassword', hash)).toBe(true);
		});

		it('should return false for an incorrect password', () => {
			const hash = hashSync('correctPassword', 10);
			expect(verifyPassword('wrongPassword', hash)).toBe(false);
		});

		it('should return false for an empty password', () => {
			const hash = hashSync('correctPassword', 10);
			expect(verifyPassword('', hash)).toBe(false);
		});

		it('should return false for a malformed hash', () => {
			expect(verifyPassword('password', 'not-a-valid-hash')).toBe(false);
		});
	});

	describe('createSessionToken', () => {
		it('should return a string with payload and signature separated by dot', () => {
			const token = createSessionToken('admin', TEST_SECRET);
			const parts = token.split('.');
			expect(parts).toHaveLength(2);
			expect(parts[0].length).toBeGreaterThan(0);
			expect(parts[1].length).toBeGreaterThan(0);
		});

		it('should encode the username in the payload', () => {
			const token = createSessionToken('admin', TEST_SECRET);
			const [payload] = token.split('.');
			const decoded = Buffer.from(payload, 'base64url').toString();
			expect(decoded).toContain('admin');
		});

		it('should produce different tokens for different users', () => {
			const token1 = createSessionToken('admin', TEST_SECRET);
			const token2 = createSessionToken('manager', TEST_SECRET);
			expect(token1).not.toBe(token2);
		});

		it('should produce different tokens with different secrets', () => {
			const token1 = createSessionToken('admin', TEST_SECRET);
			const token2 = createSessionToken('admin', 'different-secret');
			expect(token1).not.toBe(token2);
		});
	});

	describe('verifySessionToken', () => {
		it('should return the username for a valid token', () => {
			const token = createSessionToken('admin', TEST_SECRET);
			const result = verifySessionToken(token, TEST_SECRET);
			expect(result).toBe('admin');
		});

		it('should return null for a token signed with a different secret', () => {
			const token = createSessionToken('admin', TEST_SECRET);
			const result = verifySessionToken(token, 'wrong-secret');
			expect(result).toBeNull();
		});

		it('should return null for a tampered payload', () => {
			const token = createSessionToken('admin', TEST_SECRET);
			const [, signature] = token.split('.');
			const tamperedPayload = Buffer.from('hacker:9999999999999').toString('base64url');
			const result = verifySessionToken(`${tamperedPayload}.${signature}`, TEST_SECRET);
			expect(result).toBeNull();
		});

		it('should return null for a tampered signature', () => {
			const token = createSessionToken('admin', TEST_SECRET);
			const [payload] = token.split('.');
			const result = verifySessionToken(`${payload}.tampered-signature`, TEST_SECRET);
			expect(result).toBeNull();
		});

		it('should return null for an empty string', () => {
			expect(verifySessionToken('', TEST_SECRET)).toBeNull();
		});

		it('should return null for a token without a dot separator', () => {
			expect(verifySessionToken('no-dot-separator', TEST_SECRET)).toBeNull();
		});

		it('should return null for an expired token', () => {
			// Manually craft an expired token
			const expiry = Date.now() - 1000; // 1 second ago
			const payload = Buffer.from(`admin:${expiry}`).toString('base64url');
			const { createHmac } = require('crypto');
			const signature = createHmac('sha256', TEST_SECRET).update(payload).digest('base64url');
			const token = `${payload}.${signature}`;

			const result = verifySessionToken(token, TEST_SECRET);
			expect(result).toBeNull();
		});
	});

	describe('constants', () => {
		it('should export a session cookie name', () => {
			expect(SESSION_COOKIE_NAME).toBe('bistro_session');
		});

		it('should export a 24-hour max age in seconds', () => {
			expect(SESSION_MAX_AGE).toBe(86400);
		});
	});
});

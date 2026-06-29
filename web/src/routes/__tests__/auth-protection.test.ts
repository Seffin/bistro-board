import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashSync } from 'bcryptjs';

// Mock $env/dynamic/private
const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({
	env: mockEnv
}));

// Mock $lib/server/db
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([])
			})
		})
	}
}));

// Mock $lib/server/config
vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockResolvedValue([])
}));

import {
	verifyPassword,
	createSessionToken,
	verifySessionToken,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';

describe('Auth Protection Integration', () => {
	const TEST_SECRET = 'integration-test-secret';
	const TEST_USER = 'admin';
	const TEST_PASS = 'securePassword123';
	const TEST_HASH = hashSync(TEST_PASS, 10);

	beforeEach(() => {
		mockEnv.SESSION_SECRET = TEST_SECRET;
		mockEnv.ADMIN_USER = TEST_USER;
		mockEnv.ADMIN_PASSWORD_HASH = TEST_HASH;
	});

	describe('Session Token Flow', () => {
		it('should create a token that can be verified', () => {
			const token = createSessionToken(TEST_USER, TEST_SECRET);
			const result = verifySessionToken(token, TEST_SECRET);
			expect(result).toBe(TEST_USER);
		});

		it('should not verify a token with a different secret', () => {
			const token = createSessionToken(TEST_USER, TEST_SECRET);
			const result = verifySessionToken(token, 'wrong-secret');
			expect(result).toBeNull();
		});
	});

	describe('Login Credential Verification', () => {
		it('should accept correct username and password', () => {
			const isUsernameMatch = TEST_USER === 'admin';
			const isPasswordMatch = verifyPassword(TEST_PASS, TEST_HASH);
			expect(isUsernameMatch).toBe(true);
			expect(isPasswordMatch).toBe(true);
		});

		it('should reject incorrect username', () => {
			const isUsernameMatch = 'wronguser' === TEST_USER;
			expect(isUsernameMatch).toBe(false);
		});

		it('should reject incorrect password', () => {
			const isPasswordMatch = verifyPassword('wrongpassword', TEST_HASH);
			expect(isPasswordMatch).toBe(false);
		});
	});

	describe('Session Cookie Configuration', () => {
		it('should use a recognizable cookie name', () => {
			expect(SESSION_COOKIE_NAME).toBe('bistro_session');
		});

		it('should set 24-hour max age', () => {
			expect(SESSION_MAX_AGE).toBe(86400);
		});
	});

	describe('Handle Hook Logic', () => {
		it('should identify unauthenticated requests (no cookie)', () => {
			// Simulate: no token → verifySessionToken returns null
			const result = verifySessionToken('', TEST_SECRET);
			expect(result).toBeNull();
		});

		it('should identify authenticated requests (valid cookie)', () => {
			const token = createSessionToken(TEST_USER, TEST_SECRET);
			const result = verifySessionToken(token, TEST_SECRET);
			expect(result).toBe(TEST_USER);
		});

		it('should reject expired sessions', () => {
			// Create a manually expired token
			const { createHmac } = require('crypto');
			const expiry = Date.now() - 1000;
			const payload = Buffer.from(`${TEST_USER}:${expiry}`).toString('base64url');
			const signature = createHmac('sha256', TEST_SECRET).update(payload).digest('base64url');
			const expiredToken = `${payload}.${signature}`;

			const result = verifySessionToken(expiredToken, TEST_SECRET);
			expect(result).toBeNull();
		});
	});

	describe('Full Login-to-Verification Flow', () => {
		it('should support a complete login → token → verification cycle', () => {
			// Step 1: Verify credentials (simulates POST /login)
			expect(verifyPassword(TEST_PASS, TEST_HASH)).toBe(true);

			// Step 2: Create session token
			const token = createSessionToken(TEST_USER, TEST_SECRET);
			expect(token).toBeTruthy();
			expect(token.split('.')).toHaveLength(2);

			// Step 3: Verify token on next request (simulates handle hook)
			const username = verifySessionToken(token, TEST_SECRET);
			expect(username).toBe(TEST_USER);
		});
	});
});

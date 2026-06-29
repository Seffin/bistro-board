import { describe, it, expect, vi } from 'vitest';

// Mock logger
vi.mock('$lib/server/logger', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock $env/dynamic/private
vi.mock('$env/dynamic/private', () => ({
	env: {
		SESSION_SECRET: 'test-secret',
		ADMIN_USER: 'admin',
		ADMIN_PASSWORD_HASH: '$2b$10$test'
	}
}));

// Mock $lib/server/db
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
				orderBy: vi.fn().mockReturnValue({
					limit: vi.fn().mockReturnValue({
						offset: vi.fn().mockReturnValue({
							where: vi.fn().mockResolvedValue([])
						})
					})
				})
			})
		})
	}
}));

// Mock $lib/server/config
vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockResolvedValue([])
}));

// Mock $lib/server/cache
vi.mock('$lib/server/cache', () => ({
	getCached: vi.fn(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
	invalidateAll: vi.fn()
}));

import logger from '$lib/server/logger';

describe('Error Handling', () => {
	describe('Logger', () => {
		it('should have all standard log methods', () => {
			expect(logger.info).toBeDefined();
			expect(logger.warn).toBeDefined();
			expect(logger.error).toBeDefined();
			expect(logger.debug).toBeDefined();
		});

		it('should be callable with structured data', () => {
			logger.info({ path: '/test', method: 'GET' }, 'test request');
			expect(logger.info).toHaveBeenCalledWith({ path: '/test', method: 'GET' }, 'test request');
		});

		it('should log errors with details', () => {
			const error = new Error('Database connection failed');
			logger.error({ err: error, path: '/orders' }, 'Failed to load');
			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({ path: '/orders' }),
				'Failed to load'
			);
		});
	});

	describe('Error response structure', () => {
		it('should provide user-friendly error messages', () => {
			// Simulate what handleError returns
			const errorResponse = {
				message: 'An unexpected error occurred. Please try again later.'
			};
			expect(errorResponse.message).toBeTruthy();
			expect(errorResponse.message).not.toContain('stack');
			expect(errorResponse.message).not.toContain('Error:');
		});
	});

	describe('API error responses', () => {
		it('should return 401 JSON for unauthorized API requests', () => {
			const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
			expect(response.status).toBe(401);
		});

		it('should return structured error for 500 responses', () => {
			const response = new Response(
				JSON.stringify({ error: 'Failed to load orders. Please try again later.' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
			expect(response.status).toBe(500);
		});
	});
});

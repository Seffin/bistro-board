import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCached, invalidateAll, invalidateByPrefix, getCacheSize } from '../cache';

describe('Cache Service', () => {
	beforeEach(() => {
		// Clear cache before each test
		invalidateAll();
	});

	describe('getCached', () => {
		it('should call the fetcher on cache miss', async () => {
			const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });
			const result = await getCached('test-key', fetcher);

			expect(fetcher).toHaveBeenCalledOnce();
			expect(result).toEqual({ data: 'fresh' });
		});

		it('should return cached value on cache hit without calling fetcher', async () => {
			const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

			// First call: cache miss
			await getCached('test-key', fetcher);

			// Second call: cache hit — fetcher should NOT be called again
			const fetcher2 = vi.fn().mockResolvedValue({ data: 'should-not-be-called' });
			const result = await getCached('test-key', fetcher2);

			expect(fetcher2).not.toHaveBeenCalled();
			expect(result).toEqual({ data: 'fresh' });
		});

		it('should use different cache entries for different keys', async () => {
			const fetcher1 = vi.fn().mockResolvedValue('value1');
			const fetcher2 = vi.fn().mockResolvedValue('value2');

			const result1 = await getCached('key-1', fetcher1);
			const result2 = await getCached('key-2', fetcher2);

			expect(result1).toBe('value1');
			expect(result2).toBe('value2');
			expect(fetcher1).toHaveBeenCalledOnce();
			expect(fetcher2).toHaveBeenCalledOnce();
		});

		it('should support numeric values', async () => {
			const fetcher = vi.fn().mockResolvedValue(42);
			const result = await getCached('numeric', fetcher);
			expect(result).toBe(42);
		});

		it('should support array values', async () => {
			const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
			const result = await getCached('array', fetcher);
			expect(result).toEqual([1, 2, 3]);
		});
	});

	describe('invalidateAll', () => {
		it('should clear all cached entries', async () => {
			const fetcher = vi.fn().mockResolvedValue('data');

			await getCached('key-a', fetcher);
			await getCached('key-b', fetcher);
			expect(getCacheSize()).toBe(2);

			invalidateAll();
			expect(getCacheSize()).toBe(0);
		});

		it('should cause fetcher to be called again after invalidation', async () => {
			const fetcher = vi.fn().mockResolvedValue('original');
			await getCached('test', fetcher);
			expect(fetcher).toHaveBeenCalledOnce();

			invalidateAll();

			const fetcher2 = vi.fn().mockResolvedValue('refreshed');
			const result = await getCached('test', fetcher2);
			expect(fetcher2).toHaveBeenCalledOnce();
			expect(result).toBe('refreshed');
		});
	});

	describe('invalidateByPrefix', () => {
		it('should clear only keys matching the prefix', async () => {
			const fetcher = vi.fn().mockResolvedValue('data');

			await getCached('dashboard:2024-01:2024-12', fetcher);
			await getCached('dashboard:2025-01:2025-06', fetcher);
			await getCached('settings:theme', fetcher);
			expect(getCacheSize()).toBe(3);

			invalidateByPrefix('dashboard:');
			expect(getCacheSize()).toBe(1);
		});

		it('should not affect keys without the prefix', async () => {
			const fetcher = vi.fn().mockResolvedValue('data');
			await getCached('orders:page-1', fetcher);
			await getCached('dashboard:main', fetcher);

			invalidateByPrefix('dashboard:');

			// Orders should still be cached
			const fetcherCheck = vi.fn().mockResolvedValue('new-data');
			const result = await getCached('orders:page-1', fetcherCheck);
			expect(fetcherCheck).not.toHaveBeenCalled();
			expect(result).toBe('data');
		});
	});

	describe('getCacheSize', () => {
		it('should return 0 for empty cache', () => {
			expect(getCacheSize()).toBe(0);
		});

		it('should return correct count after adding entries', async () => {
			const fetcher = vi.fn().mockResolvedValue('data');
			await getCached('key-1', fetcher);
			await getCached('key-2', fetcher);
			await getCached('key-3', fetcher);
			expect(getCacheSize()).toBe(3);
		});
	});
});

import { describe, it, expect } from 'vitest';
import { formatCurrency, generateColors, getCommonChartOptions } from '../chart-helpers';

describe('Chart Helpers', () => {
	describe('formatCurrency()', () => {
		it('should format standard numbers with default ₹ symbol and Indian commas', () => {
			expect(formatCurrency(5630398)).toBe('₹56,30,398');
			expect(formatCurrency(4532)).toBe('₹4,532');
			expect(formatCurrency(125000)).toBe('₹1,25,000');
		});

		it('should support custom currency symbols like £', () => {
			expect(formatCurrency(5630398, '£')).toBe('£56,30,398');
		});

		it('should handle decimal values correctly', () => {
			expect(formatCurrency(1234.56)).toBe('₹1,234.56');
		});

		it('should support compact formatting with K, L, Cr suffixes', () => {
			expect(formatCurrency(1500000, '₹', true)).toBe('₹15 L');
			expect(formatCurrency(5760000, '£', true)).toBe('£57.6 L');
			expect(formatCurrency(25000, '₹', true)).toBe('₹25 K');
			expect(formatCurrency(12500000, '₹', true)).toBe('₹1.25 Cr');
			expect(formatCurrency(500, '₹', true)).toBe('₹500');
		});
	});

	describe('generateColors()', () => {
		it('should extract color palettes from an array of channels', () => {
			const mockChannels = [
				{ id: 'counter', name: 'Counter', color: '#10b981' },
				{ id: 'swiggy', name: 'Swiggy', color: '#f97316' },
				{ id: 'zomato', name: 'Zomato', color: '#ef4444' }
			];
			const colors = generateColors(mockChannels);
			expect(colors).toEqual(['#10b981', '#f97316', '#ef4444']);
		});

		it('should return default fallback colors if channel list is empty', () => {
			expect(generateColors([])).toEqual(['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6']);
		});
	});

	describe('getCommonChartOptions()', () => {
		it('should return common options adhering to clean design principles', () => {
			const options = getCommonChartOptions('light');
			expect(options).toHaveProperty('chart');
			expect(options.chart?.toolbar?.show).toBe(false);
			expect(options.chart?.fontFamily).toBe('inherit');
			expect(options).toHaveProperty('grid');
		});
	});
});

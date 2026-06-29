import { describe, it, expect } from 'vitest';
import { toCSV, csvResponse } from '../csv';

describe('CSV Utility', () => {
	describe('toCSV', () => {
		it('should generate a valid CSV string with headers', () => {
			const headers = ['id', 'name', 'amount'];
			const rows = [
				{ id: 1, name: 'Test', amount: 100 },
				{ id: 2, name: 'Sample', amount: 200 }
			];

			const csv = toCSV(headers, rows);

			// Should start with BOM
			expect(csv.startsWith('\uFEFF')).toBe(true);

			const lines = csv.substring(1).split('\r\n');
			expect(lines).toHaveLength(3); // Header + 2 rows
			expect(lines[0]).toBe('id,name,amount');
			expect(lines[1]).toBe('1,Test,100');
			expect(lines[2]).toBe('2,Sample,200');
		});

		it('should escape strings containing commas', () => {
			const headers = ['name', 'description'];
			const rows = [{ name: 'Item 1', description: 'This is a test, with a comma' }];

			const csv = toCSV(headers, rows);
			const lines = csv.substring(1).split('\r\n');
			expect(lines[1]).toBe('Item 1,"This is a test, with a comma"');
		});

		it('should escape strings containing quotes', () => {
			const headers = ['name', 'quote'];
			const rows = [{ name: 'Item 1', quote: 'He said "Hello"' }];

			const csv = toCSV(headers, rows);
			const lines = csv.substring(1).split('\r\n');
			expect(lines[1]).toBe('Item 1,"He said ""Hello"""');
		});

		it('should format dates as YYYY-MM-DD', () => {
			const headers = ['id', 'date'];
			const date = new Date('2026-06-15T12:00:00Z');
			const rows = [{ id: 1, date }];

			const csv = toCSV(headers, rows);
			const lines = csv.substring(1).split('\r\n');
			expect(lines[1]).toBe('1,2026-06-15');
		});

		it('should handle null and undefined values as empty strings', () => {
			const headers = ['id', 'value1', 'value2'];
			const rows = [{ id: 1, value1: null, value2: undefined }];

			const csv = toCSV(headers, rows);
			const lines = csv.substring(1).split('\r\n');
			expect(lines[1]).toBe('1,,');
		});
	});

	describe('csvResponse', () => {
		it('should create a response with correct headers', () => {
			const response = csvResponse('id,name\n1,test', 'export.csv');

			expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
			expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="export.csv"');
			expect(response.headers.get('Cache-Control')).toBe('no-cache');
		});
	});
});

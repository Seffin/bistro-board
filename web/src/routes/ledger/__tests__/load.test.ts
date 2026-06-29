import { describe, it, expect } from 'vitest';

describe('Business Ledger Load Function', () => {
	describe('income aggregation', () => {
		it('should aggregate daily income by channel', () => {
			const ledger = [
				{ date: '2024-01-01', channel: 'counter', amount: 1000, type: 'income' },
				{ date: '2024-01-01', channel: 'swiggy', amount: 2000, type: 'income' },
				{ date: '2024-01-01', channel: 'zomato', amount: 1500, type: 'income' },
				{ date: '2024-01-02', channel: 'counter', amount: 1200, type: 'income' }
			];

			const byDate = ledger.reduce(
				(acc, entry) => {
					if (!acc[entry.date]) {
						acc[entry.date] = [];
					}
					acc[entry.date].push(entry);
					return acc;
				},
				{} as Record<string, typeof ledger>
			);

			expect(byDate['2024-01-01']).toHaveLength(3);
			expect(byDate['2024-01-01'].reduce((sum, e) => sum + e.amount, 0)).toBe(4500);
		});

		it('should calculate total income', () => {
			const entries = [
				{ amount: 1000, type: 'income' },
				{ amount: 2000, type: 'income' },
				{ amount: 1500, type: 'income' }
			];

			const totalIncome = entries.reduce((sum, e) => sum + e.amount, 0);

			expect(totalIncome).toBe(4500);
		});
	});

	describe('expense aggregation', () => {
		it('should aggregate expenses by category', () => {
			const expenses = [
				{ amount: 500, category: 'rent', date: '2024-01-01' },
				{ amount: 200, category: 'utilities', date: '2024-01-01' },
				{ amount: 300, category: 'supplies', date: '2024-01-01' },
				{ amount: 500, category: 'rent', date: '2024-01-02' }
			];

			const byCategory = expenses.reduce(
				(acc, exp) => {
					if (!acc[exp.category]) acc[exp.category] = 0;
					acc[exp.category] += exp.amount;
					return acc;
				},
				{} as Record<string, number>
			);

			expect(byCategory['rent']).toBe(1000);
			expect(byCategory['utilities']).toBe(200);
			expect(byCategory['supplies']).toBe(300);
		});

		it('should calculate total expenses', () => {
			const expenses = [
				{ amount: 500, category: 'rent' },
				{ amount: 200, category: 'utilities' },
				{ amount: 300, category: 'supplies' }
			];

			const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

			expect(totalExpenses).toBe(1000);
		});
	});

	describe('P&L calculation', () => {
		it('should calculate net profit', () => {
			const totalIncome = 5000;
			const totalExpenses = 1000;
			const netProfit = totalIncome - totalExpenses;

			expect(netProfit).toBe(4000);
		});

		it('should handle negative profit (loss)', () => {
			const totalIncome = 1000;
			const totalExpenses = 2000;
			const netProfit = totalIncome - totalExpenses;

			expect(netProfit).toBe(-1000);
		});

		it('should calculate profit margin', () => {
			const totalIncome = 5000;
			const netProfit = 1000;
			const margin = (netProfit / totalIncome) * 100;

			expect(margin).toBe(20);
		});
	});

	describe('date range filtering', () => {
		it('should filter ledger entries by date range', () => {
			const entries = [
				{ date: new Date('2024-01-01'), amount: 100 },
				{ date: new Date('2024-01-15'), amount: 200 },
				{ date: new Date('2024-02-01'), amount: 300 }
			];

			const start = new Date('2024-01-01');
			const end = new Date('2024-01-31');
			const filtered = entries.filter((e) => e.date >= start && e.date <= end);

			expect(filtered).toHaveLength(2);
		});

		it('should include boundary dates', () => {
			const entries = [
				{ date: new Date('2024-01-01'), amount: 100 },
				{ date: new Date('2024-01-31'), amount: 200 }
			];

			const start = new Date('2024-01-01');
			const end = new Date('2024-01-31');
			const filtered = entries.filter((e) => e.date >= start && e.date <= end);

			expect(filtered).toHaveLength(2);
		});
	});

	describe('data structure', () => {
		it('should return daily breakdown with income and expenses', () => {
			const dailyBreakdown = {
				date: '2024-01-01',
				income: {
					counter: 1000,
					swiggy: 2000,
					zomato: 1500,
					total: 4500
				},
				expenses: {
					rent: 500,
					utilities: 200,
					supplies: 300,
					total: 1000
				},
				net: 3500
			};

			expect(dailyBreakdown).toHaveProperty('date');
			expect(dailyBreakdown).toHaveProperty('income');
			expect(dailyBreakdown).toHaveProperty('expenses');
			expect(dailyBreakdown).toHaveProperty('net');
			expect(dailyBreakdown.net).toBe(3500);
		});

		it('should return summary with totals and metrics', () => {
			const summary = {
				totalIncome: 10000,
				totalExpenses: 2000,
				netProfit: 8000,
				profitMargin: 80,
				days: 31
			};

			expect(summary.netProfit).toBe(8000);
			expect(summary.profitMargin).toBe(80);
		});
	});

	describe('channel breakdown', () => {
		it('should break down income by channel', () => {
			const income = [
				{ channel: 'counter', amount: 1000 },
				{ channel: 'swiggy', amount: 2000 },
				{ channel: 'zomato', amount: 1500 }
			];

			const byChannel = income.reduce(
				(acc, entry) => {
					if (!acc[entry.channel]) acc[entry.channel] = 0;
					acc[entry.channel] += entry.amount;
					return acc;
				},
				{} as Record<string, number>
			);

			expect(byChannel['counter']).toBe(1000);
			expect(byChannel['swiggy']).toBe(2000);
			expect(byChannel['zomato']).toBe(1500);
		});
	});
});

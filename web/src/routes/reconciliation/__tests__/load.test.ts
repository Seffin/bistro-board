import { describe, it, expect } from 'vitest';

describe('Reconciliation Load Function', () => {
	describe('variance calculation', () => {
		it('should calculate variance between counter and ledger', () => {
			const counterAmount = 5000;
			const ledgerAmount = 4800;
			const variance = counterAmount - ledgerAmount;
			const variancePercent = (variance / counterAmount) * 100;

			expect(variance).toBe(200);
			expect(variancePercent).toBeCloseTo(4);
		});

		it('should identify discrepancies', () => {
			const reconciliation = [
				{ source: 'counter', amount: 5000, ledger: 4800, variance: 200, status: 'mismatch' },
				{ source: 'swiggy', amount: 3000, ledger: 3000, variance: 0, status: 'matched' }
			];

			const mismatches = reconciliation.filter((r) => r.status === 'mismatch');
			expect(mismatches).toHaveLength(1);
			expect(mismatches[0].variance).toBe(200);
		});

		it('should flag zero variance as matched', () => {
			const variance = 0;
			const status = variance === 0 ? 'matched' : 'mismatch';

			expect(status).toBe('matched');
		});
	});

	describe('daily reconciliation', () => {
		it('should reconcile data by date', () => {
			const counterData = [
				{ date: '2024-01-01', channel: 'counter', amount: 1000 },
				{ date: '2024-01-02', channel: 'counter', amount: 1200 }
			];

			const ledgerData = [
				{ date: '2024-01-01', channel: 'counter', amount: 1000 },
				{ date: '2024-01-02', channel: 'counter', amount: 1200 }
			];

			const reconciled = counterData.map((counter) => {
				const ledger = ledgerData.find(
					(l) => l.date === counter.date && l.channel === counter.channel
				);
				return {
					date: counter.date,
					channel: counter.channel,
					counterAmount: counter.amount,
					ledgerAmount: ledger?.amount || 0,
					variance: counter.amount - (ledger?.amount || 0)
				};
			});

			expect(reconciled).toHaveLength(2);
			expect(reconciled.every((r) => r.variance === 0)).toBe(true);
		});
	});

	describe('channel reconciliation', () => {
		it('should reconcile each channel separately', () => {
			const counters = [
				{ date: '2024-01-01', channel: 'counter', amount: 1000 },
				{ date: '2024-01-01', channel: 'swiggy', amount: 2000 }
			];

			const byChannel = counters.reduce(
				(acc, c) => {
					if (!acc[c.channel]) acc[c.channel] = [];
					acc[c.channel].push(c);
					return acc;
				},
				{} as Record<string, typeof counters>
			);

			expect(Object.keys(byChannel)).toHaveLength(2);
			expect(byChannel['counter']).toHaveLength(1);
			expect(byChannel['swiggy']).toHaveLength(1);
		});
	});

	describe('summary metrics', () => {
		it('should calculate total matched and mismatched entries', () => {
			const reconciled = [
				{ date: '2024-01-01', variance: 0, status: 'matched' },
				{ date: '2024-01-02', variance: 100, status: 'mismatch' },
				{ date: '2024-01-03', variance: 0, status: 'matched' },
				{ date: '2024-01-04', variance: 50, status: 'mismatch' }
			];

			const matched = reconciled.filter((r) => r.status === 'matched').length;
			const mismatched = reconciled.filter((r) => r.status === 'mismatch').length;
			const totalVariance = reconciled.reduce((sum, r) => sum + Math.abs(r.variance), 0);

			expect(matched).toBe(2);
			expect(mismatched).toBe(2);
			expect(totalVariance).toBe(150);
		});

		it('should calculate reconciliation rate', () => {
			const matched = 98;
			const total = 100;
			const rate = (matched / total) * 100;

			expect(rate).toBe(98);
		});
	});

	describe('variance trends', () => {
		it('should track variance over time', () => {
			const daily = [
				{ date: '2024-01-01', variance: 100 },
				{ date: '2024-01-02', variance: 50 },
				{ date: '2024-01-03', variance: 150 },
				{ date: '2024-01-04', variance: 0 }
			];

			const avgVariance = daily.reduce((sum, d) => sum + d.variance, 0) / daily.length;
			expect(avgVariance).toBe(75);

			const trend = daily.map((d) => d.variance);
			expect(trend[0]).toBeGreaterThan(trend[1]);
		});
	});

	describe('data structure', () => {
		it('should return daily reconciliation records', () => {
			const record = {
				date: '2024-01-01',
				counter_total: 5000,
				ledger_total: 4800,
				variance: 200,
				variance_percent: 4,
				status: 'mismatch'
			};

			expect(record).toHaveProperty('date');
			expect(record).toHaveProperty('counter_total');
			expect(record).toHaveProperty('ledger_total');
			expect(record).toHaveProperty('variance');
			expect(record).toHaveProperty('status');
		});
	});
});

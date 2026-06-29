import { describe, it, expect } from 'vitest';
import { THEME_SYSTEM_TABS, getActiveTab } from '../navigation-tabs';

describe('Overview Navigation & Theme System Tabs', () => {
	it('should contain all required Theme System tabs in correct order', () => {
		const labels = THEME_SYSTEM_TABS.map((tab) => tab.label);
		expect(labels).toEqual([
			'Overview',
			'Platform Economics',
			'Counter Insights',
			'Order Journal',
			'Business Ledger',
			'Reconciliation',
			'Payout Analytics',
			'Promo Impact'
		]);
	});

	it('should return default overview tab when no tab parameter is provided', () => {
		expect(getActiveTab(null)).toBe('overview');
		expect(getActiveTab('')).toBe('overview');
	});

	it('should return the requested tab when valid', () => {
		expect(getActiveTab('platform-economics')).toBe('platform-economics');
		expect(getActiveTab('reconciliation')).toBe('reconciliation');
	});

	it('should fallback to overview when an invalid tab is requested', () => {
		expect(getActiveTab('invalid-tab')).toBe('overview');
	});
});

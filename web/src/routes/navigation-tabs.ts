export interface ThemeTab {
	id: string;
	label: string;
}

export const THEME_SYSTEM_TABS: ThemeTab[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'platform-economics', label: 'Platform Economics' },
	{ id: 'counter-insights', label: 'Counter Insights' },
	{ id: 'order-journal', label: 'Order Journal' },
	{ id: 'business-ledger', label: 'Business Ledger' },
	{ id: 'reconciliation', label: 'Reconciliation' },
	{ id: 'payout-analytics', label: 'Payout Analytics' },
	{ id: 'promo-impact', label: 'Promo Impact' }
];

/**
 * Returns the valid active tab ID, defaulting to 'overview' if invalid or missing.
 */
export function getActiveTab(currentTabId: string | null): string {
	if (!currentTabId) return 'overview';
	const exists = THEME_SYSTEM_TABS.some((t) => t.id === currentTabId);
	return exists ? currentTabId : 'overview';
}

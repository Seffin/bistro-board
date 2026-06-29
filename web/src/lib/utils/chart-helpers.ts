import type { Channel } from '../server/config';

/**
 * Formats a number into the Indian numbering system (Lakhs/Crores) with appropriate commas and currency symbol.
 * Supports compact formatting (K, L, Cr suffixes) for chart axes and dense UI cards.
 */
export function formatCurrency(value: number, symbol = '₹', compact = false): string {
	if (compact) {
		const absVal = Math.abs(value);
		if (absVal >= 10000000) {
			const cr = (value / 10000000)
				.toFixed(2)
				.replace(/\.00$/, '')
				.replace(/(\.\d)0$/, '$1');
			return `${symbol}${cr} Cr`;
		}
		if (absVal >= 100000) {
			const l = (value / 100000)
				.toFixed(2)
				.replace(/\.00$/, '')
				.replace(/(\.\d)0$/, '$1');
			return `${symbol}${l} L`;
		}
		if (absVal >= 1000) {
			const k = (value / 1000)
				.toFixed(2)
				.replace(/\.00$/, '')
				.replace(/(\.\d)0$/, '$1');
			return `${symbol}${k} K`;
		}
		return `${symbol}${value
			.toFixed(2)
			.replace(/\.00$/, '')
			.replace(/(\.\d)0$/, '$1')}`;
	}

	const formatter = new Intl.NumberFormat('en-IN', {
		maximumFractionDigits: 2
	});

	return `${symbol}${formatter.format(value)}`;
}

/**
 * Extracts an ordered array of color hex codes from the active channel configurations.
 * Provides fallback colors if no channels are supplied.
 */
export function generateColors(channels: Pick<Channel, 'color'>[]): string[] {
	if (!channels || channels.length === 0) {
		return ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6'];
	}
	return channels.map((c) => c.color);
}

/**
 * Provides common, modern, clean ApexCharts configuration options matching agent.md design principles.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCommonChartOptions(theme = 'light'): Record<string, any> {
	const isDark = theme === 'dark';
	return {
		chart: {
			fontFamily: 'inherit',
			toolbar: {
				show: false
			},
			background: 'transparent',
			animations: {
				enabled: true,
				easing: 'easeinout',
				speed: 800
			}
		},
		grid: {
			borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			strokeDashArray: 3,
			xaxis: {
				lines: {
					show: false
				}
			},
			yaxis: {
				lines: {
					show: true
				}
			}
		},
		legend: {
			labels: {
				colors: isDark ? '#e5e7eb' : '#374151'
			},
			itemMargin: {
				horizontal: 12,
				vertical: 4
			}
		},
		tooltip: {
			theme: isDark ? 'dark' : 'light',
			x: {
				show: true
			}
		}
	};
}

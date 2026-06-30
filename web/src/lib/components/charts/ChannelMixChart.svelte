<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { categories = [], series = [] } = $props<{
		categories: string[];
		series: { name: string; data: number[]; color: string }[];
	}>();

	// Channel mix data is currently provided as time series. 
	// We aggregate it for a radial bar.
	const aggregatedSeries = $derived(
		series.map(s => Number(s.data.reduce((sum, val) => sum + val, 0).toFixed(2)))
	);
	const labels = $derived(series.map(s => s.name));
	const colors = $derived(series.map(s => s.color));

	// Check if we have valid data for the radial bar
	const hasValidData = $derived(
		aggregatedSeries.length > 0 && aggregatedSeries.some(v => v > 0)
	);

	let chartNode: HTMLElement;
	let chart: ApexCharts;

	onMount(() => {
		return () => {
			if (chart) chart.destroy();
		};
	});

	$effect(() => {
		if (!chartNode || !hasValidData) return;
		
		import('apexcharts').then((module) => {
			const ApexCharts = module.default;

			// Calculate percentage of total for accurate visual mix
			const total = aggregatedSeries.reduce((a, b) => a + b, 0) || 1;
			const normalizedSeries = aggregatedSeries.map(v => Number(((v / total) * 100).toFixed(1)));

			const baseOptions = getCommonChartOptions(themeState.current);
			const options = {
				...baseOptions,
				chart: {
					...baseOptions.chart,
					type: 'radialBar',
					height: 320
				},
				series: normalizedSeries,
				labels,
				colors,
				plotOptions: {
					radialBar: {
						hollow: { size: '40%' },
						track: {
							background: themeState.current === 'dark' ? '#334155' : '#f1f5f9'
						},
						dataLabels: {
							name: { 
								fontSize: '14px',
								color: themeState.current === 'dark' ? '#94a3b8' : '#64748b'
							},
							value: {
								fontSize: '16px',
								color: themeState.current === 'dark' ? '#f8fafc' : '#0f172a',
								formatter: (val: number, opts: any) => {
									let idx = opts?.seriesIndex;
									if (idx === undefined || idx === null) {
										// Find closest matching percentage in case of float precision issues
										let closestIdx = 0;
										let minDiff = Infinity;
										for (let i = 0; i < normalizedSeries.length; i++) {
											const diff = Math.abs(normalizedSeries[i] - Number(val));
											if (diff < minDiff) {
												minDiff = diff;
												closestIdx = i;
											}
										}
										idx = closestIdx;
									}
									if (idx === -1 || idx === undefined || idx === null) idx = 0;
									return `₹${aggregatedSeries[idx] ?? 0} L`;
								}
							},
							total: {
								show: true,
								label: 'Total',
								color: themeState.current === 'dark' ? '#94a3b8' : '#64748b',
								formatter: () => {
									const sum = aggregatedSeries.reduce((a, b) => a + b, 0);
									return `₹${sum.toFixed(2)} L`;
								}
							}
						}
					}
				},
				stroke: { lineCap: 'round' }
			};

			if (!chart) {
				chart = new ApexCharts(chartNode, options);
				chart.render();
			} else {
				chart.updateOptions(options);
			}
		});
	});
</script>

<div class="chart-container card">
	<div class="chart-header">
		<h2>Channel Mix</h2>
		<p class="subtitle">Aggregate contribution across selected time window</p>
	</div>
	{#if hasValidData}
		<div bind:this={chartNode}></div>
	{:else}
		<div class="empty-chart">
			<p>No channel mix data available for the selected filters.</p>
		</div>
	{/if}
</div>

<style>
	.chart-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		background: var(--bg-surface);
		border-radius: var(--border-radius);
	}

	.chart-header h2 {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.empty-chart {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
</style>

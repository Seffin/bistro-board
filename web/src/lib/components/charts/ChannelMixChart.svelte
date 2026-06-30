<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import ApexCharts from 'apexcharts';
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

	let chartNode: HTMLElement;
	let chart: ApexCharts;

	onMount(() => {
		return () => {
			if (chart) chart.destroy();
		};
	});

	$effect(() => {
		if (!chartNode || aggregatedSeries.length === 0) return;
		
		const baseOptions = getCommonChartOptions(themeState.current);
		const options = {
			...baseOptions,
			chart: {
				...baseOptions.chart,
				type: 'radialBar',
				height: 320
			},
			series: aggregatedSeries,
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
							formatter: (val: number) => `₹${val} L`
						},
						total: {
							show: true,
							label: 'Total',
							color: themeState.current === 'dark' ? '#94a3b8' : '#64748b',
							formatter: () => {
								const total = aggregatedSeries.reduce((a, b) => a + b, 0);
								return `₹${total.toFixed(2)} L`;
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
</script>

<div class="chart-container card">
	<div class="chart-header">
		<h2>Channel Mix</h2>
		<p class="subtitle">Aggregate contribution across selected time window</p>
	</div>
	<div bind:this={chartNode}></div>
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
</style>

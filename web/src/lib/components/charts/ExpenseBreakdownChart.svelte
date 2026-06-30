<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { labels = [], series = [] } = $props<{
		labels: string[];
		series: number[];
	}>();

	let chartNode: HTMLElement;
	let chart: ApexCharts;

	onMount(() => {
		return () => {
			if (chart) chart.destroy();
		};
	});

	$effect(() => {
		if (!chartNode) return;
		
		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const baseOptions = getCommonChartOptions(themeState.current);
			const options = {
				...baseOptions,
				chart: {
					...baseOptions.chart,
					type: 'bar',
					height: 300
				},
				series: [{ name: 'Expenses', data: series }],
				xaxis: {
					categories: labels,
					labels: {
						style: { colors: themeState.current === 'dark' ? '#94a3b8' : '#64748b' },
						formatter: (val: number) => `₹${val} L`
					}
				},
				yaxis: {
					labels: {
						style: { colors: themeState.current === 'dark' ? '#94a3b8' : '#64748b' }
					}
				},
				plotOptions: {
					bar: {
						borderRadius: 4,
						horizontal: true,
						barHeight: '55%'
					}
				},
				colors: ['#ef4444'],
				dataLabels: {
					enabled: false
				}
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
		<h2>Expense Breakdown</h2>
		<p class="subtitle">Operating expenses by category (in Lakhs)</p>
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

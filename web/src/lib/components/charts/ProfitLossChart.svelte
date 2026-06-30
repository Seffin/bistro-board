<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { categories = [], series = [] } = $props<{
		categories: string[];
		series: { name: string; type: string; data: number[] }[];
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
					type: 'line',
					height: 350
				},
				series,
				xaxis: {
					categories,
					labels: {
						style: { colors: themeState.current === 'dark' ? '#94a3b8' : '#64748b' }
					}
				},
				yaxis: {
					title: {
						text: 'Lakhs (₹)',
						style: { color: themeState.current === 'dark' ? '#94a3b8' : '#64748b' }
					},
					labels: {
						style: { colors: themeState.current === 'dark' ? '#94a3b8' : '#64748b' },
						formatter: (val: number) => `₹${val} L`
					}
				},
				stroke: {
					width: [0, 0, 3],
					curve: 'smooth'
				},
				colors: ['#6366f1', '#ef4444', '#10b981'],
				plotOptions: {
					bar: {
						columnWidth: '50%',
						borderRadius: 2
					}
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
		<h2>Profit & Loss Trend</h2>
		<p class="subtitle">Monthly revenue, expenses, and net profit (in Lakhs)</p>
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
		font-size: 1.25rem;
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

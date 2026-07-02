<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { categories = [], series = [] } = $props<{
		categories: string[];
		series: { name: string; data: number[] }[];
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
		
		const currentTheme = themeState.current;
		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const baseOptions = getCommonChartOptions(currentTheme);
			const options = {
				...baseOptions,
				chart: {
					...baseOptions.chart,
					type: 'bar',
					height: 300
				},
				series,
				xaxis: {
					categories,
					labels: {
						style: { colors: currentTheme === 'dark' ? '#94a3b8' : '#64748b' }
					}
				},
				yaxis: {
					title: {
						text: 'Orders',
						style: { color: currentTheme === 'dark' ? '#94a3b8' : '#64748b' }
					},
					labels: {
						style: { colors: currentTheme === 'dark' ? '#94a3b8' : '#64748b' }
					}
				},
				colors: ['#3b82f6'],
				plotOptions: {
					bar: {
						borderRadius: 4,
						columnWidth: '60%'
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
		<h2>Hourly Velocity</h2>
		<p class="subtitle">Peak order volume throughout the day (11:00 - 22:00)</p>
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

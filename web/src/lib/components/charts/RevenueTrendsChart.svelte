<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { categories = [], series = [], onMonthClick } = $props<{
		categories: string[];
		series: { name: string; data: number[]; color: string }[];
		onMonthClick?: (index: number) => void;
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
					type: 'area',
					height: 350,
					events: {
						dataPointSelection: (e: any, chart: any, config: any) => {
							if (onMonthClick) onMonthClick(config.dataPointIndex);
						}
					}
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
						text: 'Revenue (Lakhs)',
						style: { color: themeState.current === 'dark' ? '#94a3b8' : '#64748b' }
					},
					labels: {
						style: { colors: themeState.current === 'dark' ? '#94a3b8' : '#64748b' },
						formatter: (val: number) => `₹${val} L`
					}
				},
				colors: series.map(s => s.color),
				stroke: {
					curve: 'smooth',
					width: 2
				},
				fill: {
					type: 'gradient',
					gradient: {
						shadeIntensity: 1,
						opacityFrom: 0.4,
						opacityTo: 0.05,
						stops: [0, 90, 100]
					}
				},
				dataLabels: { enabled: false },
				markers: { size: 0, hover: { size: 4 } }
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
		<h2>Revenue Trends</h2>
		<p class="subtitle">Monthly gross performance per channel (in Lakhs)</p>
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

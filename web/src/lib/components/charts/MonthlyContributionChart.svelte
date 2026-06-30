<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let {
		labels = [],
		series = [],
		colors = []
	} = $props<{
		labels: string[];
		series: number[];
		colors: string[];
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
					type: 'donut',
					height: 300
				},
				labels,
				series,
				colors,
				legend: {
					position: 'bottom',
					horizontalAlign: 'center',
					labels: {
						colors: themeState.current === 'dark' ? '#e5e7eb' : '#374151'
					}
				},
				plotOptions: {
					pie: {
						donut: {
							size: '75%',
							labels: {
								show: true,
								name: { color: themeState.current === 'dark' ? '#94a3b8' : '#64748b' },
								value: { color: themeState.current === 'dark' ? '#f8fafc' : '#0f172a' }
							}
						}
					}
				},
				stroke: {
					colors: [themeState.current === 'dark' ? '#1e293b' : '#ffffff']
				},
				tooltip: {
					y: { formatter: (val: number) => `₹${val} L` }
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
		<h2>Monthly Contribution</h2>
		<p class="subtitle">Aggregate gross revenue share per channel</p>
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

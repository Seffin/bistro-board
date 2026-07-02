<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import type ApexCharts from 'apexcharts';
	import { themeState } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { labels = [], series = [], colors = [] } = $props<{
		labels: string[];
		series: number[];
		colors: string[];
	}>();

	const hasData = $derived(series.length > 0 && series.some(v => v > 0));

	let chartNode: HTMLElement;
	let chart: ApexCharts;

	onMount(() => {
		return () => {
			if (chart) chart.destroy();
		};
	});

	$effect(() => {
		if (!chartNode || !hasData) return;

		const currentTheme = themeState.current;
		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const baseOptions = getCommonChartOptions(currentTheme);
		const options = {
			...baseOptions,
			chart: {
				...baseOptions.chart,
				type: 'donut',
				height: 320
			},
			series,
			labels,
			colors: colors.length > 0 ? colors : ['#10b981', '#ef4444', '#f59e0b', '#f97316', '#6b7280'],
			plotOptions: {
				pie: {
					donut: {
						size: '55%',
						labels: {
							show: true,
							name: {
								show: true,
								color: currentTheme === 'dark' ? '#94a3b8' : '#64748b'
							},
							value: {
								show: true,
								color: currentTheme === 'dark' ? '#f8fafc' : '#0f172a',
								formatter: (val: string) => parseInt(val).toLocaleString('en-IN')
							},
							total: {
								show: true,
								label: 'Total',
								color: currentTheme === 'dark' ? '#94a3b8' : '#64748b',
								formatter: (w: any) => {
									const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
									return total.toLocaleString('en-IN');
								}
							}
						}
					}
				}
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${val.toFixed(1)}%`,
				style: {
					fontSize: '12px',
					colors: ['#fff']
				},
				dropShadow: { enabled: false }
			},
			legend: {
				position: 'bottom',
				labels: {
					colors: currentTheme === 'dark' ? '#e5e7eb' : '#374151'
				}
			},
			stroke: {
				width: 2,
				colors: [currentTheme === 'dark' ? '#1e293b' : '#ffffff']
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
		<h2>Order Status Distribution</h2>
		<p class="subtitle">Breakdown by order outcome</p>
	</div>
	{#if hasData}
		<div bind:this={chartNode}></div>
	{:else}
		<div class="empty-chart">
			<p>No order status data available.</p>
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

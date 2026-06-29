<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import ApexCharts from 'apexcharts';

	let {
		labels = [],
		series = [],
		colors = []
	} = $props<{
		labels: string[];
		series: number[];
		colors: string[];
	}>();

	function chartAction(
		node: HTMLElement,
		{ labels, series, colors }: { labels: string[]; series: number[]; colors: string[] }
	) {
		const baseOptions = getCommonChartOptions('light');
		const options = {
			...baseOptions,
			chart: {
				...baseOptions.chart,
				type: 'donut' as const,
				height: 300
			},
			labels,
			series,
			colors,
			legend: {
				position: 'bottom' as const,
				horizontalAlign: 'center' as const
			},
			plotOptions: {
				pie: {
					donut: {
						size: '75%'
					}
				}
			},
			tooltip: {
				y: {
					formatter: (val: number) => `₹${val} L`
				}
			}
		};

		const chart = new ApexCharts(node, options);
		chart.render();

		return {
			update({
				labels: newLab,
				series: newSer,
				colors: newCol
			}: {
				labels: string[];
				series: number[];
				colors: string[];
			}) {
				chart.updateOptions({ labels: newLab, series: newSer, colors: newCol });
			},
			destroy() {
				chart.destroy();
			}
		};
	}
</script>

<div class="chart-container card">
	<div class="chart-header">
		<h2>Monthly Contribution</h2>
		<p class="subtitle">Aggregate gross revenue share per channel</p>
	</div>
	<div use:chartAction={{ labels, series, colors }}></div>
</div>

<style>
	.chart-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
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

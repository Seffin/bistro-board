<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import ApexCharts from 'apexcharts';

	let { categories = [], series = [] } = $props<{
		categories: string[];
		series: { name: string; data: number[]; color: string }[];
	}>();

	function chartAction(
		node: HTMLElement,
		{
			categories,
			series
		}: { categories: string[]; series: { name: string; data: number[]; color: string }[] }
	) {
		const baseOptions = getCommonChartOptions('light');
		const options = {
			...baseOptions,
			chart: {
				...baseOptions.chart,
				type: 'line',
				height: 350
			},
			series,
			xaxis: {
				categories
			},
			yaxis: {
				title: {
					text: 'Revenue (Lakhs)'
				},
				labels: {
					formatter: (val: number) => `₹${val} L`
				}
			},
			stroke: {
				curve: 'smooth' as const,
				width: 3
			},
			markers: {
				size: 4
			}
		};

		const chart = new ApexCharts(node, options);
		chart.render();

		return {
			update({
				categories: newCat,
				series: newSer
			}: {
				categories: string[];
				series: { name: string; data: number[]; color: string }[];
			}) {
				chart.updateOptions({ xaxis: { categories: newCat }, series: newSer });
			},
			destroy() {
				chart.destroy();
			}
		};
	}
</script>

<div class="chart-container card">
	<div class="chart-header">
		<h2>Revenue Trends</h2>
		<p class="subtitle">Monthly gross performance per channel (in Lakhs)</p>
	</div>
	<div use:chartAction={{ categories, series }}></div>
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

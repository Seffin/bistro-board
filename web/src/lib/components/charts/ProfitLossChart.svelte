<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import ApexCharts from 'apexcharts';

	let { categories = [], series = [] } = $props<{
		categories: string[];
		series: { name: string; type: string; data: number[] }[];
	}>();

	function chartAction(
		node: HTMLElement,
		{
			categories,
			series
		}: { categories: string[]; series: { name: string; type: string; data: number[] }[] }
	) {
		const baseOptions = getCommonChartOptions('light');
		const options = {
			...baseOptions,
			chart: {
				...baseOptions.chart,
				type: 'line' as const,
				height: 350
			},
			series,
			xaxis: {
				categories
			},
			yaxis: {
				title: {
					text: 'Lakhs (₹)'
				},
				labels: {
					formatter: (val: number) => `₹${val} L`
				}
			},
			stroke: {
				width: [0, 0, 3],
				curve: 'smooth' as const
			},
			colors: ['#6366f1', '#ef4444', '#10b981'],
			plotOptions: {
				bar: {
					columnWidth: '50%'
				}
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
				series: { name: string; type: string; data: number[] }[];
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
		<h2>Profit & Loss Trend</h2>
		<p class="subtitle">Monthly revenue, expenses, and net profit (in Lakhs)</p>
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

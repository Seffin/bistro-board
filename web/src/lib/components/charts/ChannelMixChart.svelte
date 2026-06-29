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
				type: 'area',
				height: 280
			},
			series,
			xaxis: {
				categories
			},
			yaxis: {
				title: {
					text: 'Contribution (Lakhs)'
				},
				labels: {
					formatter: (val: number) => `₹${val} L`
				}
			},
			stroke: {
				curve: 'smooth' as const,
				width: 2
			},
			fill: {
				type: 'gradient',
				gradient: {
					shadeIntensity: 1,
					opacityFrom: 0.5,
					opacityTo: 0.1,
					stops: [0, 90, 100]
				}
			},
			dataLabels: {
				enabled: false
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
		<h2>Channel Mix</h2>
		<p class="subtitle">Relative contribution over selected time window</p>
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

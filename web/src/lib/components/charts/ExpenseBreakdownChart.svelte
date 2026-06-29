<script lang="ts">
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import ApexCharts from 'apexcharts';

	let { labels = [], series = [] } = $props<{
		labels: string[];
		series: number[];
	}>();

	function chartAction(
		node: HTMLElement,
		{ labels, series }: { labels: string[]; series: number[] }
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
			legend: {
				position: 'bottom' as const,
				horizontalAlign: 'center' as const
			},
			plotOptions: {
				pie: {
					donut: {
						size: '70%'
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
			update({ labels: newLab, series: newSer }: { labels: string[]; series: number[] }) {
				chart.updateOptions({ labels: newLab, series: newSer });
			},
			destroy() {
				chart.destroy();
			}
		};
	}
</script>

<div class="chart-container card">
	<div class="chart-header">
		<h2>Expense Breakdown</h2>
		<p class="subtitle">Operating expenses by category (in Lakhs)</p>
	</div>
	<div use:chartAction={{ labels, series }}></div>
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

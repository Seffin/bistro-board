<script lang="ts">
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import { themeState } from '$lib/stores/theme.svelte';
	import type ApexCharts from 'apexcharts';
	import type { ApexOptions } from 'apexcharts';
	import { onMount } from 'svelte';
	import { TrendingUp, TrendingDown } from '@lucide/svelte';

	let { data } = $props();
	const promo = $derived(data.promo);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	let distributionChartContainer: HTMLDivElement | undefined = $state();
	let penetrationChartContainer: HTMLDivElement | undefined = $state();
	let aovComparisonChartContainer: HTMLDivElement | undefined = $state();
	let monthlyTrendChartContainer: HTMLDivElement | undefined = $state();
	
	let distributionChart: ApexCharts | undefined;
	let penetrationChart: ApexCharts | undefined;
	let aovComparisonChart: ApexCharts | undefined;
	let monthlyTrendChart: ApexCharts | undefined;

	onMount(() => {
		return () => {
			distributionChart?.destroy();
			penetrationChart?.destroy();
			aovComparisonChart?.destroy();
			monthlyTrendChart?.destroy();
		};
	});

	// Discount Distribution Bar Chart
	$effect(() => {
		if (!distributionChartContainer || promo.discount_buckets.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
			const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		
			const options: ApexOptions = {
				...base,
				chart: { ...base.chart, type: 'bar', height: 350 },
				series: [
					{
						name: 'Orders',
						data: promo.discount_buckets.map(b => b.order_count)
					}
				],
				xaxis: {
					categories: promo.discount_buckets.map(b => b.bucket_range),
					labels: { style: { colors: labelColor } }
				},
				yaxis: {
					labels: { style: { colors: labelColor } }
				},
				colors: ['#8b5cf6'],
				plotOptions: {
					bar: { borderRadius: 4, distributed: true }
				},
				dataLabels: {
					enabled: true,
					formatter: (val: number) => val.toString(),
					style: { colors: ['#fff'] }
				},
				legend: { show: false }
			};

			if (!distributionChart) {
				distributionChart = new ApexCharts(distributionChartContainer, options);
				distributionChart.render();
			} else {
				distributionChart.updateOptions(options);
			}
		});
	});

	// Channel Promo Penetration Donut Chart
	$effect(() => {
		if (!penetrationChartContainer || promo.channel_breakdown.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
		
			const options: ApexOptions = {
				...base,
				chart: { ...base.chart, type: 'donut', height: 350 },
				series: promo.channel_breakdown.map(c => c.total_discount),
				labels: promo.channel_breakdown.map(c => c.channel),
				colors: ['#3b82f6', '#f97316', '#e53935', '#10b981', '#6b7280'],
				dataLabels: {
					enabled: true,
					formatter: (val: number) => `${val.toFixed(1)}%`,
					style: { colors: ['#fff'] },
					dropShadow: { enabled: false }
				},
				legend: {
					position: 'bottom',
					labels: { colors: themeState.current === 'dark' ? '#e5e7eb' : '#374151' }
				},
				stroke: {
					width: 2,
					colors: [themeState.current === 'dark' ? '#1e293b' : '#ffffff']
				}
			};

			if (!penetrationChart) {
				penetrationChart = new ApexCharts(penetrationChartContainer, options);
				penetrationChart.render();
			} else {
				penetrationChart.updateOptions(options);
			}
		});
	});

	// AOV Comparison Chart (Promo vs Non-Promo)
	$effect(() => {
		if (!aovComparisonChartContainer || promo.monthly_promo_trend.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
			const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		
			const options: ApexOptions = {
				...base,
				chart: { ...base.chart, type: 'bar', height: 350 },
				series: [
					{
						name: 'Promo AOV',
						data: promo.monthly_promo_trend.map(m => Math.round(m.promo_aov))
					},
					{
						name: 'Non-Promo AOV',
						data: promo.monthly_promo_trend.map(m => Math.round(m.non_promo_aov))
					}
				],
				xaxis: {
					categories: promo.monthly_promo_trend.map(m => {
						const [y, mo] = m.month.split('-');
						const d = new Date(parseInt(y), parseInt(mo) - 1);
						return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
					}),
					labels: { style: { colors: labelColor } }
				},
				yaxis: {
					labels: { style: { colors: labelColor }, formatter: (val: number) => `₹${val}` }
				},
				colors: ['#10b981', '#64748b'], // Green for promo, grey for non-promo
				plotOptions: {
					bar: { borderRadius: 4, horizontal: false, columnWidth: '55%' }
				},
				dataLabels: { enabled: false },
				stroke: { show: true, width: 2, colors: ['transparent'] },
				legend: {
					position: 'top',
					labels: { colors: themeState.current === 'dark' ? '#e5e7eb' : '#374151' }
				}
			};

			if (!aovComparisonChart) {
				aovComparisonChart = new ApexCharts(aovComparisonChartContainer, options);
				aovComparisonChart.render();
			} else {
				aovComparisonChart.updateOptions(options);
			}
		});
	});

	// Monthly Volume Trend Chart (Area)
	$effect(() => {
		if (!monthlyTrendChartContainer || promo.monthly_promo_trend.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
			const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		
			const options: ApexOptions = {
				...base,
				chart: { ...base.chart, type: 'area', height: 350, stacked: true },
				series: [
					{
						name: 'Promo Orders',
						data: promo.monthly_promo_trend.map(m => m.promo_orders)
					},
					{
						name: 'Non-Promo Orders',
						data: promo.monthly_promo_trend.map(m => m.non_promo_orders)
					}
				],
				xaxis: {
					categories: promo.monthly_promo_trend.map(m => {
						const [y, mo] = m.month.split('-');
						const d = new Date(parseInt(y), parseInt(mo) - 1);
						return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
					}),
					labels: { style: { colors: labelColor } }
				},
				yaxis: {
					labels: { style: { colors: labelColor } }
				},
				colors: ['#8b5cf6', '#cbd5e1'], // Purple for promo, light grey for non-promo
				fill: {
					type: 'gradient',
					gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2, stops: [0, 90, 100] }
				},
				dataLabels: { enabled: false },
				stroke: { curve: 'smooth', width: 2 },
				legend: {
					position: 'top',
					labels: { colors: themeState.current === 'dark' ? '#e5e7eb' : '#374151' }
				}
			};

			if (!monthlyTrendChart) {
				monthlyTrendChart = new ApexCharts(monthlyTrendChartContainer, options);
				monthlyTrendChart.render();
			} else {
				monthlyTrendChart.updateOptions(options);
			}
		});
	});
</script>

<svelte:head>
	<title>Promo Impact - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Promo Impact</h1>
			<p>Discount effectiveness and before/after performance analysis</p>
		</div>
		<DateRangeHeader />
	</header>

	<!-- Performance Comparison (Promo vs Non-Promo) -->
	<div class="kpi-row">
		<KPICard
			title="Promo AOV vs Non-Promo"
			value={formatCurrency(promo.promo_vs_non_promo.promo_aov)}
			subtitle={`Non-Promo AOV: ${formatCurrency(promo.promo_vs_non_promo.non_promo_aov)}`}
			accentColor={promo.promo_vs_non_promo.aov_lift_pct >= 0 ? '#10b981' : '#ef4444'}
			icon={promo.promo_vs_non_promo.aov_lift_pct >= 0 ? TrendingUp : TrendingDown}
		/>
		<KPICard
			title="AOV Lift (Impact)"
			value={`${promo.promo_vs_non_promo.aov_lift_pct > 0 ? '+' : ''}${promo.promo_vs_non_promo.aov_lift_pct.toFixed(1)}%`}
			subtitle="Impact of discounts on cart size"
			accentColor={promo.promo_vs_non_promo.aov_lift_pct >= 0 ? '#10b981' : '#ef4444'}
		/>
		<KPICard
			title="Promo Orders Revenue"
			value={formatCurrency(promo.promo_vs_non_promo.promo_avg_revenue)}
			subtitle={`${promo.summary.penetration_rate.toFixed(1)}% penetration`}
			accentColor="#8b5cf6"
		/>
		<KPICard
			title="Total Discount Given"
			value={formatCurrency(promo.summary.total_discount_value)}
			subtitle={`Across ${promo.summary.total_orders_with_promo.toLocaleString('en-IN')} orders`}
			accentColor="#f59e0b"
		/>
	</div>

	{#if promo.discount_buckets.length > 0}
		<!-- AOV and Volume Trend Charts -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Average Order Value (AOV) Impact</h3>
				<p class="chart-subtitle">Monthly comparison of AOV for Promo vs Non-Promo orders</p>
				<div bind:this={aovComparisonChartContainer}></div>
			</div>
			<div class="chart-card card">
				<h3>Promo Order Volume Trend</h3>
				<p class="chart-subtitle">Monthly proportion of discounted vs regular orders</p>
				<div bind:this={monthlyTrendChartContainer}></div>
			</div>
		</div>

		<!-- Existing Distribution & Penetration Charts -->
		<div class="charts-row">
			<div class="chart-card card distribution-chart">
				<h3>Discount Distribution</h3>
				<p class="chart-subtitle">Number of orders by discount range</p>
				<div bind:this={distributionChartContainer}></div>
			</div>
			<div class="chart-card card penetration-chart">
				<h3>Discount Value by Channel</h3>
				<p class="chart-subtitle">Share of total discount value</p>
				<div bind:this={penetrationChartContainer}></div>
			</div>
		</div>

		<!-- Discount Buckets Table -->
		<div class="card table-card">
			<h3>Discount Distribution Analysis</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Discount Range</th>
							<th class="text-right">Orders</th>
							<th class="text-right">Penetration</th>
							<th class="text-right">Avg Discount</th>
							<th class="text-right">Total Discount</th>
							<th class="text-right">Total Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each promo.discount_buckets as bucket}
							<tr>
								<td class="font-bold">{bucket.bucket_range}</td>
								<td class="text-right">
									<span class="count">{bucket.order_count}</span>
								</td>
								<td class="text-right">
									<span class="percent">{bucket.penetration_rate.toFixed(1)}%</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(bucket.avg_discount)}</span>
								</td>
								<td class="text-right">
									<span class="total">{formatCurrency(bucket.total_discount_value)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(bucket.total_amount)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Channel Breakdown Table -->
		<div class="card table-card">
			<h3>Channel Breakdown</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Channel</th>
							<th class="text-right">Orders w/ Promo</th>
							<th class="text-right">Total Orders</th>
							<th class="text-right">Promo Penetration</th>
							<th class="text-right">Total Discount Value</th>
						</tr>
					</thead>
					<tbody>
						{#each promo.channel_breakdown as channel}
							<tr>
								<td class="font-bold">{channel.channel}</td>
								<td class="text-right">{channel.orders_with_promo}</td>
								<td class="text-right">{channel.total_orders}</td>
								<td class="text-right">
									<span class="percent">{channel.penetration_rate.toFixed(1)}%</span>
								</td>
								<td class="text-right">
									<span class="total">{formatCurrency(channel.total_discount)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Promo Data Available</h3>
			<p class="text-muted">
				No discount or promotion records found for the selected date range. Try adjusting the
				filters.
			</p>
		</div>
	{/if}
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		flex-wrap: wrap;
		padding: 1.5rem 2rem;
	}

	.header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.header p {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.kpi-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.charts-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	.chart-card {
		padding: 1.5rem 2rem;
	}

	.chart-card h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.chart-subtitle {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.table-card {
		padding: 1.5rem 2rem;
	}

	.table-card h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.table-container {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	th,
	td {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	th {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background-color: rgba(0, 0, 0, 0.02);
	}

	:global([data-theme='dark']) th {
		background-color: rgba(255, 255, 255, 0.02);
	}

	tr:last-child td {
		border-bottom: none;
	}

	.text-right {
		text-align: right;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.count {
		font-weight: 600;
		color: var(--text-primary);
	}

	.percent {
		color: var(--accent-primary);
		font-weight: 600;
	}

	.amount {
		color: var(--text-secondary);
	}

	.total {
		color: var(--accent-primary);
		font-weight: 600;
		font-size: 1.05rem;
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.text-muted {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	@media (max-width: 1024px) {
		.charts-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
		}

		.table-container {
			font-size: 0.85rem;
		}

		th,
		td {
			padding: 0.75rem 1rem;
		}
	}
</style>

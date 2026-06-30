<script lang="ts">
	import { page } from '$app/state';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { formatCurrency, getCommonChartOptions } from '$lib/utils/chart-helpers';
	import { themeState } from '$lib/stores/theme.svelte';
	import type ApexCharts from 'apexcharts';
	import type { ApexOptions } from 'apexcharts';

	let { data } = $props();
	const economics = $derived(data.economics);

	// Build channel color map
	const channelColorMap = $derived(
		Object.fromEntries((page.data.channels ?? []).map((c: any) => [c.id, c.color]))
	);

	function getChannelColor(channelId: string): string {
		return channelColorMap[channelId] || '#6b7280';
	}

	// Chart instances & containers
	let commissionChartContainer: HTMLDivElement | undefined = $state();
	let payoutRatioChartContainer: HTMLDivElement | undefined = $state();
	let leakageChartContainer: HTMLDivElement | undefined = $state();
	let trendChartContainer: HTMLDivElement | undefined = $state();

	let commissionChart: ApexCharts | undefined;
	let payoutRatioChart: ApexCharts | undefined;
	let leakageChart: ApexCharts | undefined;
	let trendChart: ApexCharts | undefined;

	onMount(() => {
		return () => {
			commissionChart?.destroy();
			payoutRatioChart?.destroy();
			leakageChart?.destroy();
			trendChart?.destroy();
		};
	});

	// Use $effect so charts re-render when data/theme changes
	$effect(() => {
		if (!commissionChartContainer || economics.channels.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'bar', height: 300 },
			series: [
				{
					name: 'Commission Rate (%)',
					data: economics.channels.map((c: any) => Number(c.commission_rate.toFixed(2)))
				}
			],
			xaxis: {
				categories: economics.channels.map((c: any) => c.channel_name),
				labels: { style: { colors: labelColor } }
			},
			yaxis: {
				labels: {
					style: { colors: labelColor },
					formatter: (val: number) => `${val.toFixed(1)}%`
				}
			},
			colors: economics.channels.map((c: any) => getChannelColor(c.channel_id)),
			plotOptions: {
				bar: { distributed: true, borderRadius: 4 }
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${val.toFixed(1)}%`,
				style: { colors: ['#fff'] }
			}
		};

			if (!commissionChart) {
				commissionChart = new ApexCharts(commissionChartContainer, options);
				commissionChart.render();
			} else {
				commissionChart.updateOptions(options);
			}
		});
	});

	$effect(() => {
		if (!payoutRatioChartContainer || economics.channels.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'bar', height: 300 },
			series: [
				{
					name: 'Payout Ratio (%)',
					data: economics.channels.map((c: any) => Number(c.payout_ratio.toFixed(2)))
				}
			],
			xaxis: {
				categories: economics.channels.map((c: any) => c.channel_name),
				labels: { style: { colors: labelColor } }
			},
			yaxis: {
				labels: {
					style: { colors: labelColor },
					formatter: (val: number) => `${val.toFixed(1)}%`
				}
			},
			colors: economics.channels.map((c: any) => getChannelColor(c.channel_id)),
			plotOptions: {
				bar: { distributed: true, borderRadius: 4 }
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${val.toFixed(1)}%`,
				style: { colors: ['#fff'] }
			}
		};

			if (!payoutRatioChart) {
				payoutRatioChart = new ApexCharts(payoutRatioChartContainer, options);
				payoutRatioChart.render();
			} else {
				payoutRatioChart.updateOptions(options);
			}
		});
	});

	$effect(() => {
		if (!leakageChartContainer || economics.channels.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';

		// Stacked bar: Commission + Other Charges
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'bar', height: 300, stacked: true },
			series: [
				{
					name: 'Commission',
					data: economics.channels.map((c: any) => Number((c.total_commission / 100000).toFixed(2)))
				},
				{
					name: 'Other Charges',
					data: economics.channels.map((c: any) => Number((c.total_other_charges / 100000).toFixed(2)))
				}
			],
			xaxis: {
				categories: economics.channels.map((c: any) => c.channel_name),
				labels: { style: { colors: labelColor } }
			},
			yaxis: {
				title: {
					text: 'Amount (Lakhs)',
					style: { color: labelColor }
				},
				labels: {
					style: { colors: labelColor },
					formatter: (val: number) => `₹${val} L`
				}
			},
			colors: ['#f97316', '#ef4444'],
			plotOptions: {
				bar: { borderRadius: 4 }
			},
			dataLabels: { enabled: false }
		};

			if (!leakageChart) {
				leakageChart = new ApexCharts(leakageChartContainer, options);
				leakageChart.render();
			} else {
				leakageChart.updateOptions(options);
			}
		});
	});

	// Monthly trend chart
	$effect(() => {
		if (!trendChartContainer || economics.monthly_trends.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'line', height: 300 },
			series: [
				{
					name: 'Commission',
					data: economics.monthly_trends.map((m: any) => Number((m.commission / 100000).toFixed(2)))
				},
				{
					name: 'Net Payout',
					data: economics.monthly_trends.map((m: any) => Number((m.net_payout / 100000).toFixed(2)))
				}
			],
			xaxis: {
				categories: economics.monthly_trends.map((m: any) => m.month),
				labels: { style: { colors: labelColor } }
			},
			yaxis: {
				title: { text: 'Amount (Lakhs)', style: { color: labelColor } },
				labels: {
					style: { colors: labelColor },
					formatter: (val: number) => `₹${val} L`
				}
			},
			colors: ['#f97316', '#10b981'],
			stroke: { curve: 'smooth', width: 2 },
			markers: { size: 3 },
			dataLabels: { enabled: false }
		};

			if (!trendChart) {
				trendChart = new ApexCharts(trendChartContainer, options);
				trendChart.render();
			} else {
				trendChart.updateOptions(options);
			}
		});
	});
</script>

<svelte:head>
	<title>Platform Economics - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Platform Economics</h1>
			<p>Fee breakdown, margin leakage, and payout analysis by channel</p>
		</div>
		<DateRangeHeader />
	</header>

	{#if economics.channels.length > 0}
		<!-- Summary KPIs -->
		<div class="kpi-row">
			<KPICard
				title="Total Gross Sales"
				value={formatCurrency(economics.summary.total_gross, '₹')}
				subtitle={`${economics.channels.reduce((sum, c) => sum + c.order_count, 0)} total orders`}
			/>
			<KPICard
				title="Total Commission"
				value={formatCurrency(economics.summary.total_commission, '₹')}
				subtitle={`${economics.summary.average_commission_rate.toFixed(1)}% avg rate`}
			/>
			<KPICard
				title="Total Leakage"
				value={formatCurrency(economics.summary.total_other_charges, '₹')}
				subtitle={`${economics.summary.average_leakage_rate.toFixed(1)}% avg leakage`}
			/>
			<KPICard
				title="Net Payout"
				value={formatCurrency(economics.summary.total_net_payout, '₹')}
				subtitle={`${economics.summary.total_gross > 0 ? ((economics.summary.total_net_payout / economics.summary.total_gross) * 100).toFixed(1) : '0'}% payout ratio`}
			/>
		</div>

		<!-- Charts Row 1: Commission vs Payout -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Commission Rate by Channel</h3>
				<p class="chart-subtitle">Lower is better — percentage of gross sales taken as commission</p>
				<div bind:this={commissionChartContainer}></div>
			</div>
			<div class="chart-card card">
				<h3>Payout Ratio by Channel</h3>
				<p class="chart-subtitle">Higher is better — percentage of gross sales received as payout</p>
				<div bind:this={payoutRatioChartContainer}></div>
			</div>
		</div>

		<!-- Charts Row 2: Leakage (stacked bar) + Monthly Trend -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Margin Leakage Breakdown</h3>
				<p class="chart-subtitle">Commission + Other Charges by channel (in Lakhs)</p>
				<div bind:this={leakageChartContainer}></div>
			</div>
			<div class="chart-card card">
				<h3>Monthly Commission vs Payout Trend</h3>
				<p class="chart-subtitle">How fees and payouts change over time</p>
				<div bind:this={trendChartContainer}></div>
			</div>
		</div>

		<!-- Detailed Channel Table -->
		<div class="card table-card">
			<h3>Channel-wise Breakdown</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Channel</th>
							<th class="text-right">Gross Sales</th>
							<th class="text-right">Commission</th>
							<th class="text-right">Other Charges</th>
							<th class="text-right">Net Payout</th>
							<th class="text-right">Commission %</th>
							<th class="text-right">Leakage %</th>
							<th class="text-right">Payout %</th>
							<th class="text-right">Orders</th>
						</tr>
					</thead>
					<tbody>
						{#each economics.channels as channel}
							<tr>
								<td class="font-medium">
									<div class="channel-badge">
										<span
											class="channel-dot"
											style:background-color={getChannelColor(channel.channel_id)}
										></span>
										{channel.channel_name}
									</div>
								</td>
								<td class="text-right">{formatCurrency(channel.total_gross, '₹', true)}</td>
								<td class="text-right text-warning"
									>{formatCurrency(channel.total_commission, '₹', true)}</td
								>
								<td class="text-right text-warning"
									>{formatCurrency(channel.total_other_charges, '₹', true)}</td
								>
								<td class="text-right font-bold"
									>{formatCurrency(channel.total_net_payout, '₹', true)}</td
								>
								<td class="text-right">
									<span class="rate-badge" class:rate-low={channel.commission_rate < 10}>
										{channel.commission_rate.toFixed(2)}%
									</span>
								</td>
								<td class="text-right">
									<span class="rate-badge" class:rate-low={channel.leakage_rate < 15}>
										{channel.leakage_rate.toFixed(2)}%
									</span>
								</td>
								<td class="text-right font-bold">
									<span class="rate-badge rate-success">
										{channel.payout_ratio.toFixed(2)}%
									</span>
								</td>
								<td class="text-right text-muted">{channel.order_count}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Data Available</h3>
			<p class="text-muted">
				No economics data available for the selected date range. Try adjusting the filters.
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
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

	.text-muted {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.text-warning {
		color: #f97316;
	}

	.font-medium {
		font-weight: 500;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.channel-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.channel-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.rate-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.8rem;
		font-weight: 600;
		background: rgba(249, 115, 22, 0.1);
		color: #f97316;
	}

	.rate-badge.rate-low {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.rate-badge.rate-success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
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

	@media (max-width: 1024px) {
		.charts-row {
			grid-template-columns: 1fr;
		}

		.header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { formatCurrency } from '$lib/utils/chart-helpers';
	import ApexCharts from 'apexcharts';
	import { onMount } from 'svelte';

	let { data } = $props();
	const economics = $derived(data.economics);

	// Build channel color map
	const channelColorMap = $derived(
		Object.fromEntries((page.data.channels ?? []).map((c: any) => [c.id, c.color]))
	);

	function getChannelColor(channelId: string): string {
		return channelColorMap[channelId] || '#6b7280';
	}

	let selectedChannel = $state(economics.channels[0]?.channel_id || '');
	import type { ApexOptions } from 'apexcharts';

	// Chart instances
	let commissionChartContainer: HTMLDivElement | undefined = $state();
	let payoutRatioChartContainer: HTMLDivElement | undefined = $state();
	let leakageChartContainer: HTMLDivElement | undefined = $state();

	onMount(() => {
		if (economics.channels.length > 0) {
			renderCommissionChart();
			renderPayoutRatioChart();
			renderLeakageChart();
		}
	});

	function renderCommissionChart() {
		if (!commissionChartContainer) return;

		const options: ApexOptions = {
			chart: { type: 'bar', height: 300 },
			series: [
				{
					name: 'Commission Rate (%)',
					data: economics.channels.map((c: any) => c.commission_rate)
				}
			],
			xaxis: {
				categories: economics.channels.map((c: any) => c.channel_name)
			},
			colors: economics.channels.map((c: any) => getChannelColor(c.channel_id)),
			plotOptions: {
				bar: { distributed: true }
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${val.toFixed(1)}%`
			}
		};

		new ApexCharts(commissionChartContainer, options).render();
	}

	function renderPayoutRatioChart() {
		if (!payoutRatioChartContainer) return;

		const options: ApexOptions = {
			chart: { type: 'bar', height: 300 },
			series: [
				{
					name: 'Payout Ratio (%)',
					data: economics.channels.map((c: any) => c.payout_ratio)
				}
			],
			xaxis: {
				categories: economics.channels.map((c: any) => c.channel_name)
			},
			colors: economics.channels.map((c: any) => getChannelColor(c.channel_id)),
			plotOptions: {
				bar: { distributed: true }
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${val.toFixed(1)}%`
			}
		};

		new ApexCharts(payoutRatioChartContainer, options).render();
	}

	function renderLeakageChart() {
		if (!leakageChartContainer) return;

		const options: ApexOptions = {
			chart: { type: 'bar', height: 300 },
			series: [
				{
					name: 'Leakage Rate (%)',
					data: economics.channels.map((c: any) => c.leakage_rate)
				}
			],
			xaxis: {
				categories: economics.channels.map((c: any) => c.channel_name)
			},
			colors: economics.channels.map((c: any) => getChannelColor(c.channel_id)),
			plotOptions: {
				bar: { distributed: true }
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${val.toFixed(1)}%`
			}
		};

		new ApexCharts(leakageChartContainer, options).render();
	}
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
				subtitle={`${((economics.summary.total_net_payout / economics.summary.total_gross) * 100).toFixed(1)}% payout ratio`}
			/>
		</div>

		<!-- Charts Row 1 -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Commission Rate by Channel</h3>
				<p class="chart-subtitle">Lower is better</p>
				<div bind:this={commissionChartContainer}></div>
			</div>
			<div class="chart-card card">
				<h3>Payout Ratio by Channel</h3>
				<p class="chart-subtitle">Higher is better</p>
				<div bind:this={payoutRatioChartContainer}></div>
			</div>
		</div>

		<!-- Charts Row 2 -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Margin Leakage by Channel</h3>
				<p class="chart-subtitle">Commission + Other Charges</p>
				<div bind:this={leakageChartContainer}></div>
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

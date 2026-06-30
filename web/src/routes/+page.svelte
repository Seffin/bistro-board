<script lang="ts">
	import { page } from '$app/state';
	import KPICard from '$lib/components/KPICard.svelte';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import RevenueTrendsChart from '$lib/components/charts/RevenueTrendsChart.svelte';
	import ChannelMixChart from '$lib/components/charts/ChannelMixChart.svelte';
	import ProfitLossChart from '$lib/components/charts/ProfitLossChart.svelte';
	import ExpenseBreakdownChart from '$lib/components/charts/ExpenseBreakdownChart.svelte';
	import HourlyVelocityChart from '$lib/components/charts/HourlyVelocityChart.svelte';
	import WeeklyPerformanceChart from '$lib/components/charts/WeeklyPerformanceChart.svelte';
	import MonthlyContributionChart from '$lib/components/charts/MonthlyContributionChart.svelte';
	import OrderStatusChart from '$lib/components/charts/OrderStatusChart.svelte';
	import { formatCurrency } from '$lib/utils/chart-helpers';
	import {
		IndianRupee,
		Banknote,
		ShoppingCart,
		Ticket
	} from '@lucide/svelte';

	let { data } = $props();
	const kpis = $derived(data.kpis);
	const charts = $derived(data.charts);

	// Dynamic channel configuration from layout data
	const channels = $derived(page.data.channels || []);

	let isSyncing = $state(false);
	let syncMessage = $state('');
	let syncLogs = $state<string[]>([]);
	let showLogs = $state(false);

	function handleDateFilterApply(start: string, end: string) {
		if (typeof window !== 'undefined') {
			setTimeout(() => window.location.reload(), 100);
		}
	}

	async function startSync() {
		if (isSyncing) return;
		isSyncing = true;
		syncMessage = '';
		syncLogs = [];
		showLogs = true;

		try {
			const res = await fetch('/api/sync', { method: 'POST' });
			if (!res.ok) throw new Error('Sync failed to start');
			if (!res.body) throw new Error('ReadableStream not supported');

			const reader = res.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n\n').filter(Boolean);

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const dataStr = line.substring(6);
						try {
							const data = JSON.parse(dataStr);
							if (data.done) {
								syncMessage = 'Data sync completed successfully';
								isSyncing = false;
								setTimeout(() => window.location.reload(), 2000);
							} else if (data.error) {
								syncMessage = `Sync Error: ${data.error}`;
								isSyncing = false;
							} else if (data.message) {
								syncLogs.push(data.message);
							}
						} catch (e) {
							// ignore malformed JSON
						}
					}
				}
			}
		} catch (err: any) {
			isSyncing = false;
			syncMessage = `Sync failed: ${err.message}`;
		}
	}
</script>

<svelte:head>
	<title>Executive Overview - Bistro Board</title>
</svelte:head>

<div class="overview-container">
	<!-- Header Section -->
	<header class="overview-header">
		<div class="title-area">
			<h1>Executive Overview</h1>
			<p class="subtitle">Multi-channel restaurant performance summary</p>
		</div>
		<div class="actions-area">
			<!-- Date Range Picker -->
			<DateRangeHeader onFilterApply={handleDateFilterApply} />

			<!-- Sync Button -->
			<button class="btn btn-primary" onclick={startSync} disabled={isSyncing}>
				{isSyncing ? 'Syncing...' : 'Sync Live Data'}
			</button>
		</div>
	</header>

	{#if showLogs}
		<div class="sync-console card">
			<div class="console-header">
				<h3>Sync Status</h3>
				<button class="close-btn" onclick={() => (showLogs = false)}>&times;</button>
			</div>
			<div class="console-logs">
				{#each syncLogs as log}
					<div class="log-line">{log}</div>
				{/each}
				{#if isSyncing}
					<div class="log-line blinking">Waiting for next step...</div>
				{/if}
			</div>
			{#if syncMessage}
				<div
					class="sync-banner {syncMessage.includes('Error') || syncMessage.includes('failed')
						? 'error'
						: 'success'} mt-2"
				>
					{syncMessage}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Main Content Area -->
	<div class="tab-content">
		<!-- Uniform 4-column KPI Grid -->
		<div class="kpis-grid">
			<KPICard
				title="Gross Revenue"
				value={formatCurrency(kpis.grossRevenue, '₹')}
				subtitle={`${kpis.revenueRetainedPct.toFixed(1)}% Retained`}
				subtitleColor="var(--success)"
				accentColor="#6366f1"
				icon={IndianRupee}
			/>
			<KPICard
				title="Net Payout (Bank Credit)"
				value={formatCurrency(kpis.netPayout, '₹')}
				subtitle="After platform fees"
				accentColor="#10b981"
				icon={Banknote}
			/>
			<KPICard
				title="Total Volume"
				value={kpis.totalVolume.toLocaleString('en-IN')}
				subtitle={`${kpis.successRatePct.toFixed(1)}% Success Rate`}
				subtitleColor="var(--warning)"
				accentColor="#f59e0b"
				icon={ShoppingCart}
			/>
			<KPICard
				title="Avg. Ticket Size (AOV)"
				value={formatCurrency(kpis.averageTicketSize, '₹')}
				subtitle="Per successful order"
				accentColor="#8b5cf6"
				icon={Ticket}
			/>
		</div>

		<!-- Channel-Specific KPI Cards (below the main 4) -->
		{#if channels.length > 0}
			<div class="channel-kpis">
				{#each channels.filter(c => {
					const selected = page.url.searchParams.get('channel');
					return !selected || selected === 'all' || selected === c.id;
				}) as channel}
					{@const stats = kpis.channelStats[channel.name.toLowerCase()] || {
						grossSales: 0,
						orderCount: 0,
						aov: 0
					}}
					<KPICard
						title={channel.name}
						accentColor={channel.color}
						metrics={[
							{ label: 'Gross Sales', value: formatCurrency(stats.grossSales, '₹', true) },
							{ label: 'Orders', value: stats.orderCount.toLocaleString('en-IN') },
							{ label: 'Ticket AOV', value: formatCurrency(stats.aov, '₹') }
						]}
					/>
				{/each}
			</div>
		{/if}

		<!-- Row 3: Revenue Trends & Channel Mix Charts -->
		<div class="charts-row">
			<div class="main-chart">
				<RevenueTrendsChart
					categories={charts.revenueTrends.categories}
					series={charts.revenueTrends.series}
				/>
			</div>
			<div class="side-chart">
				<ChannelMixChart
					categories={charts.channelMix.categories}
					series={charts.channelMix.series}
				/>
			</div>
		</div>

		<!-- Row 4: Profit & Loss Trend & Expense Breakdown -->
		<div class="charts-row">
			<div class="main-chart">
				<ProfitLossChart
					categories={charts.pnlTrends.categories}
					series={charts.pnlTrends.series}
				/>
			</div>
			<div class="side-chart">
				<ExpenseBreakdownChart
					labels={charts.expenseBreakdown.labels}
					series={charts.expenseBreakdown.series}
				/>
			</div>
		</div>

		<!-- Row 5: Hourly Velocity, Weekly Performance, Monthly Contribution -->
		<div class="charts-grid-3">
			<HourlyVelocityChart
				categories={charts.hourlyVelocity.categories}
				series={charts.hourlyVelocity.series}
			/>
			<WeeklyPerformanceChart
				categories={charts.weeklyPerformance.categories}
				series={charts.weeklyPerformance.series}
			/>
			<MonthlyContributionChart
				labels={charts.monthlyContribution.labels}
				series={charts.monthlyContribution.series}
				colors={charts.monthlyContribution.colors}
			/>
			<OrderStatusChart
				labels={charts.orderStatus.labels}
				series={charts.orderStatus.series}
				colors={charts.orderStatus.colors}
			/>
		</div>
	</div>
</div>

<style>
	.overview-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.overview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.title-area h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.actions-area {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.sync-banner {
		padding: 1rem 1.5rem;
		border-radius: var(--border-radius);
		font-weight: 600;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
	}

	.sync-banner.success {
		background: #10b98122;
		color: #10b981;
		border: 1px solid #10b98155;
	}

	.sync-banner.error {
		background: #ef444422;
		color: #ef4444;
		border: 1px solid #ef444455;
	}

	.mt-2 {
		margin-top: 1rem;
	}

	.sync-console {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
	}

	.console-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-tertiary);
	}

	.console-header h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 1.25rem;
		cursor: pointer;
	}

	.console-logs {
		padding: 1rem 1.5rem;
		max-height: 250px;
		overflow-y: auto;
		font-family: monospace;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.log-line {
		margin-bottom: 0.25rem;
	}

	.blinking {
		animation: blink 1.5s infinite;
		opacity: 0.5;
	}

	@keyframes blink {
		0% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.2;
		}
	}

	/* ── KPI Grids ── */
	.kpis-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.kpis-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.kpis-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.channel-kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.tab-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Chart Rows ── */
	.charts-row {
		display: grid;
		grid-template-columns: 2.1fr 1fr;
		gap: 1.5rem;
	}

	.charts-grid-3 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	@media (max-width: 1024px) {
		.charts-row {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
	import { THEME_SYSTEM_TABS } from './navigation-tabs';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import KPICard from '$lib/components/KPICard.svelte';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import RevenueTrendsChart from '$lib/components/charts/RevenueTrendsChart.svelte';
	import ChannelMixChart from '$lib/components/charts/ChannelMixChart.svelte';
	import ProfitLossChart from '$lib/components/charts/ProfitLossChart.svelte';
	import ExpenseBreakdownChart from '$lib/components/charts/ExpenseBreakdownChart.svelte';
	import HourlyVelocityChart from '$lib/components/charts/HourlyVelocityChart.svelte';
	import WeeklyPerformanceChart from '$lib/components/charts/WeeklyPerformanceChart.svelte';
	import MonthlyContributionChart from '$lib/components/charts/MonthlyContributionChart.svelte';
	import { formatCurrency } from '$lib/utils/chart-helpers';

	let { data } = $props();
	const kpis = $derived(data.kpis);
	const charts = $derived(data.charts);

	// Use URL search param ?tab=... or client-side state via Svelte 5 runes
	let selectedTab = $state('overview'); // Always overview on this page

	function selectTab(id: string) {
		if (id === 'overview') {
			// Stay on overview
			selectedTab = id;
			if (typeof window !== 'undefined') {
				const url = new URL(window.location.href);
				url.searchParams.set('tab', id);
				window.history.replaceState({}, '', url);
			}
		} else {
			// Navigate to specific route, preserving date range
			if (typeof window !== 'undefined') {
				const url = new URL(window.location.href);
				const dateStart = url.searchParams.get('start');
				const dateEnd = url.searchParams.get('end');
				
				let routePath = '/';
				switch (id) {
					case 'platform-economics':
						routePath = '/economics';
						break;
					case 'counter-insights':
						routePath = '/counter-insights';
						break;
					case 'order-journal':
						routePath = '/orders';
						break;
					case 'business-ledger':
						routePath = '/businesses';
						break;
					case 'reconciliation':
						routePath = '/reconciliation';
						break;
					case 'payout-analytics':
						routePath = '/payouts';
						break;
					case 'promo-impact':
						routePath = '/promo';
						break;
				}
				
				// Build new URL with date range preserved
				const newUrl = new URL(routePath, window.location.origin);
				if (dateStart) newUrl.searchParams.set('start', dateStart);
				if (dateEnd) newUrl.searchParams.set('end', dateEnd);
				window.location.href = newUrl.toString();
			}
		}
	}

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
								// Trigger reactivity explicitly if needed, but Svelte 5 arrays are deeply reactive by default
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
	<header class="overview-header card">
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
				<button class="close-btn" onclick={() => showLogs = false}>&times;</button>
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
				<div class="sync-banner {syncMessage.includes('Error') || syncMessage.includes('failed') ? 'error' : 'success'} mt-2">
					{syncMessage}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Theme System Tabs Navigation -->
	<nav class="theme-tabs card">
		{#each THEME_SYSTEM_TABS as tab}
			<button class="tab-btn" class:active={selectedTab === tab.id} onclick={() => selectTab(tab.id)}>
				{tab.label}
			</button>
		{/each}
	</nav>

	<!-- Main Content Area -->
	<div class="tab-content">
		<!-- Row 1: Top KPI Cards -->
		<div class="kpi-row-1">
			<KPICard
				title="Net Payout (Bank Credit)"
				value={formatCurrency(kpis.netPayout, '₹')}
				subtitle={`${kpis.revenueRetainedPct.toFixed(1)}% Revenue Retained`}
			/>
			<KPICard
				title="Total Volume"
				value={kpis.totalVolume.toLocaleString('en-IN')}
				subtitle={`${kpis.successRatePct.toFixed(1)}% Success Rate`}
			/>
		</div>

		<!-- Row 2: Channel-Specific KPI Cards -->
		<div class="kpi-row-2">
			{#each channels as channel}
				{@const stats = kpis.channelStats[channel.name.toLowerCase()] || { grossSales: 0, orderCount: 0, aov: 0 }}
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

		<!-- Row 3: Revenue Trends & Channel Mix Charts -->
		<div class="charts-row">
			<div class="main-chart">
				<RevenueTrendsChart categories={charts.revenueTrends.categories} series={charts.revenueTrends.series} />
			</div>
			<div class="side-chart">
				<ChannelMixChart categories={charts.channelMix.categories} series={charts.channelMix.series} />
			</div>
		</div>

		<!-- Row 4: Profit & Loss Trend & Expense Breakdown -->
		<div class="charts-row">
			<div class="main-chart">
				<ProfitLossChart categories={charts.pnlTrends.categories} series={charts.pnlTrends.series} />
			</div>
			<div class="side-chart">
				<ExpenseBreakdownChart labels={charts.expenseBreakdown.labels} series={charts.expenseBreakdown.series} />
			</div>
		</div>

		<!-- Row 5: Hourly Velocity, Weekly Performance, Monthly Contribution -->
		<div class="charts-grid-3">
			<HourlyVelocityChart categories={charts.hourlyVelocity.categories} series={charts.hourlyVelocity.series} />
			<WeeklyPerformanceChart categories={charts.weeklyPerformance.categories} series={charts.weeklyPerformance.series} />
			<MonthlyContributionChart
				labels={charts.monthlyContribution.labels}
				series={charts.monthlyContribution.series}
				colors={charts.monthlyContribution.colors}
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
		padding: 1.5rem 2rem;
		flex-wrap: wrap;
		gap: 1.5rem;
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

	.date-picker-form {
		/* Styles moved to DateRangeHeader.svelte component */
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		font-size: 0.875rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		border: none;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.btn-secondary:hover {
		background: var(--border-color);
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
		0% { opacity: 0.2; }
		50% { opacity: 1; }
		100% { opacity: 0.2; }
	}

	.theme-tabs {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		overflow-x: auto;
	}

	.tab-btn {
		background: transparent;
		border: none;
		padding: 0.6rem 1.25rem;
		border-radius: var(--border-radius);
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
	}

	.tab-btn:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
	}

	.tab-btn.active {
		background: var(--accent-primary);
		color: white;
		font-weight: 600;
	}

	.tab-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.kpi-row-1 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.kpi-row-2 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.charts-row {
		display: grid;
		grid-template-columns: 2fr 1fr;
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
</style>

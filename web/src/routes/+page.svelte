<script lang="ts">
	import { THEME_SYSTEM_TABS, getActiveTab } from './navigation-tabs';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import KPICard from '$lib/components/KPICard.svelte';
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
	let selectedTab = $state(getActiveTab(page.url.searchParams.get('tab')));

	function selectTab(id: string) {
		selectedTab = id;
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', id);
			window.history.replaceState({}, '', url);
		}
	}

	// Dynamic channel configuration from layout data
	const channels = $derived(page.data.channels || []);

	// Date Range Picker state
	let startDate = $state(page.url.searchParams.get('start') || '');
	let endDate = $state(page.url.searchParams.get('end') || '');
	let isSyncing = $state(false);
	let syncMessage = $state('');

	function applyDateRange(e: Event) {
		e.preventDefault();
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			if (startDate && endDate) {
				url.searchParams.set('start', startDate);
				url.searchParams.set('end', endDate);
			} else {
				url.searchParams.delete('start');
				url.searchParams.delete('end');
			}
			window.location.href = url.href; // trigger server reload with query params
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
			<form class="date-picker-form" onsubmit={applyDateRange}>
				<div class="date-inputs">
					<input type="date" bind:value={startDate} class="simple-input" aria-label="Start Date" />
					<span class="separator">to</span>
					<input type="date" bind:value={endDate} class="simple-input" aria-label="End Date" />
				</div>
				<button type="submit" class="btn btn-secondary">Filter</button>
			</form>

			<!-- Sync Button -->
			<form
				method="POST"
				action="?/sync"
				use:enhance={() => {
					isSyncing = true;
					syncMessage = '';
					return async ({ result, update }) => {
						isSyncing = false;
						if (result.type === 'success') {
							syncMessage = (result.data?.message as string) || 'Data sync completed successfully';
							setTimeout(() => (syncMessage = ''), 5000);
						}
						await update();
					};
				}}
			>
				<button type="submit" class="btn btn-primary" disabled={isSyncing}>
					{isSyncing ? 'Syncing...' : 'Sync Live Data'}
				</button>
			</form>
		</div>
	</header>

	{#if syncMessage}
		<div class="sync-banner success card">{syncMessage}</div>
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
		{#if selectedTab === 'overview'}
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
		{:else}
			<div class="empty-state card">
				<h3>{THEME_SYSTEM_TABS.find((t) => t.id === selectedTab)?.label}</h3>
				<p class="text-muted">Detailed analytics for this module will be populated in subsequent phases.</p>
			</div>
		{/if}
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
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--bg-primary);
		padding: 0.5rem 0.75rem;
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
	}

	.date-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.simple-input {
		background: transparent;
		border: none;
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.875rem;
		outline: none;
	}

	.simple-input::-webkit-calendar-picker-indicator {
		filter: invert(0.5);
		cursor: pointer;
	}

	.separator {
		color: var(--text-secondary);
		font-size: 0.875rem;
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

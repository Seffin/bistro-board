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
		Ticket,
		Wallet,
		PiggyBank,
		TrendingUp
	} from '@lucide/svelte';

	let { data } = $props();
	const kpis = $derived(data.kpis);
	const charts = $derived(data.charts);
	const monthlySummary = $derived(data.monthlySummary || []);
	const monthlyDetails = $derived(data.monthlyDetails || {});

	// Dynamic channel configuration from layout data
	const channels = $derived(page.data.channels || []);

	// Modal State
	let selectedMonthKey = $state<string | null>(null);
	let selectedMonthData = $derived(selectedMonthKey ? monthlyDetails[selectedMonthKey] : null);

	function openMonthDetails(index: number) {
		const monthKey = monthlySummary[index]?.monthKey;
		if (monthKey) {
			selectedMonthKey = monthKey;
		}
	}

	function closeModal() {
		selectedMonthKey = null;
	}

	let isSyncing = $state(false);
	let syncMessage = $state('');
	let syncLogs = $state<string[]>([]);
	let showLogs = $state(false);

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
			<DateRangeHeader />

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
		<!-- Primary KPIs: Total Income, Total Expense, Net Profit -->
		<div class="kpis-primary-grid">
			<KPICard
				title="Total Income"
				value={formatCurrency(kpis.totalIncome, '₹')}
				subtitle="From income register"
				accentColor="#10b981"
				icon={TrendingUp}
			/>
			<KPICard
				title="Total Expense"
				value={formatCurrency(kpis.totalExpense, '₹')}
				subtitle="Operating costs"
				accentColor="#ef4444"
				icon={Wallet}
			/>
			<KPICard
				title="Net Profit"
				value={formatCurrency(kpis.netProfit, '₹')}
				subtitle={kpis.totalIncome > 0 ? `${((kpis.netProfit / kpis.totalIncome) * 100).toFixed(1)}% margin` : 'No income data'}
				subtitleColor={kpis.netProfit >= 0 ? 'var(--success)' : '#ef4444'}
				accentColor="#8b5cf6"
				icon={PiggyBank}
			/>
		</div>

		<!-- Secondary KPIs: Gross Revenue, Net Payout, Total Volume, AOV -->
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
				accentColor="#0ea5e9"
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
				accentColor="#f97316"
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
					onMonthClick={openMonthDetails}
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
					onMonthClick={openMonthDetails}
				/>
			</div>
			<div class="side-chart">
				<ExpenseBreakdownChart
					labels={charts.expenseBreakdown.labels}
					series={charts.expenseBreakdown.series}
				/>
			</div>
		</div>

		<!-- Monthly Summary Table -->
		{#if monthlySummary.length > 0}
			<div class="card table-card">
				<h3>Monthly Summary</h3>
				<p class="subtitle" style="margin-bottom: 1rem;">Revenue, expenses, and profit over time</p>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Month</th>
								<th class="text-right">Orders</th>
								<th class="text-right">Revenue</th>
								<th class="text-right">Expenses</th>
								<th class="text-right">Net Profit</th>
								<th class="text-center">Action</th>
							</tr>
						</thead>
						<tbody>
							{#each monthlySummary as month, idx}
								<tr>
									<td class="font-bold">{month.label}</td>
									<td class="text-right">{month.orders.toLocaleString('en-IN')}</td>
									<td class="text-right">{formatCurrency(month.revenue * 100000, '₹')}</td>
									<td class="text-right">{formatCurrency(month.expenses * 100000, '₹')}</td>
									<td class="text-right font-bold" style:color={month.profit >= 0 ? '#10b981' : '#ef4444'}>
										{formatCurrency(month.profit * 100000, '₹')}
									</td>
									<td class="text-center">
										<button class="action-btn" onclick={() => openMonthDetails(idx)}>
											Details
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

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

<!-- Month Detail Modal -->
{#if selectedMonthData}
	<div class="modal-overlay" onclick={closeModal}>
		<div class="modal card" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h2>{selectedMonthData.label} Summary</h2>
					<p class="subtitle" style="margin-bottom: 0;">Detailed breakdown of revenue and expenses</p>
				</div>
				<button class="close-btn" onclick={closeModal}>&times;</button>
			</div>
			
			<div class="modal-body">
				<div class="modal-kpis">
					<div class="m-kpi">
						<span class="label">Orders</span>
						<span class="value">{selectedMonthData.orders.toLocaleString('en-IN')}</span>
					</div>
					<div class="m-kpi">
						<span class="label">Net Profit</span>
						<span class="value" style:color={selectedMonthData.profit >= 0 ? '#10b981' : '#ef4444'}>
							{formatCurrency(selectedMonthData.profit * 100000, '₹')}
						</span>
					</div>
				</div>

				<div class="modal-split">
					<div class="modal-section">
						<h3>Revenue by Channel</h3>
						<div class="breakdown-list">
							{#each Object.entries(selectedMonthData.channels || {}) as [channel, value]}
								<div class="breakdown-item">
									<span class="name">{channel}</span>
									<span class="val font-bold">{formatCurrency((value as number) * 100000, '₹')}</span>
								</div>
							{/each}
							<div class="breakdown-total">
								<span>Total Revenue</span>
								<span class="font-bold text-accent">{formatCurrency(selectedMonthData.revenueTotal * 100000, '₹')}</span>
							</div>
						</div>
					</div>

					<div class="modal-section">
						<h3>Expenses by Category</h3>
						<div class="breakdown-list">
							{#each Object.entries(selectedMonthData.expenseCategories || {}).sort((a,b) => (b[1] as number) - (a[1] as number)) as [category, value]}
								<div class="breakdown-item">
									<span class="name">{category}</span>
									<span class="val font-bold">{formatCurrency((value as number) * 100000, '₹')}</span>
								</div>
							{/each}
							<div class="breakdown-total">
								<span>Total Expenses</span>
								<span class="font-bold text-danger">{formatCurrency(selectedMonthData.expenseTotal * 100000, '₹')}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

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
	.kpis-primary-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.kpis-primary-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

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
		font-weight: 600;
	}
	
	/* Table Styles */
	.table-card { padding: 1.5rem 2rem; }
	.table-card h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem; }
	.table-container { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; text-align: left; }
	th, td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); }
	th { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; background-color: rgba(0, 0, 0, 0.02); }
	:global([data-theme='dark']) th { background-color: rgba(255, 255, 255, 0.02); }
	tr:last-child td { border-bottom: none; }
	.text-right { text-align: right; }
	.text-center { text-align: center; }
	.font-bold { font-weight: 700; }
	.action-btn { padding: 0.4rem 0.8rem; border-radius: 0.25rem; border: 1px solid var(--border-color); background: transparent; color: var(--accent-primary); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
	.action-btn:hover { background: var(--bg-secondary); border-color: var(--accent-primary); }

	/* Modal Styles */
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.modal { width: 95%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: slideIn 0.3s ease; display: flex; flex-direction: column; }
	@keyframes slideIn { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
	.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color); background: var(--bg-surface); position: sticky; top: 0; z-index: 10; }
	.modal-header h2 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem 0; }
	.close-btn { background: var(--bg-secondary); border: 1px solid var(--border-color); font-size: 1.25rem; border-radius: 50%; color: var(--text-secondary); cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
	.close-btn:hover { color: var(--text-primary); background: var(--border-color); }
	.modal-body { padding: 2rem; }
	.modal-kpis { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
	.m-kpi { flex: 1; padding: 1rem 1.5rem; background: var(--bg-secondary); border-radius: var(--border-radius); border: 1px solid var(--border-color); display: flex; flex-direction: column; }
	.m-kpi .label { color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.25rem; }
	.m-kpi .value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
	.modal-split { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
	.modal-section h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; }
	.breakdown-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.breakdown-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-radius: 0.25rem; }
	.breakdown-item:hover { background: var(--bg-secondary); }
	.breakdown-item .name { color: var(--text-secondary); font-size: 0.9rem; }
	.breakdown-item .val { color: var(--text-primary); font-size: 0.9rem; }
	.breakdown-total { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0.5rem 0.5rem; margin-top: 0.5rem; border-top: 1px dashed var(--border-color); font-weight: 600; }
	.text-accent { color: var(--accent-primary); }
	.text-danger { color: #ef4444; }

	@media (max-width: 1200px) {
		.charts-row,
		.charts-grid-3 {
			grid-template-columns: 1fr;
		}
	}
	
	@media (max-width: 768px) {
		.modal-split { grid-template-columns: 1fr; }
	}
</style>

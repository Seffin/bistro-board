<script lang="ts">
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import { themeState } from '$lib/stores/theme.svelte';
	import type ApexCharts from 'apexcharts';
	import type { ApexOptions } from 'apexcharts';
	import { onMount } from 'svelte';

	let { data } = $props();
	const payouts = $derived(data.payouts);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isHighestWeek(week: string): boolean {
		return week === payouts.summary.highest_week;
	}

	let trendChartContainer: HTMLDivElement | undefined = $state();
	let splitChartContainer: HTMLDivElement | undefined = $state();
	
	let trendChart: ApexCharts | undefined;
	let splitChart: ApexCharts | undefined;

	onMount(() => {
		return () => {
			trendChart?.destroy();
			splitChart?.destroy();
		};
	});

	// Weekly trend stacked bar chart
	$effect(() => {
		if (!trendChartContainer || payouts.weekly_payouts.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			// Reverse to show chronological order
			const chartData = [...payouts.weekly_payouts].reverse();

			const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'bar', height: 350, stacked: true },
			series: [
				{ name: 'Counter', data: chartData.map(d => Number((d.counter / 1000).toFixed(1))) },
				{ name: 'Swiggy', data: chartData.map(d => Number((d.swiggy / 1000).toFixed(1))) },
				{ name: 'Zomato', data: chartData.map(d => Number((d.zomato / 1000).toFixed(1))) },
				{ name: 'Other', data: chartData.map(d => Number((d.other / 1000).toFixed(1))) }
			],
			xaxis: {
				categories: chartData.map(d => d.week),
				labels: { style: { colors: labelColor, fontSize: '11px' } }
			},
			yaxis: {
				title: { text: 'Payout (Thousands)', style: { color: labelColor } },
				labels: {
					style: { colors: labelColor },
					formatter: (val: number) => `₹${val}K`
				}
			},
			colors: ['#3b82f6', '#f97316', '#e53935', '#6b7280'],
			plotOptions: {
				bar: { borderRadius: 4 }
			},
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

	// Channel split donut chart
	$effect(() => {
		if (!splitChartContainer || payouts.weekly_payouts.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			const totalCounter = payouts.weekly_payouts.reduce((sum, p) => sum + p.counter, 0);
			const totalSwiggy = payouts.weekly_payouts.reduce((sum, p) => sum + p.swiggy, 0);
			const totalZomato = payouts.weekly_payouts.reduce((sum, p) => sum + p.zomato, 0);
			const totalOther = payouts.weekly_payouts.reduce((sum, p) => sum + p.other, 0);

			const base = getCommonChartOptions(themeState.current);
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'donut', height: 350 },
			series: [totalCounter, totalSwiggy, totalZomato, totalOther].filter(v => v > 0),
			labels: ['Counter', 'Swiggy', 'Zomato', 'Other'].filter((_, i) => [totalCounter, totalSwiggy, totalZomato, totalOther][i] > 0),
			colors: ['#3b82f6', '#f97316', '#e53935', '#6b7280'].filter((_, i) => [totalCounter, totalSwiggy, totalZomato, totalOther][i] > 0),
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

			if (!splitChart) {
				splitChart = new ApexCharts(splitChartContainer, options);
				splitChart.render();
			} else {
				splitChart.updateOptions(options);
			}
		});
	});
</script>

<svelte:head>
	<title>Payout Analytics - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Payout Analytics</h1>
			<p>Weekly settlement breakdown by channel</p>
		</div>
		<DateRangeHeader />
	</header>

	<!-- Summary KPI Cards -->
	<div class="kpi-row">
		<KPICard
			title="Total Payout"
			value={formatCurrency(payouts.summary.total_payout)}
			subtitle={`${payouts.summary.weeks} weeks`}
		/>
		<KPICard
			title="Average Weekly"
			value={formatCurrency(payouts.summary.average_weekly)}
			subtitle="Per week"
		/>
		<KPICard
			title="Highest Week"
			value={payouts.summary.highest_week || 'N/A'}
			subtitle={payouts.summary.highest_week ? `Total: ${formatCurrency(payouts.weekly_payouts.find(w => w.week === payouts.summary.highest_week)?.total || 0)}` : 'No data'}
		/>
	</div>

	{#if payouts.weekly_payouts.length > 0}
		<!-- Charts Row -->
		<div class="charts-row">
			<div class="chart-card card trend-chart">
				<h3>Weekly Payout Trend</h3>
				<p class="chart-subtitle">Settlement amount by channel per week</p>
				<div bind:this={trendChartContainer}></div>
			</div>
			<div class="chart-card card split-chart">
				<h3>Overall Channel Split</h3>
				<p class="chart-subtitle">Percentage of total payouts</p>
				<div bind:this={splitChartContainer}></div>
			</div>
		</div>

		<!-- Weekly Breakdown Table -->
		<div class="card table-card">
			<h3>Weekly Payout Summary</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Week</th>
							<th class="text-right">Counter</th>
							<th class="text-right">Swiggy</th>
							<th class="text-right">Zomato</th>
							<th class="text-right">Other</th>
							<th class="text-right">Total</th>
						</tr>
					</thead>
					<tbody>
						{#each payouts.weekly_payouts as payout}
							<tr class={isHighestWeek(payout.week) ? 'highlight' : ''}>
								<td class="font-bold">
									<div class="week-cell">
										<span>{payout.week}</span>
										{#if isHighestWeek(payout.week)}
											<span class="badge-top">Top</span>
										{/if}
									</div>
									<span class="date-range">
										{formatDate(payout.start_date)} – {formatDate(payout.end_date)}
									</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(payout.counter)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(payout.swiggy)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(payout.zomato)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(payout.other)}</span>
								</td>
								<td class="text-right">
									<span class="total">{formatCurrency(payout.total)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Channel Totals -->
		<div class="card summary-card">
			<h3>Channel Totals</h3>
			<div class="summary-grid">
				{#each [
					{ label: 'Counter', value: payouts.weekly_payouts.reduce((sum, p) => sum + p.counter, 0), color: '#3b82f6' }, 
					{ label: 'Swiggy', value: payouts.weekly_payouts.reduce((sum, p) => sum + p.swiggy, 0), color: '#f97316' }, 
					{ label: 'Zomato', value: payouts.weekly_payouts.reduce((sum, p) => sum + p.zomato, 0), color: '#e53935' },
					{ label: 'Other', value: payouts.weekly_payouts.reduce((sum, p) => sum + p.other, 0), color: '#6b7280' }
				] as channel}
					<div class="summary-item">
						<div class="channel-header">
							<span class="dot" style:background-color={channel.color}></span>
							<span class="channel-name">{channel.label}</span>
						</div>
						<div class="channel-value">{formatCurrency(channel.value)}</div>
						{#if payouts.summary.total_payout > 0}
							<div class="channel-percent">
								{((channel.value / payouts.summary.total_payout) * 100).toFixed(1)}%
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Payout Data Available</h3>
			<p class="text-muted">
				No payout records found for the selected date range. Try adjusting the filters.
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
		grid-template-columns: 2fr 1fr;
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

	tr.highlight {
		background: rgba(59, 130, 246, 0.05);
	}

	:global([data-theme='dark']) tr.highlight {
		background: rgba(59, 130, 246, 0.1);
	}

	.text-right {
		text-align: right;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.week-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.badge-top {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border-radius: 0.2rem;
		font-size: 0.65rem;
		font-weight: 700;
	}

	.date-range {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.amount {
		color: var(--text-secondary);
	}

	.total {
		color: var(--accent-primary);
		font-weight: 600;
		font-size: 1.05rem;
	}

	.summary-card {
		padding: 1.5rem 2rem;
	}

	.summary-card h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.summary-item {
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 0.375rem;
		border: 1px solid var(--border-color);
	}

	.channel-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.channel-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.channel-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.channel-percent {
		font-size: 0.8rem;
		color: var(--text-secondary);
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

		.summary-grid {
			grid-template-columns: 1fr;
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

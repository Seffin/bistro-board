<script lang="ts">
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { page } from '$app/state';
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import { themeState } from '$lib/stores/theme.svelte';
	import ApexCharts from 'apexcharts';
	import { onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';

	let { data } = $props();
	const ledger = $derived(data.ledger);

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

	let trendChartContainer: HTMLDivElement | undefined = $state();
	let mixChartContainer: HTMLDivElement | undefined = $state();
	
	let trendChart: ApexCharts | undefined;
	let mixChart: ApexCharts | undefined;

	onMount(() => {
		return () => {
			trendChart?.destroy();
			mixChart?.destroy();
		};
	});

	// Daily income trend line chart
	$effect(() => {
		if (!trendChartContainer || ledger.daily_breakdown.length === 0) return;

		// Reverse to show chronological order
		const chartData = [...ledger.daily_breakdown].reverse();

		const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'area', height: 300 },
			series: [
				{ name: 'Total Income', data: chartData.map(d => d.total) },
				{ name: 'Counter', data: chartData.map(d => d.counter) }
			],
			xaxis: {
				categories: chartData.map(d => {
					const date = new Date(d.date);
					return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
				}),
				labels: { style: { colors: labelColor, fontSize: '10px' }, rotate: -45, rotateAlways: chartData.length > 15 }
			},
			yaxis: {
				labels: {
					style: { colors: labelColor },
					formatter: (val: number) => `₹${(val / 1000).toFixed(1)}K`
				}
			},
			colors: ['#6366f1', '#3b82f6'],
			stroke: { curve: 'smooth', width: 2 },
			fill: {
				type: 'gradient',
				gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] }
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

	// Channel mix pie chart
	$effect(() => {
		if (!mixChartContainer || ledger.daily_breakdown.length === 0) return;

		const totalCounter = ledger.daily_breakdown.reduce((sum, d) => sum + d.counter, 0);
		const totalSwiggy = ledger.daily_breakdown.reduce((sum, d) => sum + d.swiggy, 0);
		const totalZomato = ledger.daily_breakdown.reduce((sum, d) => sum + d.zomato, 0);
		const totalOther = ledger.daily_breakdown.reduce((sum, d) => sum + d.other, 0);

		const base = getCommonChartOptions(themeState.current);
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'donut', height: 300 },
			series: [totalCounter, totalSwiggy, totalZomato, totalOther],
			labels: ['Counter', 'Swiggy', 'Zomato', 'Other'],
			colors: ['#3b82f6', '#f97316', '#e53935', '#6b7280'],
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

		if (!mixChart) {
			mixChart = new ApexCharts(mixChartContainer, options);
			mixChart.render();
		} else {
			mixChart.updateOptions(options);
		}
	});
</script>

<svelte:head>
	<title>Business Ledger - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Business Ledger</h1>
			<p>Daily income tracking and profit analysis</p>
		</div>
		<DateRangeHeader />
	</header>

	<!-- Summary KPI Cards -->
	<div class="kpi-row">
		<KPICard
			title="Total Income"
			value={formatCurrency(ledger.summary.total_income)}
			subtitle={`${ledger.summary.days} days recorded`}
		/>
		<KPICard
			title="Total Expenses"
			value={formatCurrency(ledger.summary.total_expenses)}
			subtitle="Across all categories"
		/>
		<KPICard
			title="Net Profit"
			value={formatCurrency(ledger.summary.net_profit)}
			subtitle={`${ledger.summary.profit_margin.toFixed(1)}% margin`}
		/>
		<KPICard
			title="Avg Daily Income"
			value={formatCurrency(ledger.summary.days > 0 ? ledger.summary.total_income / ledger.summary.days : 0)}
			subtitle="Per recorded day"
		/>
	</div>

	{#if ledger.daily_breakdown.length > 0}
		<!-- Charts Row -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Daily Income Trend</h3>
				<p class="chart-subtitle">Total vs Counter revenue</p>
				<div bind:this={trendChartContainer}></div>
			</div>
			<div class="chart-card card">
				<h3>Income Mix</h3>
				<p class="chart-subtitle">Contribution by source</p>
				<div bind:this={mixChartContainer}></div>
			</div>
		</div>

		<!-- Daily Breakdown Table -->
		<div class="card table-card">
			<div class="table-header-row">
				<h3>Daily Income Breakdown</h3>
				<a
					href={`/api/export/ledger${page.url.search}`}
					class="btn btn-outline download-btn"
					download
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7 10 12 15 17 10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
					Download CSV
				</a>
			</div>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Date</th>
							<th class="text-right">Counter</th>
							<th class="text-right">Swiggy</th>
							<th class="text-right">Zomato</th>
							<th class="text-right">Other</th>
							<th class="text-right">Total</th>
						</tr>
					</thead>
					<tbody>
						{#each ledger.daily_breakdown as day}
							<tr>
								<td class="font-bold">{formatDate(day.date)}</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(day.counter)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(day.swiggy)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(day.zomato)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(day.other)}</span>
								</td>
								<td class="text-right font-bold">
									<span class="total">{formatCurrency(day.total)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Ledger Data Available</h3>
			<p class="text-muted">
				No income records found for the selected date range. Try adjusting the filters.
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
		margin-bottom: 1.5rem;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.table-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.table-header-row h3 {
		margin-bottom: 0;
	}

	.download-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		padding: 0.375rem 0.75rem;
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

	.amount {
		color: var(--text-secondary);
	}

	.total {
		color: var(--accent-primary);
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

	.btn-outline {
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text-primary);
		border-radius: var(--border-radius);
		cursor: pointer;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.btn-outline:hover {
		background: var(--bg-secondary);
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
	}
</style>

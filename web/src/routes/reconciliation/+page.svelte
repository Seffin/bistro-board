<script lang="ts">
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { page } from '$app/state';
	import { getCommonChartOptions } from '$lib/utils/chart-helpers';
	import { themeState } from '$lib/stores/theme.svelte';
	import type ApexCharts from 'apexcharts';
	import type { ApexOptions } from 'apexcharts';
	import { onMount } from 'svelte';

	let { data } = $props();
	const reconciliation = $derived(data.reconciliation);

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

	function getVarianceBadgeClass(variance: number): string {
		if (Math.abs(variance) < 1) return 'badge-success';
		if (Math.abs(variance) < 500) return 'badge-warning';
		return 'badge-error';
	}

	let varianceChartContainer: HTMLDivElement | undefined = $state();
	let varianceChart: ApexCharts | undefined;

	onMount(() => {
		return () => {
			varianceChart?.destroy();
		};
	});

	// Variance daily trend bar chart
	$effect(() => {
		if (!varianceChartContainer || reconciliation.daily_data.length === 0) return;

		import('apexcharts').then((module) => {
			const ApexCharts = module.default;
			
			// Reverse to show chronological order
			const chartData = [...reconciliation.daily_data].reverse();

			const base = getCommonChartOptions(themeState.current);
		const labelColor = themeState.current === 'dark' ? '#94a3b8' : '#64748b';
		
		const options: ApexOptions = {
			...base,
			chart: { ...base.chart, type: 'bar', height: 300 },
			series: [
				{ name: 'Variance', data: chartData.map(d => d.variance) }
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
					formatter: (val: number) => `₹${val.toFixed(0)}`
				}
			},
			plotOptions: {
				bar: {
					colors: {
						ranges: [
							{ from: -100000, to: -1, color: '#ef4444' },
							{ from: 0, to: 0.99, color: '#10b981' },
							{ from: 1, to: 100000, color: '#3b82f6' }
						]
					},
					borderRadius: 2
				}
			},
			dataLabels: { enabled: false }
		};

			if (!varianceChart) {
				varianceChart = new ApexCharts(varianceChartContainer, options);
				varianceChart.render();
			} else {
				varianceChart.updateOptions(options);
			}
		});
	});
</script>

<svelte:head>
	<title>Reconciliation - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Reconciliation</h1>
			<p>Counter vs Ledger daily variance analysis</p>
		</div>
		<DateRangeHeader />
	</header>

	<!-- Summary KPI Cards -->
	<div class="kpi-row">
		<KPICard
			title="Reconciliation Rate"
			value={`${reconciliation.summary.reconciliation_rate.toFixed(1)}%`}
			subtitle={`${reconciliation.summary.matched} matched, ${reconciliation.summary.mismatched} mismatched`}
		/>
		<KPICard
			title="Total Variance"
			value={formatCurrency(reconciliation.summary.total_variance)}
			subtitle="Cumulative difference"
		/>
		<KPICard
			title="POS Net Recorded"
			value={formatCurrency(reconciliation.summary.total_pos)}
			subtitle="Expected income"
		/>
		<KPICard
			title="Ledger Realized"
			value={formatCurrency(reconciliation.summary.total_ledger)}
			subtitle="Actual income"
		/>
	</div>

	{#if reconciliation.daily_data.length > 0}
		<!-- Chart Section -->
		<div class="chart-card card">
			<h3>Daily Variance Trend</h3>
			<p class="chart-subtitle">Positive means POS recorded more than Ledger, negative means Ledger recorded more than POS</p>
			<div bind:this={varianceChartContainer}></div>
		</div>

		<!-- Details Table -->
		<div class="card table-card">
			<div class="table-header-row">
				<h3>Daily Reconciliation Details</h3>
				<a
					href={`/api/export/reconciliation${page.url.search}`}
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
							<th class="text-right">POS Gross</th>
							<th class="text-right">POS Net</th>
							<th class="text-right">Ledger Recv</th>
							<th class="text-right">Variance</th>
							<th class="text-center">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each reconciliation.daily_data as day}
							<tr>
								<td class="font-bold">{formatDate(day.date)}</td>
								<td class="text-right text-muted">{formatCurrency(day.pos_gross)}</td>
								<td class="text-right">{formatCurrency(day.pos_net)}</td>
								<td class="text-right">{formatCurrency(day.ledger_amount)}</td>
								<td class="text-right font-bold">
									<span class={day.variance > 0 ? 'text-error' : day.variance < 0 ? 'text-primary' : ''}>
										{formatCurrency(day.variance)}
									</span>
								</td>
								<td class="text-center">
									<span class={`status-badge ${getVarianceBadgeClass(day.variance)}`}>
										{day.status.toUpperCase()}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Reconciliation Data</h3>
			<p class="text-muted">
				No records found to reconcile in the selected date range. Ensure both POS and Ledger data
				are synced.
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

	.table-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.table-header-row h3 {
		margin-bottom: 0;
		font-size: 1.25rem;
		font-weight: 600;
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

	.text-center {
		text-align: center;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.text-muted {
		color: var(--text-secondary);
	}

	.text-error {
		color: #ef4444;
	}

	.text-primary {
		color: #3b82f6;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.badge-success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.badge-warning {
		background: rgba(245, 158, 11, 0.1);
		color: #f59e0b;
	}

	.badge-error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
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

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
		}

		.table-header-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}
</style>

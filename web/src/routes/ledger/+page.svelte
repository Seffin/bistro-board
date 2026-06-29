<script lang="ts">
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { page } from '$app/state';

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
</script>

<svelte:head>
	<title>Business Ledger - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Business Ledger</h1>
			<p>Daily income breakdown and financial summary</p>
		</div>
		<DateRangeHeader />
	</header>

	<!-- Summary KPI Cards -->
	<div class="kpi-row">
		<KPICard
			title="Total Income"
			value={formatCurrency(ledger.summary.total_income)}
			subtitle={`${ledger.summary.days} days`}
		/>
		<KPICard
			title="Net Profit"
			value={formatCurrency(ledger.summary.net_profit)}
			subtitle={`${ledger.summary.profit_margin.toFixed(1)}% margin`}
		/>
		<KPICard
			title="Average Daily"
			value={formatCurrency(ledger.summary.total_income / Math.max(1, ledger.summary.days))}
			subtitle="Per day"
		/>
	</div>

	{#if ledger.daily_breakdown.length > 0}
		<!-- Daily Breakdown Table -->
		<div class="card table-card">
			<div class="table-header-row">
				<h3>Daily Income Breakdown</h3>
				<a href={`/api/export/ledger${page.url.search}`} class="btn btn-outline download-btn" download>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

		<!-- Channel Summary -->
		<div class="card summary-card">
			<h3>Channel Contribution</h3>
			<div class="summary-grid">
				{#each [
					{ label: 'Counter', value: ledger.daily_breakdown.reduce((sum, d) => sum + d.counter, 0), color: '#3b82f6' },
					{ label: 'Swiggy', value: ledger.daily_breakdown.reduce((sum, d) => sum + d.swiggy, 0), color: '#f97316' },
					{ label: 'Zomato', value: ledger.daily_breakdown.reduce((sum, d) => sum + d.zomato, 0), color: '#e53935' },
					{ label: 'Other', value: ledger.daily_breakdown.reduce((sum, d) => sum + d.other, 0), color: '#6b7280' }
				] as item}
					<div class="summary-item">
						<div class="channel-header">
							<span class="dot" style:background-color={item.color}></span>
							<span class="channel-name">{item.label}</span>
						</div>
						<div class="channel-value">{formatCurrency(item.value)}</div>
						{#if ledger.summary.total_income > 0}
							<div class="channel-percent">{((item.value / ledger.summary.total_income) * 100).toFixed(1)}%</div>
						{/if}
					</div>
				{/each}
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

	th, td {
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

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

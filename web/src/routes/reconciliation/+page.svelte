<script lang="ts">
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';

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
			title="Days Analyzed"
			value={reconciliation.summary.total}
			subtitle="In period"
		/>
	</div>

	{#if reconciliation.daily_records.length > 0}
		<!-- Reconciliation Table -->
		<div class="card table-card">
			<h3>Daily Reconciliation</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Date</th>
							<th class="text-right">Counter Total</th>
							<th class="text-right">Ledger Total</th>
							<th class="text-right">Variance</th>
							<th class="text-right">Variance %</th>
							<th class="text-center">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each reconciliation.daily_records as record}
							<tr>
								<td class="font-bold">{formatDate(record.date)}</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(record.counter_total)}</span>
								</td>
								<td class="text-right">
									<span class="amount">{formatCurrency(record.ledger_total)}</span>
								</td>
								<td class="text-right">
									<span class={record.variance >= 0 ? 'positive' : 'negative'}>
										{record.variance >= 0 ? '+' : ''}{formatCurrency(record.variance)}
									</span>
								</td>
								<td class="text-right">
									<span class={record.variance_percent >= 0 ? 'positive' : 'negative'}>
										{record.variance_percent >= 0 ? '+' : ''}{record.variance_percent.toFixed(2)}%
									</span>
								</td>
								<td class="text-center">
									<span class={`badge ${getVarianceBadgeClass(record.variance)}`}>
										{record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
			<h3>No Reconciliation Data Available</h3>
			<p class="text-muted">
				No records found for the selected date range. Try adjusting the filters.
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

	.text-center {
		text-align: center;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.amount {
		color: var(--text-secondary);
	}

	.positive {
		color: #10b981;
		font-weight: 600;
	}

	.negative {
		color: #ef4444;
		font-weight: 600;
	}

	.badge {
		display: inline-block;
		padding: 0.3rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
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

		.table-container {
			font-size: 0.85rem;
		}

		th, td {
			padding: 0.75rem 1rem;
		}
	}
</style>

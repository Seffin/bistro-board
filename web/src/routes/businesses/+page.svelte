<script lang="ts">
	import { page } from '$app/state';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	let { data } = $props();
	const ledger = $derived(data.ledger);

	// Build a lookup from channel ID → channel config
	const channelMap = $derived(
		Object.fromEntries(
			(page.data.channels ?? []).map((c: { id: string; name: string; color: string }) => [c.id, c])
		)
	);

	// Channel display names for income register columns (fallback to default if not in config)
	const swiggyLabel = $derived(channelMap['swiggy']?.name ?? 'Swiggy');
	const zomatoLabel = $derived(channelMap['zomato']?.name ?? 'Zomato');
	const swiggyColor = $derived(channelMap['swiggy']?.color ?? '#f97316');
	const zomatoColor = $derived(channelMap['zomato']?.color ?? '#ef4444');
</script>

<svelte:head>
	<title>Business Ledger - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<div class="header">
		<div>
			<h1>Business Ledger</h1>
			<p>Daily breakdown of income across channels and bank accounts.</p>
		</div>
		<DateRangeHeader />
	</div>

	<div class="card table-container">
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Day</th>
					<th class="text-right" style:color={swiggyColor}>{swiggyLabel}</th>
					<th class="text-right" style:color={zomatoColor}>{zomatoLabel}</th>
					<th class="text-right">Cash</th>
					<th class="text-right">Bank (Fed/Yes)</th>
					<th class="text-right highlight">Total Income</th>
				</tr>
			</thead>
			<tbody>
				{#each ledger as entry}
					<tr>
						<td class="font-medium">{entry.date || 'N/A'}</td>
						<td class="text-muted">{entry.day || 'N/A'}</td>
						<td class="text-right">₹{(entry.swiggy_payout || 0).toFixed(2)}</td>
						<td class="text-right">₹{(entry.zomato_payout || 0).toFixed(2)}</td>
						<td class="text-right">₹{(entry.cash || 0).toFixed(2)}</td>
						<td class="text-right text-muted"
							>₹{((entry.fed_bank || 0) + (entry.yes_bank || 0)).toFixed(2)}</td
						>
						<td class="text-right font-bold highlight">₹{(entry.total_income || 0).toFixed(2)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="text-center text-muted" style="padding: 3rem;"
							>No ledger entries found.</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
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
	}

	.header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.header p {
		color: var(--text-secondary);
	}

	.table-container {
		overflow-x: auto;
		padding: 0;
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
		font-size: 0.875rem;
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

	.font-medium {
		font-weight: 500;
	}
	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}
	.text-right {
		text-align: right;
	}
	.text-center {
		text-align: center;
	}
	.text-muted {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.highlight {
		background-color: rgba(72, 187, 120, 0.05);
		color: #48bb78;
	}

	:global([data-theme='dark']) .highlight {
		background-color: rgba(72, 187, 120, 0.1);
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';

	let { data } = $props();
	const ordersData = $derived(data.data);

	let searchQuery = $state(ordersData.filters.search || '');
	let selectedChannels = $state<string[]>(ordersData.filters.channels || []);
	let selectedStatuses = $state<string[]>(ordersData.filters.statuses || []);

	const availableChannels = ['counter', 'swiggy', 'zomato'];
	const availableStatuses = ['delivered', 'pending', 'cancelled', 'failed'];

	function updateFilters() {
		const params = new URLSearchParams(page.url.searchParams);

		if (searchQuery) {
			params.set('search', searchQuery);
		} else {
			params.delete('search');
		}

		if (selectedChannels.length > 0) {
			params.set('channels', selectedChannels.join(','));
		} else {
			params.delete('channels');
		}

		if (selectedStatuses.length > 0) {
			params.set('statuses', selectedStatuses.join(','));
		} else {
			params.delete('statuses');
		}

		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function toggleChannel(channel: string) {
		if (selectedChannels.includes(channel)) {
			selectedChannels = selectedChannels.filter((c) => c !== channel);
		} else {
			selectedChannels = [...selectedChannels, channel];
		}
		updateFilters();
	}

	function toggleStatus(status: string) {
		if (selectedStatuses.includes(status)) {
			selectedStatuses = selectedStatuses.filter((s) => s !== status);
		} else {
			selectedStatuses = [...selectedStatuses, status];
		}
		updateFilters();
	}

	function handleSearch() {
		updateFilters();
	}

	function clearFilters() {
		searchQuery = '';
		selectedChannels = [];
		selectedStatuses = [];

		const params = new URLSearchParams();
		goto(`?${params.toString()}`);
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusBadgeClass(status: string): string {
		const s = status.toLowerCase();
		if (s === 'delivered') return 'badge-success';
		if (s === 'pending') return 'badge-warning';
		if (s === 'cancelled' || s === 'failed') return 'badge-error';
		return 'badge-neutral';
	}

	function getChannelBadgeClass(channel: string): string {
		const c = channel.toLowerCase();
		if (c === 'counter') return 'badge-primary';
		if (c === 'swiggy') return 'badge-orange';
		if (c === 'zomato') return 'badge-red';
		return 'badge-neutral';
	}
</script>

<svelte:head>
	<title>Order Journal - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Order Journal</h1>
			<p>Complete order history with filtering and search</p>
		</div>
		<DateRangeHeader />
	</header>

	<!-- KPI Cards -->
	<div class="kpi-row">
		<KPICard
			title="Total Orders"
			value={ordersData.pagination.totalOrders.toLocaleString('en-IN')}
			subtitle={`Page ${ordersData.pagination.currentPage} of ${ordersData.pagination.totalPages}`}
		/>
		<KPICard
			title="Showing"
			value={`${ordersData.orders.length} orders`}
			subtitle={`${ordersData.pagination.pageSize} per page`}
		/>
	</div>

	<!-- Filters -->
	<div class="card filters-card">
		<div class="filters-header">
			<h3>Filters</h3>
			<div class="filters-actions">
				<a
					href={`/api/export/orders${page.url.search}`}
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
				{#if selectedChannels.length > 0 || selectedStatuses.length > 0 || searchQuery}
					<button class="btn btn-secondary" onclick={clearFilters}>Clear All</button>
				{/if}
			</div>
		</div>

		<!-- Search Box -->
		<div class="search-box">
			<input
				type="text"
				placeholder="Search by Order ID..."
				bind:value={searchQuery}
				onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				class="search-input"
			/>
			<button class="btn-primary" onclick={handleSearch}>Search</button>
		</div>

		<!-- Channel Filters -->
		<div class="filter-group">
			<h4>Channel</h4>
			<div class="checkbox-group">
				{#each availableChannels as channel}
					<label class="checkbox-label">
						<input
							type="checkbox"
							checked={selectedChannels.includes(channel)}
							onchange={() => toggleChannel(channel)}
						/>
						<span>{channel.charAt(0).toUpperCase() + channel.slice(1)}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Status Filters -->
		<div class="filter-group">
			<h4>Status</h4>
			<div class="checkbox-group">
				{#each availableStatuses as status}
					<label class="checkbox-label">
						<input
							type="checkbox"
							checked={selectedStatuses.includes(status)}
							onchange={() => toggleStatus(status)}
						/>
						<span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
					</label>
				{/each}
			</div>
		</div>
	</div>

	<!-- Orders Table -->
	{#if ordersData.orders.length > 0}
		<div class="card table-card">
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Order ID</th>
							<th>Date</th>
							<th>Channel</th>
							<th>Status</th>
							<th class="text-right">Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each ordersData.orders as order}
							<tr>
								<td class="font-mono font-bold">{order.order_id}</td>
								<td>{formatDate(order.order_date)}</td>
								<td>
									<span class={`badge ${getChannelBadgeClass(order.channel)}`}>
										{order.channel.toUpperCase()}
									</span>
								</td>
								<td>
									<span class={`badge ${getStatusBadgeClass(order.status)}`}>
										{order.status.charAt(0).toUpperCase() + order.status.slice(1)}
									</span>
								</td>
								<td class="text-right font-bold">{formatCurrency(order.grand_total)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Pagination -->
		<div class="card pagination-card">
			<div class="pagination-info">
				<p>
					Showing {(ordersData.pagination.currentPage - 1) * ordersData.pagination.pageSize + 1} to {Math.min(
						ordersData.pagination.currentPage * ordersData.pagination.pageSize,
						ordersData.pagination.totalOrders
					)} of {ordersData.pagination.totalOrders} orders
				</p>
			</div>

			<div class="pagination-controls">
				<button
					class="btn-secondary"
					disabled={ordersData.pagination.currentPage === 1}
					onclick={() => goToPage(ordersData.pagination.currentPage - 1)}
				>
					← Previous
				</button>

				<div class="page-numbers">
					{#each Array.from({ length: Math.min(5, ordersData.pagination.totalPages) }) as _, i}
						{@const pageNum = i + 1}
						{@const isActive = pageNum === ordersData.pagination.currentPage}
						<button
							class={`page-btn ${isActive ? 'active' : ''}`}
							onclick={() => goToPage(pageNum)}
						>
							{pageNum}
						</button>
					{/each}
					{#if ordersData.pagination.totalPages > 5}
						<span class="ellipsis">...</span>
						<button class="page-btn" onclick={() => goToPage(ordersData.pagination.totalPages)}>
							{ordersData.pagination.totalPages}
						</button>
					{/if}
				</div>

				<button
					class="btn-secondary"
					disabled={ordersData.pagination.currentPage === ordersData.pagination.totalPages}
					onclick={() => goToPage(ordersData.pagination.currentPage + 1)}
				>
					Next →
				</button>
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Orders Found</h3>
			<p class="text-muted">
				No orders match your current filters. Try adjusting the search or filter criteria.
			</p>
			<button class="btn-primary" onclick={clearFilters}>Clear Filters</button>
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

	.filters-card {
		padding: 1.5rem 2rem;
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	.filters-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.download-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		padding: 0.375rem 0.75rem;
	}

	.filters-header h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.search-box {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.search-input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background: var(--bg-input);
		color: var(--text-primary);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.filter-group {
		margin-bottom: 1.5rem;
	}

	.filter-group:last-child {
		margin-bottom: 0;
	}

	.filter-group h4 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.checkbox-group {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.checkbox-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.table-card {
		padding: 1.5rem 2rem;
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

	.font-mono {
		font-family: 'Courier New', monospace;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
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

	.badge-primary {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}

	.badge-orange {
		background: rgba(249, 115, 22, 0.1);
		color: #f97316;
	}

	.badge-red {
		background: rgba(229, 57, 53, 0.1);
		color: #e53935;
	}

	.badge-neutral {
		background: rgba(107, 114, 128, 0.1);
		color: #6b7280;
	}

	.pagination-card {
		padding: 1.5rem 2rem;
	}

	.pagination-info {
		margin-bottom: 1rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.pagination-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.page-numbers {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.page-btn {
		width: 32px;
		height: 32px;
		border: 1px solid var(--border-color);
		border-radius: 0.25rem;
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.page-btn:hover {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.page-btn.active {
		background: var(--accent-primary);
		border-color: var(--accent-primary);
		color: white;
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ellipsis {
		color: var(--text-secondary);
		padding: 0 0.5rem;
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
		margin-bottom: 1.5rem;
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.375rem;
		background: var(--accent-primary);
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		padding: 0.75rem 1.5rem;
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		background: transparent;
		color: var(--text-primary);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.btn-secondary:hover {
		background: var(--bg-secondary);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

		.search-box {
			flex-direction: column;
		}

		.pagination-controls {
			flex-direction: column;
		}

		.checkbox-group {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>

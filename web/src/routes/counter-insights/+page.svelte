<script lang="ts">
	import { page } from '$app/state';
	import DateRangeHeader from '$lib/components/DateRangeHeader.svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import ApexCharts from 'apexcharts';
	import { onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';

	let { data } = $props();
	const insights = $derived(data.insights);

	let topItemsChartContainer: HTMLDivElement | undefined = $state();
	let paymentMixChartContainer: HTMLDivElement | undefined = $state();
	let selectedItem: (typeof insights.top_items)[0] | null = $state(null);

	onMount(() => {
		if (insights.top_items.length > 0) {
			renderTopItemsChart();
		}
		if (insights.payment_mix.length > 0) {
			renderPaymentMixChart();
		}
	});

	function renderTopItemsChart() {
		if (!topItemsChartContainer) return;

		const options: ApexOptions = {
			chart: {
				type: 'bar',
				height: 400,
				toolbar: { show: false }
			},
			series: [
				{
					name: 'Orders',
					data: insights.top_items.map((item: any) => item.count)
				}
			],
			xaxis: {
				categories: insights.top_items.map((item: any) => item.name),
				labels: {
					rotate: -45,
					rotateAlways: true
				}
			},
			colors: ['#3b82f6'],
			dataLabels: {
				enabled: true,
				formatter: (val: number) => val
			},
			plotOptions: {
				bar: {
					horizontal: false,
					distributed: false
				}
			}
		};

		new ApexCharts(topItemsChartContainer, options).render();
	}

	function renderPaymentMixChart() {
		if (!paymentMixChartContainer) return;

		const options: ApexOptions = {
			chart: {
				type: 'donut',
				height: 350
			},
			series: insights.payment_mix.map((p: any) => p.count),
			labels: insights.payment_mix.map((p: any) => p.type.charAt(0).toUpperCase() + p.type.slice(1)),
			colors: ['#10b981', '#f97316', '#8b5cf6', '#ef4444'],
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${parseFloat(val as any).toFixed(1)}%`
			},
			legend: {
				position: 'bottom'
			}
		};

		new ApexCharts(paymentMixChartContainer, options).render();
	}

	function selectItem(item: (typeof insights.top_items)[0]) {
		selectedItem = item;
	}

	function closeModal() {
		selectedItem = null;
	}

	function getPaymentColor(paymentType: string): string {
		const type = paymentType.toLowerCase();
		switch (type) {
			case 'cash':
				return '#10b981';
			case 'card':
				return '#f97316';
			case 'upi':
				return '#8b5cf6';
			default:
				return '#6b7280';
		}
	}
</script>

<svelte:head>
	<title>Counter Insights - Bistro Board</title>
</svelte:head>

<div class="page-container">
	<!-- Header Section -->
	<header class="header card">
		<div>
			<h1>Counter Insights</h1>
			<p>POS performance analysis and payment mix breakdown</p>
		</div>
		<DateRangeHeader />
	</header>

	{#if insights.total_orders > 0}
		<!-- Summary KPI Cards -->
		<div class="kpi-row">
			<KPICard
				title="Total Counter Orders"
				value={insights.total_orders.toLocaleString('en-IN')}
				subtitle={`${insights.top_items.length} unique items sold`}
			/>
			<KPICard
				title="Top Item"
				value={insights.top_items[0]?.name || 'N/A'}
				subtitle={`${insights.top_items[0]?.count || 0} orders (${insights.top_items[0]?.percentage.toFixed(1) || 0}%)`}
			/>
			<KPICard
				title="Most Used Payment"
				value={insights.payment_mix[0]?.type.toUpperCase() || 'N/A'}
				subtitle={`${insights.payment_mix[0]?.count || 0} transactions (${insights.payment_mix[0]?.percentage.toFixed(1) || 0}%)`}
			/>
		</div>

		<!-- Charts Row -->
		<div class="charts-row">
			<div class="chart-card card">
				<h3>Top 15 Items</h3>
				<p class="chart-subtitle">Most frequently ordered items</p>
				<div bind:this={topItemsChartContainer}></div>
			</div>

			<div class="chart-card card">
				<h3>Payment Method Mix</h3>
				<p class="chart-subtitle">Distribution across payment types</p>
				<div bind:this={paymentMixChartContainer}></div>
			</div>
		</div>

		<!-- Items Table -->
		<div class="card table-card">
			<h3>Item Details</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Rank</th>
							<th>Item Name</th>
							<th class="text-right">Orders</th>
							<th class="text-right">Percentage</th>
							<th class="text-center">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each insights.top_items as item, idx}
							<tr>
								<td class="text-center font-bold">{idx + 1}</td>
								<td class="font-medium">{item.name}</td>
								<td class="text-right">{item.count}</td>
								<td class="text-right">
									<span class="percent-badge">{item.percentage.toFixed(1)}%</span>
								</td>
								<td class="text-center">
									<button class="action-btn" onclick={() => selectItem(item)}>
										View Trends
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Payment Methods Table -->
		<div class="card table-card">
			<h3>Payment Method Breakdown</h3>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Payment Type</th>
							<th class="text-right">Transactions</th>
							<th class="text-right">Percentage</th>
						</tr>
					</thead>
					<tbody>
						{#each insights.payment_mix as payment}
							<tr>
								<td class="font-medium">
									<div class="payment-badge">
										<span class="payment-dot" style:background-color={getPaymentColor(payment.type)}></span>
										{payment.type.charAt(0).toUpperCase() + payment.type.slice(1)}
									</div>
								</td>
								<td class="text-right font-bold">{payment.count}</td>
								<td class="text-right">
									<span class="percent-badge">{payment.percentage.toFixed(1)}%</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="empty-state card">
			<h3>No Counter Data Available</h3>
			<p class="text-muted">
				No orders found for the Counter channel in the selected date range. Try adjusting the filters.
			</p>
		</div>
	{/if}

	<!-- Item Detail Modal -->
	{#if selectedItem}
		<div class="modal-overlay" onclick={closeModal}>
			<div class="modal card" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h2>{selectedItem.name}</h2>
					<button class="close-btn" onclick={closeModal}>×</button>
				</div>
				<div class="modal-body">
					<div class="metric">
						<span class="label">Total Orders:</span>
						<span class="value font-bold">{selectedItem.count}</span>
					</div>
					<div class="metric">
						<span class="label">Percentage of Sales:</span>
						<span class="value font-bold">{selectedItem.percentage.toFixed(2)}%</span>
					</div>
					<p class="text-muted" style="margin-top: 1rem; font-size: 0.85rem;">
						Weekly trends and co-purchased items analysis coming in future updates.
					</p>
				</div>
			</div>
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
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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

	.text-muted {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.font-medium {
		font-weight: 500;
	}

	.font-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.percent-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.8rem;
		font-weight: 600;
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}

	.action-btn {
		padding: 0.4rem 0.8rem;
		border-radius: 0.25rem;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--accent-primary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		background: var(--bg-secondary);
		border-color: var(--accent-primary);
	}

	.payment-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.payment-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
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

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal {
		width: 90%;
		max-width: 400px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			transform: translateY(-50px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.modal-body {
		padding: 1.5rem 2rem;
	}

	.metric {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border-radius: 0.25rem;
	}

	.metric .label {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.metric .value {
		font-size: 1.1rem;
	}

	@media (max-width: 1024px) {
		.charts-row {
			grid-template-columns: 1fr;
		}

		.header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>

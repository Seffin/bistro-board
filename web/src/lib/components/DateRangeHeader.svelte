<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getDefaultDateRange } from '$lib/utils/date-filter';
	import ChannelFilter from './ChannelFilter.svelte';

	interface Props {
		onFilterApply?: (start: string, end: string) => void;
		showChannelFilter?: boolean;
	}

	let { onFilterApply, showChannelFilter = true }: Props = $props();

	// Initialize from URL params or fallback to default range
	const defaultRange = getDefaultDateRange();
	let startDate = $state(page.url.searchParams.get('start') || defaultRange.start);
	let endDate = $state(page.url.searchParams.get('end') || defaultRange.end);

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
			// Use browser history to update URL without full reload
			goto(url.toString(), { keepFocus: true, noScroll: true });
			// Trigger data reload by calling the callback
			if (onFilterApply) {
				onFilterApply(startDate, endDate);
			}
		}
	}

	function clearDateRange(e: Event) {
		e.preventDefault();
		startDate = '';
		endDate = '';
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.delete('start');
			url.searchParams.delete('end');
			goto(url.toString(), { keepFocus: true, noScroll: true });
			if (onFilterApply) {
				onFilterApply('', '');
			}
		}
	}
</script>

<div class="filters-container">
	{#if showChannelFilter}
		<ChannelFilter />
	{/if}
	<form class="date-picker-form" onsubmit={applyDateRange}>
		<div class="date-inputs">
			<input type="date" min="2025-01-01" max="2026-06-20" bind:value={startDate} class="simple-input" aria-label="Start Date" />
			<span class="separator">to</span>
			<input type="date" min="2025-01-01" max="2026-06-20" bind:value={endDate} class="simple-input" aria-label="End Date" />
		</div>
		<div class="date-actions">
			<button type="submit" class="btn btn-secondary btn-sm" aria-label="Apply date filter"
				>Apply</button
			>
			{#if startDate && endDate}
				<button
					type="button"
					class="btn btn-icon btn-sm"
					aria-label="Clear date filter"
					onclick={clearDateRange}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
						></line></svg
					>
				</button>
			{/if}
		</div>
	</form>
</div>

<style>
	.filters-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.date-picker-form {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.date-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.simple-input {
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.simple-input:focus {
		border-color: var(--accent-primary);
	}

	.separator {
		color: var(--text-secondary);
		font-size: 0.875rem;
		margin: 0 0.25rem;
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.5rem 1.25rem;
		border-radius: var(--border-radius);
		border: none;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-secondary {
		background: var(--accent-secondary);
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent-secondary) 90%, black);
	}

	.btn-ghost {
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.btn-ghost:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.date-picker-form {
			flex-direction: column;
			align-items: stretch;
		}

		.date-inputs {
			width: 100%;
		}

		.simple-input {
			flex: 1;
		}

		.button-group {
			width: 100%;
		}

		.btn {
			flex: 1;
		}
	}
</style>

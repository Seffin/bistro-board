<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let channels = $derived(page.data.channels || []);
	let selectedChannel = $derived(page.url.searchParams.get('channel') || 'all');

	function handleChannelChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;

		const newUrl = new URL(window.location.href);
		if (value === 'all') {
			newUrl.searchParams.delete('channel');
		} else {
			newUrl.searchParams.set('channel', value);
		}

		goto(newUrl.pathname + newUrl.search, { keepFocus: true, noScroll: true, invalidateAll: true });
	}
</script>

<div class="channel-filter-wrapper">
	<select
		value={selectedChannel}
		onchange={handleChannelChange}
		class="channel-select"
		aria-label="Filter by Channel"
	>
		<option value="all">All Channels</option>
		{#each channels as channel}
			<option value={channel.id}>{channel.name}</option>
		{/each}
	</select>
</div>

<style>
	.channel-filter-wrapper {
		display: inline-flex;
		align-items: center;
	}

	.channel-select {
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-surface, #ffffff);
		color: var(--text-primary, #111827);
		cursor: pointer;
		outline: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		transition:
			border-color 0.15s ease-in-out,
			box-shadow 0.15s ease-in-out;
	}

	.channel-select:focus {
		border-color: var(--primary-color, #4f46e5);
		box-shadow: 0 0 0 2px var(--primary-color-light, rgba(79, 70, 229, 0.2));
	}

	:global([data-theme='dark']) .channel-select {
		border-color: var(--border-color);
		background-color: var(--bg-surface);
		color: var(--text-primary);
	}
</style>

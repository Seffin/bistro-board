<script lang="ts">
	import { page } from '$app/state';

	let { tabs = [], currentPath = '/' } = $props<{
		tabs: { label: string; href: string }[];
		currentPath?: string;
	}>();
</script>

<nav class="tab-bar">
	<ul class="tab-list">
		{#each tabs as tab}
			{@const isActive = currentPath === tab.href}
			{@const hrefWithParams = `${tab.href}${page.url.search}`}
			<li>
				<a
					href={hrefWithParams}
					class="tab-link"
					class:active={isActive}
					aria-current={isActive ? 'page' : undefined}
				>
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.tab-bar {
		/* Inherits background from header */
	}

	.tab-list {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
		margin: 0;
		list-style: none;
	}

	.tab-link {
		display: block;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-sm, 6px);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.2s ease;
		color: var(--text-muted);
	}

	.tab-link:hover {
		color: var(--text-primary);
		background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
	}

	.tab-link.active {
		color: var(--primary-color, #4f46e5);
		background-color: var(--primary-color-light, rgba(79, 70, 229, 0.1));
	}

	/* Dark mode specific adjustments if needed */
	:global([data-theme='dark']) .tab-link:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}
</style>

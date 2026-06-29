<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Toast from '$lib/components/Toast.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import UserDropdown from '$lib/components/UserDropdown.svelte';
	import TabBar from '$lib/components/navigation/TabBar.svelte';
	let { children, data } = $props();

	let isAuthPage = $derived(page.url.pathname === '/login' || page.url.pathname === '/register');

	function getChannelUrl(channelId: string) {
		const searchParams = new URLSearchParams(page.url.searchParams);
		searchParams.set('channel', channelId);
		return `/sales?${searchParams.toString()}`;
	}
</script>

<svelte:head>
	<title>Bistro Board | Business Portal</title>
</svelte:head>

<Toast />

{#if isAuthPage}
	<div class="auth-layout">
		{@render children()}
	</div>
{:else}
	<div class="app-container">
		<!-- Sidebar -->
		<aside class="sidebar card">
			<div class="logo">
				<h2>Bistro Board</h2>
			</div>
			<nav>
				<a href="/" class="nav-item" class:active={page.url.pathname === '/'}>Dashboard</a>
				<a href="/sales" class="nav-item" class:active={page.url.pathname === '/sales'}>Sales</a>
				<a href="/businesses" class="nav-item" class:active={page.url.pathname === '/businesses'}
					>Businesses</a
				>

				{#if data.channels && data.channels.length > 0}
					<div class="nav-section-label">Channels</div>
					{#each data.channels as channel}
						<a
							href={getChannelUrl(channel.id)}
							class="nav-item channel-item"
						>
							<span class="channel-dot" style:background-color={channel.color}></span>
							{channel.name}
						</a>
					{/each}
				{/if}

				<div class="nav-section-label">System</div>
				<a
					href="/settings"
					class="nav-item"
					class:active={page.url.pathname === ('/settings' as string)}>Settings</a
				>
			</nav>
		</aside>

		<!-- Main Content -->
		<main class="main-content">
			<header class="top-header card">
				<div class="header-left">
					<TabBar
						tabs={[
							{ label: 'Overview', href: '/' },
							{ label: 'Platform Economics', href: '/economics' },
							{ label: 'Counter Insights', href: '/counter-insights' },
							{ label: 'Order Journal', href: '/orders' },
							{ label: 'Business Ledger', href: '/ledger' },
							{ label: 'Reconciliation', href: '/reconciliation' },
							{ label: 'Payout Analytics', href: '/payouts' },
							{ label: 'Promo Impact', href: '/promo' }
						]}
						currentPath={page.url.pathname}
					/>
				</div>
				<div class="header-actions">
					<ThemeToggle />
					<UserDropdown user={data.user} />
				</div>
			</header>

			<div class="page-content">
				{@render children()}
			</div>
		</main>
	</div>
{/if}

<style>
	.auth-layout {
		min-height: 100vh;
		background: var(--bg-secondary);
	}
	.app-container {
		display: flex;
		height: 100vh;
		background: var(--bg-secondary);
	}

	.sidebar {
		width: 280px;
		display: flex;
		flex-direction: column;
		border-radius: 0;
		border-top: none;
		border-bottom: none;
		border-left: none;
		background: var(--bg-surface);
	}

	.logo {
		padding: 1.5rem 1.5rem 1rem;
	}

	.logo h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.025em;
	}

	nav {
		padding: 0 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow-y: auto;
	}

	.nav-item {
		padding: 0.625rem 1rem;
		border-radius: var(--border-radius-sm);
		color: var(--text-secondary);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
		transition: all var(--transition-fast);
		display: flex;
		align-items: center;
	}

	.nav-item:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
		transform: translateX(2px);
	}

	.nav-item.active {
		background: var(--accent-light);
		color: var(--accent-primary);
		font-weight: 600;
	}

	.nav-section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		padding: 1.5rem 1rem 0.5rem;
	}

	.channel-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.channel-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		background: var(--bg-secondary);
	}

	.top-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		border-radius: 0;
		border: none;
		background: var(--bg-surface);
		position: sticky;
		top: 0;
		z-index: 20;
		box-shadow: var(--shadow-sm);
	}

	.search-bar {
		width: 320px;
	}

	.search-bar input {
		width: 100%;
		padding: 0.625rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-lg);
		background: var(--bg-secondary);
		color: var(--text-primary);
		outline: none;
		font-family: inherit;
		font-size: 0.875rem;
		transition: all var(--transition-fast);
	}

	.search-bar input:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px var(--accent-light);
		background: var(--bg-surface);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.page-content {
		padding: 2rem;
		flex: 1;
		max-width: 1600px;
		margin: 0 auto;
		width: 100%;
	}
</style>

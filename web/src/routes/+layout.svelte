<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Toast from '$lib/components/Toast.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import UserDropdown from '$lib/components/UserDropdown.svelte';
	import {
		LayoutDashboard,
		TrendingUp,
		ChefHat,
		ScrollText,
		BookOpen,
		GitCompare,
		Wallet,
		BadgePercent,
		ShoppingCart,
		Building2,
		Settings,
		Calendar
	} from '@lucide/svelte';
	let { children, data } = $props();

	let isAuthPage = $derived(page.url.pathname === '/login' || page.url.pathname === '/register');

	/** Build href preserving current search params */
	function navHref(path: string) {
		return `${path}${page.url.search}`;
	}

	function getChannelUrl(channelId: string) {
		const searchParams = new URLSearchParams(page.url.searchParams);
		searchParams.set('channel', channelId);
		return `/sales?${searchParams.toString()}`;
	}

	/** Check if a nav item is active */
	function isActive(path: string) {
		return page.url.pathname === path;
	}

	const navItems = [
		{ label: 'Overview', href: '/', icon: LayoutDashboard },
		{ label: 'Platform Economics', href: '/economics', icon: TrendingUp },
		{ label: 'Counter Insights', href: '/counter-insights', icon: ChefHat },
		{ label: 'Order Journal', href: '/orders', icon: ScrollText },
		{ label: 'Business Ledger', href: '/ledger', icon: BookOpen },
		{ label: 'Reconciliation', href: '/reconciliation', icon: GitCompare },
		{ label: 'Payout Analytics', href: '/payouts', icon: Wallet },
		{ label: 'Promo Impact', href: '/promo', icon: BadgePercent }
	];

	const dateLabel = $derived(() => {
		const s = page.url.searchParams.get('start');
		const e = page.url.searchParams.get('end');
		if (s && e) {
			const fmt = (d: string) => {
				const dt = new Date(d);
				return dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
			};
			return `${fmt(s)} – ${fmt(e)}`;
		}
		return 'All Time';
	});
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
		<aside class="sidebar">
			<!-- Branding -->
			<div class="brand">
				<span class="brand-name">Philos</span>
				<span class="brand-sub">Delicacy & Analytics</span>
			</div>

			<!-- Main Navigation -->
			<nav class="nav-main">
				<div class="nav-section-label">Analytics</div>
				{#each navItems as item}
					<a
						href={navHref(item.href)}
						class="nav-item"
						class:active={isActive(item.href)}
					>
						<svelte:component this={item.icon} size={18} />
						<span>{item.label}</span>
					</a>
				{/each}

				{#if data.channels && data.channels.length > 0}
					<div class="nav-section-label">Channels</div>
					{#each data.channels as channel}
						<a
							href={getChannelUrl(channel.id)}
							class="nav-item channel-item"
						>
							<span class="channel-dot" style:background-color={channel.color}></span>
							<span>{channel.name}</span>
						</a>
					{/each}
				{/if}

				<div class="nav-section-label">System</div>
				<a href="/settings" class="nav-item" class:active={isActive('/settings')}>
					<Settings size={18} />
					<span>Settings</span>
				</a>
			</nav>

			<!-- Sidebar Footer -->
			<div class="sidebar-footer">
				<!-- Theme Toggle Box -->
				<div class="theme-box">
					<span class="theme-label">Theme</span>
					<ThemeToggle />
				</div>

				<!-- Date Range Indicator -->
				<div class="date-indicator">
					<Calendar size={14} />
					<span>{dateLabel()}</span>
				</div>

				<!-- User -->
				<div class="sidebar-user">
					<UserDropdown user={data.user} />
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="main-content">
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

	/* ── Sidebar ── */
	.sidebar {
		width: 260px;
		display: flex;
		flex-direction: column;
		background: var(--bg-surface);
		border-right: 1px solid var(--border-color);
		overflow-y: auto;
		flex-shrink: 0;
	}

	.brand {
		padding: 1.5rem 1.25rem 1.25rem;
		display: flex;
		flex-direction: column;
	}

	.brand-name {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--accent-primary);
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.brand-sub {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin-top: 0.125rem;
	}

	.nav-main {
		flex: 1;
		padding: 0 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-section-label {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		padding: 1.25rem 0.75rem 0.375rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--border-radius-sm);
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 500;
		transition: all var(--transition-fast);
		border-left: 3px solid transparent;
	}

	.nav-item:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.nav-item.active {
		background: var(--accent-light);
		color: var(--accent-primary);
		font-weight: 600;
		border-left-color: var(--accent-primary);
	}

	.channel-item {
		gap: 0.625rem;
	}

	.channel-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	/* ── Sidebar Footer ── */
	.sidebar-footer {
		border-top: 1px solid var(--border-color);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: auto;
	}

	.theme-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: var(--bg-secondary);
		border-radius: var(--border-radius-sm);
		border: 1px solid var(--border-color);
	}

	.theme-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.date-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.sidebar-user {
		display: flex;
		align-items: center;
	}

	/* ── Main Content ── */
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		background: var(--bg-secondary);
	}

	.page-content {
		padding: 2rem;
		flex: 1;
		max-width: 1600px;
		margin: 0 auto;
		width: 100%;
	}
</style>

<script lang="ts">
	import ChannelsTab from './ChannelsTab.svelte';
	import UploadTab from './UploadTab.svelte';
	import CredentialsTab from './CredentialsTab.svelte';
	let { data } = $props();

	let activeTab = $state('channels');

	function setTab(tab: string) {
		activeTab = tab;
	}
</script>

<div class="settings-container">
	<header class="settings-header">
		<h1>Settings</h1>
		<p class="subtitle">Manage channels, uploads, and credentials</p>
	</header>

	<div class="settings-layout">
		<aside class="settings-sidebar">
			<nav class="settings-nav">
				<button
					class="nav-item"
					class:active={activeTab === 'channels'}
					onclick={() => setTab('channels')}
				>
					<span class="icon">📋</span> Channels Management
				</button>
				<button
					class="nav-item"
					class:active={activeTab === 'upload'}
					onclick={() => setTab('upload')}
				>
					<span class="icon">📤</span> Manual Upload
				</button>
				<button
					class="nav-item"
					class:active={activeTab === 'credentials'}
					onclick={() => setTab('credentials')}
				>
					<span class="icon">🔐</span> Credentials
				</button>
			</nav>
		</aside>

		<main class="settings-content card">
			{#if activeTab === 'channels'}
				<ChannelsTab initialChannels={data.channels} />
			{:else if activeTab === 'upload'}
				<UploadTab channelsList={data.channels} />
			{:else if activeTab === 'credentials'}
				<CredentialsTab />
			{/if}
		</main>
	</div>
</div>

<style>
	.settings-container {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.settings-header {
		margin-bottom: 2rem;
	}

	.settings-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 0.5rem 0;
	}

	.settings-header .subtitle {
		color: var(--text-secondary);
		margin: 0;
		font-size: 0.95rem;
	}

	.settings-layout {
		display: grid;
		grid-template-columns: 240px 1fr;
		gap: 2rem;
	}

	@media (max-width: 768px) {
		.settings-layout {
			grid-template-columns: 1fr;
		}
	}

	.settings-sidebar {
		position: sticky;
		top: 1.5rem;
		align-self: flex-start;
	}

	.settings-nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.nav-item:hover {
		background: var(--bg-hover, rgba(0, 0, 0, 0.05));
		color: var(--text-primary);
	}

	.nav-item.active {
		background: var(--accent-primary);
		color: white;
	}

	.nav-item .icon {
		font-size: 1.25rem;
	}

	.settings-content {
		padding: 2rem;
		min-height: 400px;
	}

	.tab-pane h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.tab-pane p {
		color: var(--text-secondary);
		margin: 0 0 1.5rem 0;
	}
</style>

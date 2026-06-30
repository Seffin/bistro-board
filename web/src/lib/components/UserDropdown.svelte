<script lang="ts">
	import { clickOutside } from '$lib/utils/click-outside';

	interface User {
		username: string;
		fullName: string;
		email: string;
	}

	interface Props {
		user: User | null;
	}

	let { user }: Props = $props();

	let isOpen = $state(false);

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function closeDropdown() {
		isOpen = false;
	}

	const initial = $derived(
		user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'A'
	);
</script>

<div class="dropdown-container" use:clickOutside={closeDropdown}>
	<button class="avatar-btn" onclick={toggleDropdown} aria-expanded={isOpen} aria-haspopup="true">
		<div class="avatar">{initial}</div>
	</button>

	{#if isOpen}
		<div class="dropdown-menu card">
			<div class="dropdown-header">
				<div class="user-info">
					<p class="user-name">{user?.fullName || user?.username || 'Admin User'}</p>
					<p class="user-email">{user?.email || '@' + (user?.username || 'admin')}</p>
				</div>
			</div>

			<div class="dropdown-divider"></div>

			<a href="/settings" class="dropdown-item" onclick={closeDropdown}>
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
					<circle cx="12" cy="12" r="3"></circle>
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
					></path>
				</svg>
				Settings
			</a>

			<a href="/logout" class="dropdown-item text-danger" onclick={closeDropdown}>
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
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
					<polyline points="16 17 21 12 16 7"></polyline>
					<line x1="21" y1="12" x2="9" y2="12"></line>
				</svg>
				Sign out
			</a>
		</div>
	{/if}
</div>

<style>
	.dropdown-container {
		position: relative;
	}

	.avatar-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		border-radius: 50%;
		transition:
			transform var(--transition-fast),
			box-shadow var(--transition-fast);
		outline: none;
	}

	.avatar-btn:hover {
		transform: scale(1.05);
	}

	.avatar-btn:focus-visible {
		box-shadow:
			0 0 0 2px var(--bg-surface),
			0 0 0 4px var(--accent-primary);
	}

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
		box-shadow: var(--shadow-sm);
	}

	.dropdown-menu {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		width: 220px;
		background: var(--bg-surface);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		animation: slideUp 0.15s ease-out;
		transform-origin: bottom left;
		border: 1px solid var(--border-color);
		overflow: hidden;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.dropdown-header {
		padding: 1rem;
		background: var(--bg-secondary);
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.user-name {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-email {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dropdown-divider {
		height: 1px;
		background: var(--border-color);
		margin: 0;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all var(--transition-fast);
		background: transparent;
	}

	.dropdown-item:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.dropdown-item.text-danger {
		color: var(--danger);
	}

	.dropdown-item.text-danger:hover {
		background: var(--danger-bg);
	}
</style>

<script lang="ts">
	import { toasts, dismissToast, type ToastType } from '$lib/stores/toast';

	const iconMap: Record<ToastType, string> = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	};
</script>

<div class="toast-container" aria-live="polite">
	{#each $toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}" role="alert">
			<span class="toast-icon">{iconMap[toast.type]}</span>
			<span class="toast-message">{toast.message}</span>
			<button
				class="toast-close"
				onclick={() => dismissToast(toast.id)}
				aria-label="Dismiss notification"
			>
				✕
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
		max-width: 400px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		pointer-events: all;
		animation: slideIn 0.3s ease-out;
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.15),
			0 1px 3px rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(8px);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toast-success {
		background: rgba(5, 150, 105, 0.95);
		color: white;
	}

	.toast-error {
		background: rgba(220, 38, 38, 0.95);
		color: white;
	}

	.toast-warning {
		background: rgba(217, 119, 6, 0.95);
		color: white;
	}

	.toast-info {
		background: rgba(37, 99, 235, 0.95);
		color: white;
	}

	.toast-icon {
		font-size: 1rem;
		flex-shrink: 0;
		width: 20px;
		text-align: center;
	}

	.toast-message {
		flex: 1;
		line-height: 1.4;
	}

	.toast-close {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.125rem 0.25rem;
		border-radius: 4px;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.toast-close:hover {
		color: white;
		background: rgba(255, 255, 255, 0.15);
	}
</style>

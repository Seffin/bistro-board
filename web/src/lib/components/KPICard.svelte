<script lang="ts">
	import type { Component } from 'svelte';

	let {
		title,
		value = '',
		subtitle = '',
		subtitleColor = '',
		accentColor = '',
		icon = undefined,
		metrics = []
	} = $props<{
		title: string;
		value?: string;
		subtitle?: string;
		subtitleColor?: string;
		accentColor?: string;
		icon?: Component<{ size?: number; class?: string }>;
		metrics?: { label: string; value: string }[];
	}>();
</script>

<div class="kpi-card" style:border-top={accentColor ? `4px solid ${accentColor}` : undefined}>
	<div class="kpi-body">
		<div class="kpi-text">
			<span class="kpi-title">{title}</span>
			<span class="kpi-value">{value}</span>
			{#if subtitle}
				<span class="kpi-subtitle" style:color={subtitleColor || undefined}>{subtitle}</span>
			{/if}
			{#if metrics && metrics.length > 0}
				<div class="metrics-grid">
					{#each metrics as m}
						<div class="metric-item">
							<span class="metric-label">{m.label}</span>
							<span class="metric-value">{m.value}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		{#if icon}
			<div
				class="kpi-icon-box"
				style:background={accentColor ? `color-mix(in srgb, ${accentColor} 12%, transparent)` : 'var(--accent-light)'}
				style:color={accentColor || 'var(--accent-primary)'}
			>
				{@render iconSlot()}
			</div>
		{/if}
	</div>
</div>

{#snippet iconSlot()}
	{#if icon}
		<svelte:component this={icon} size={24} />
	{/if}
{/snippet}

<style>
	.kpi-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
		transition:
			transform var(--transition-fast),
			box-shadow var(--transition-normal);
	}

	.kpi-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.kpi-body {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.kpi-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.kpi-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
		margin-bottom: 0.375rem;
	}

	.kpi-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
		margin-bottom: 0.25rem;
	}

	.kpi-subtitle {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.kpi-icon-box {
		width: 48px;
		height: 48px;
		border-radius: var(--border-radius);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}

	.metric-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metric-label {
		font-size: 0.6875rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.metric-value {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--text-primary);
	}
</style>

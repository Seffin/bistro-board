<script lang="ts">
	let {
		title,
		value = '',
		subtitle = '',
		accentColor = '',
		metrics = []
	} = $props<{
		title: string;
		value?: string;
		subtitle?: string;
		accentColor?: string;
		metrics?: { label: string; value: string }[];
	}>();
</script>

<div class="kpi-card card" style:border-top={accentColor ? `4px solid ${accentColor}` : 'none'}>
	<div class="kpi-info">
		<h3 style:color={accentColor || undefined}>{title}</h3>
		{#if value}
			<div class="value">{value}</div>
		{/if}
		{#if subtitle}
			<div class="subtitle-text">{subtitle}</div>
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
</div>

<style>
	.kpi-card {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
		transition: transform 0.2s ease;
		border-radius: var(--border-radius);
	}

	.kpi-card:hover {
		transform: translateY(-2px);
	}

	.kpi-info h3 {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.kpi-info .value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.subtitle-text {
		font-size: 0.875rem;
		color: var(--text-secondary);
		font-weight: 500;
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
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		font-weight: 600;
	}

	.metric-value {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
	}
</style>

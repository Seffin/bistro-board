<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { InferSelectModel } from 'drizzle-orm';
	import type { channels } from '$lib/server/db/schema';

	type Channel = InferSelectModel<typeof channels>;

	let { initialChannels } = $props<{ initialChannels: Channel[] }>();
	
	let channelsList = $state(initialChannels);
	let isAdding = $state(false);
	let editingId = $state<string | null>(null);

	let formData = $state<Partial<Channel>>({});

	async function fetchChannels() {
		const res = await fetch('/api/channels');
		if (res.ok) {
			channelsList = await res.json();
		}
	}

	function startAdd() {
		formData = { is_active: true, color: '#000000', email_keywords: '' };
		isAdding = true;
		editingId = null;
	}

	function startEdit(channel: Channel) {
		formData = { ...channel, email_keywords: channel.email_keywords ? JSON.parse(channel.email_keywords as string).join(', ') : '' };
		isAdding = false;
		editingId = channel.id;
	}

	function cancelForm() {
		isAdding = false;
		editingId = null;
		formData = {};
	}

	async function saveChannel(e: Event) {
		e.preventDefault();
		
		const payload = {
			...formData,
			email_keywords: formData.email_keywords ? (formData.email_keywords as string).split(',').map(s => s.trim()) : null
		};

		const url = isAdding ? '/api/channels' : `/api/channels/${editingId}`;
		const method = isAdding ? 'POST' : 'PUT';

		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (res.ok) {
			await fetchChannels();
			cancelForm();
			invalidateAll();
		} else {
			const err = await res.json();
			alert('Error: ' + err.error);
		}
	}

	async function deleteChannel(id: string) {
		if (!confirm('Are you sure you want to delete this channel?')) return;
		
		const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' });
		if (res.ok) {
			await fetchChannels();
			invalidateAll();
		} else {
			const err = await res.json();
			alert('Error deleting: ' + err.error);
		}
	}
</script>

<div class="channels-tab">
	<div class="header-actions">
		<h2>Channels Management</h2>
		{#if !isAdding && !editingId}
			<button class="btn primary" onclick={startAdd}>Add Channel</button>
		{/if}
	</div>

	{#if isAdding || editingId}
		<div class="card form-card">
			<h3>{isAdding ? 'Add New Channel' : 'Edit Channel'}</h3>
			<form onsubmit={saveChannel}>
				<div class="form-row">
					<div class="form-group">
						<label for="id">ID (Slug)</label>
						<input type="text" id="id" bind:value={formData.id} required disabled={!!editingId} />
					</div>
					<div class="form-group">
						<label for="name">Name</label>
						<input type="text" id="name" bind:value={formData.name} required />
					</div>
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="color">Color</label>
						<input type="color" id="color" bind:value={formData.color} required />
					</div>
					<div class="form-group">
						<label for="import_folder">Import Folder</label>
						<input type="text" id="import_folder" bind:value={formData.import_folder} />
					</div>
				</div>
				<div class="form-group">
					<label for="email_keywords">Email Keywords (comma separated)</label>
					<input type="text" id="email_keywords" bind:value={formData.email_keywords as string} />
				</div>
				<div class="form-group checkbox-group">
					<input type="checkbox" id="is_active" bind:checked={formData.is_active} />
					<label for="is_active">Active</label>
				</div>
				<div class="form-actions">
					<button type="button" class="btn secondary" onclick={cancelForm}>Cancel</button>
					<button type="submit" class="btn primary">Save</button>
				</div>
			</form>
		</div>
	{/if}

	{#if !isAdding && !editingId}
		<div class="table-container card">
			<table class="channels-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Folder</th>
						<th>Keywords</th>
						<th>Active</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each channelsList as channel}
						<tr>
							<td>
								<div class="channel-name">
									<span class="color-dot" style:background-color={channel.color}></span>
									{channel.name}
								</div>
							</td>
							<td>{channel.import_folder || '-'}</td>
							<td>
								{#if channel.email_keywords}
									{@const kws = JSON.parse(channel.email_keywords as string)}
									<div class="tags">
										{#each kws as kw}
											<span class="tag">{kw}</span>
										{/each}
									</div>
								{:else}
									-
								{/if}
							</td>
							<td>{channel.is_active ? 'Yes' : 'No'}</td>
							<td>
								<button class="action-btn" onclick={() => startEdit(channel)}>Edit</button>
								<button class="action-btn danger" onclick={() => deleteChannel(channel.id)}>Delete</button>
							</td>
						</tr>
					{/each}
					{#if channelsList.length === 0}
						<tr>
							<td colspan="5" class="empty-state">No channels found.</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.channels-tab {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-actions h2 {
		margin: 0;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: opacity 0.2s;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn.primary {
		background: var(--accent-primary);
		color: white;
	}

	.btn.secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.form-card {
		padding: 1.5rem;
	}

	.form-card h3 {
		margin: 0 0 1.5rem 0;
	}

	.form-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.form-group input[type="text"] {
		padding: 0.6rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.form-group input[type="color"] {
		height: 38px;
		width: 100%;
		cursor: pointer;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
	}

	.checkbox-group {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.table-container {
		overflow-x: auto;
	}

	.channels-table {
		width: 100%;
		border-collapse: collapse;
	}

	.channels-table th, .channels-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border-color);
	}

	.channels-table th {
		font-weight: 600;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.channel-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.color-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		background: var(--bg-secondary);
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		border: 1px solid var(--border-color);
	}

	.action-btn {
		background: transparent;
		border: none;
		color: var(--accent-primary);
		cursor: pointer;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
	}

	.action-btn.danger {
		color: #ef4444;
	}

	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		padding: 2rem !important;
	}
</style>

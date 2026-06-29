<script lang="ts">
	import type { InferSelectModel } from 'drizzle-orm';
	import type { channels } from '$lib/server/db/schema';

	type Channel = InferSelectModel<typeof channels>;

	let { channelsList } = $props<{ channelsList: Channel[] }>();
	
	let selectedChannel = $state<string>('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let file = $state<File | null>(null);
	let uploadStatus = $state<'idle' | 'uploading' | 'success' | 'error'>('idle');
	let statusMessage = $state('');

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			file = target.files[0];
			uploadStatus = 'idle';
			statusMessage = '';
		}
	}

	async function handleUpload(e: Event) {
		e.preventDefault();
		if (!selectedChannel || !file) {
			uploadStatus = 'error';
			statusMessage = 'Please select a channel and a file.';
			return;
		}

		uploadStatus = 'uploading';
		statusMessage = 'Uploading file...';

		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch(`/api/upload/${selectedChannel}`, {
				method: 'POST',
				body: formData
			});

			const data = await res.json();

			if (res.ok) {
				uploadStatus = 'success';
				statusMessage = 'File uploaded successfully! Triggering import...';
				
				// Reset file input
				if (fileInput) fileInput.value = '';
				file = null;

				// Optionally trigger sync pipeline here
				const syncRes = await fetch('/api/sync', { method: 'POST' });
				if (syncRes.ok) {
					statusMessage = 'File uploaded and import pipeline started!';
				} else {
					statusMessage = 'File uploaded, but failed to trigger import pipeline.';
				}
			} else {
				uploadStatus = 'error';
				statusMessage = data.error || 'Upload failed.';
			}
		} catch (err: any) {
			uploadStatus = 'error';
			statusMessage = err.message || 'An unexpected error occurred.';
		}
	}
</script>

<div class="upload-tab">
	<div class="header-actions">
		<h2>Manual File Upload</h2>
	</div>

	<div class="card form-card">
		<form onsubmit={handleUpload}>
			<div class="form-group">
				<label for="channel-select">Select Channel</label>
				<select id="channel-select" bind:value={selectedChannel} required>
					<option value="" disabled>-- Choose a Channel --</option>
					{#each channelsList as channel}
						<option value={channel.id}>{channel.name} ({channel.import_folder})</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="file-upload">Excel Report (.xlsx, .xls)</label>
				<div class="file-input-wrapper">
					<input 
						type="file" 
						id="file-upload" 
						accept=".xlsx, .xls" 
						bind:this={fileInput}
						onchange={handleFileChange}
						required 
					/>
				</div>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn primary" disabled={uploadStatus === 'uploading' || !selectedChannel || !file}>
					{uploadStatus === 'uploading' ? 'Uploading...' : 'Upload & Import'}
				</button>
			</div>

			{#if statusMessage}
				<div class="status-message {uploadStatus}">
					{statusMessage}
				</div>
			{/if}
		</form>
	</div>
</div>

<style>
	.upload-tab {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header-actions h2 {
		margin: 0;
	}

	.form-card {
		padding: 1.5rem;
		max-width: 600px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	select, input[type="file"] {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.95rem;
	}

	select:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	.file-input-wrapper {
		border: 2px dashed var(--border-color);
		border-radius: var(--border-radius);
		padding: 2rem;
		text-align: center;
		background: var(--bg-secondary);
		transition: border-color 0.2s;
	}

	.file-input-wrapper:hover {
		border-color: var(--accent-primary);
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		font-weight: 500;
		cursor: pointer;
		border: none;
		background: var(--accent-primary);
		color: white;
		transition: opacity 0.2s;
		width: 100%;
	}

	.btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.status-message {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: var(--border-radius);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.status-message.success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.status-message.error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.status-message.uploading {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';

	let credentials = $state({
		GMAIL_USER: '',
		GMAIL_APP_PASSWORD: '',
		GOOGLE_SHEET_ID: ''
	});

	let isLoading = $state(true);
	let isSaving = $state(false);
	let statusMessage = $state('');
	let statusType = $state<'success' | 'error'>('success');
	let showPassword = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/settings/credentials');
			if (res.ok) {
				const data = await res.json();
				credentials = {
					GMAIL_USER: data.GMAIL_USER || '',
					GMAIL_APP_PASSWORD: data.GMAIL_APP_PASSWORD || '',
					GOOGLE_SHEET_ID: data.GOOGLE_SHEET_ID || ''
				};
			}
		} catch (e) {
			console.error('Failed to load credentials', e);
		} finally {
			isLoading = false;
		}
	});

	async function saveCredentials(e: Event) {
		e.preventDefault();
		isSaving = true;
		statusMessage = '';

		try {
			const res = await fetch('/api/settings/credentials', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});

			const data = await res.json();
			if (res.ok) {
				statusType = 'success';
				statusMessage = 'Credentials saved securely.';
			} else {
				statusType = 'error';
				statusMessage = data.error || 'Failed to save credentials.';
			}
		} catch (err: any) {
			statusType = 'error';
			statusMessage = err.message || 'An unexpected error occurred.';
		} finally {
			isSaving = false;
			setTimeout(() => {
				statusMessage = '';
			}, 5000);
		}
	}
</script>

<div class="credentials-tab">
	<div class="header-actions">
		<h2>Credentials Configuration</h2>
	</div>

	<div class="card form-card">
		{#if isLoading}
			<p>Loading credentials...</p>
		{:else}
			<form onsubmit={saveCredentials}>
				<div class="form-section">
					<h3>Gmail Integration (For Email Auto-Fetch)</h3>
					<div class="form-group">
						<label for="gmail_user">Gmail Address</label>
						<input
							type="email"
							id="gmail_user"
							bind:value={credentials.GMAIL_USER}
							placeholder="e.g. restaurant@gmail.com"
						/>
					</div>

					<div class="form-group">
						<label for="gmail_password">App Password</label>
						<div class="password-input">
							<input
								type={showPassword ? 'text' : 'password'}
								id="gmail_password"
								bind:value={credentials.GMAIL_APP_PASSWORD}
								placeholder="16-character app password"
							/>
							<button
								type="button"
								class="toggle-visibility"
								onclick={() => (showPassword = !showPassword)}
							>
								{showPassword ? 'Hide' : 'Show'}
							</button>
						</div>
						<small class="help-text"
							>Use a Google App Password, not your main account password.</small
						>
					</div>
				</div>

				<div class="form-section">
					<h3>Google Sheets Integration (For Register Sync)</h3>
					<div class="form-group">
						<label for="gsheet_id">Google Sheet ID</label>
						<input
							type="text"
							id="gsheet_id"
							bind:value={credentials.GOOGLE_SHEET_ID}
							placeholder="The long ID from the Sheet URL"
						/>
						<small class="help-text"
							>Example: 1BxiMVs0XRYFgwn... (found between /d/ and /edit in the URL)</small
						>
					</div>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn primary" disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save Credentials'}
					</button>
				</div>

				{#if statusMessage}
					<div class="status-message {statusType}">
						{statusMessage}
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>

<style>
	.credentials-tab {
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

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.form-section:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}

	.form-section h3 {
		font-size: 1.1rem;
		color: var(--text-primary);
		margin: 0 0 1rem 0;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	input[type='text'],
	input[type='email'],
	input[type='password'] {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.95rem;
		width: 100%;
	}

	input:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	.password-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.toggle-visibility {
		position: absolute;
		right: 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
	}

	.toggle-visibility:hover {
		color: var(--text-primary);
	}

	.help-text {
		font-size: 0.75rem;
		color: var(--text-secondary);
		opacity: 0.8;
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
</style>

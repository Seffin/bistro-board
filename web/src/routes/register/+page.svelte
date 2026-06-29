<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Bistro Board | Register</title>
</svelte:head>

<div class="login-container">
	<div class="login-card register-card">
		<div class="login-header">
			<div class="logo-mark">
				<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
					<rect width="32" height="32" rx="8" fill="var(--accent-primary)" />
					<text
						x="16"
						y="22"
						text-anchor="middle"
						fill="white"
						font-size="18"
						font-weight="700"
						font-family="Inter, sans-serif">B</text
					>
				</svg>
			</div>
			<h1>Create an Account</h1>
			<p class="subtitle">Join Bistro Board to manage your business</p>
		</div>

		{#if form?.error}
			<div class="error-alert">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
					<line
						x1="8"
						y1="5"
						x2="8"
						y2="9"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
					<circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
				</svg>
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<div class="form-group">
				<label for="fullName">Full Name</label>
				<input
					type="text"
					id="fullName"
					name="fullName"
					value={form?.fullName ?? ''}
					placeholder="John Doe"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="username">Username</label>
				<input
					type="text"
					id="username"
					name="username"
					value={form?.username ?? ''}
					placeholder="johndoe"
					autocomplete="username"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					name="email"
					value={form?.email ?? ''}
					placeholder="john@example.com"
					autocomplete="email"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					placeholder="Create a strong password"
					autocomplete="new-password"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="confirmPassword">Confirm Password</label>
				<input
					type="password"
					id="confirmPassword"
					name="confirmPassword"
					placeholder="Confirm your password"
					autocomplete="new-password"
					required
					disabled={loading}
				/>
			</div>

			<button type="submit" class="btn btn-primary login-btn" disabled={loading}>
				{#if loading}
					<span class="spinner"></span>
					Creating account...
				{:else}
					Sign Up
				{/if}
			</button>

			<div class="auth-footer">
				Already have an account? <a href="/login">Sign in</a>
			</div>
		</form>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-secondary);
		padding: 1rem;
	}

	.login-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
		animation: slideUp 0.4s ease-out;
	}

	.register-card {
		max-width: 450px;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.logo-mark {
		display: inline-block;
		margin-bottom: 0.75rem;
	}

	.login-header h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.subtitle {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.error-alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: var(--border-radius);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: #ef4444;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
		animation: shake 0.4s ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-4px);
		}
		40% {
			transform: translateX(4px);
		}
		60% {
			transform: translateX(-2px);
		}
		80% {
			transform: translateX(2px);
		}
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.375rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.875rem;
		outline: none;
		transition: all 0.2s ease;
	}

	.form-group input:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.login-btn {
		width: 100%;
		padding: 0.75rem;
		margin-top: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		gap: 0.5rem;
		transition: all 0.2s ease;
	}

	.login-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	}

	.login-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.login-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.auth-footer {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.auth-footer a {
		color: var(--accent-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.auth-footer a:hover {
		text-decoration: underline;
	}
</style>

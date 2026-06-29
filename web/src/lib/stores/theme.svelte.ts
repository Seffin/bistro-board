import { browser } from '$app/environment';

class ThemeState {
	current = $state<'light' | 'dark'>('light');

	constructor() {
		if (browser) {
			const saved = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			this.current = (saved as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');

			// Watch for changes and sync to document
			$effect.root(() => {
				$effect(() => {
					this.applyTheme(this.current);
				});
			});
		}
	}

	toggle() {
		this.current = this.current === 'light' ? 'dark' : 'light';
	}

	private applyTheme(theme: 'light' | 'dark') {
		if (browser) {
			localStorage.setItem('theme', theme);
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}
}

export const themeState = new ThemeState();

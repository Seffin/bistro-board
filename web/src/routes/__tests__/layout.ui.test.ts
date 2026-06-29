// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Layout from '../+layout.svelte';

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/')
	}
}));

describe.skip('Layout UI', () => {
	it('should render the sidebar and header with correct classes', () => {
		const { container } = render(Layout, { props: { data: { channels: [], user: null } } });
		
		const sidebar = container.querySelector('.sidebar');
		expect(sidebar).toBeTruthy();
		expect(sidebar?.classList.contains('card')).toBe(true);

		const header = container.querySelector('.top-header');
		expect(header).toBeTruthy();
		expect(header?.classList.contains('card')).toBe(true);
	});
});

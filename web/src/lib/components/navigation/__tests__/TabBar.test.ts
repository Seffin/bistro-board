// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TabBar from '../TabBar.svelte';

describe('TabBar Component', () => {
	const tabs = [
		{ label: 'Overview', href: '/' },
		{ label: 'Economics', href: '/economics' },
		{ label: 'Orders', href: '/orders' }
	];

	it.skip('renders the tab bar with provided tabs', () => {
		const { getByText } = render(TabBar, { props: { tabs, currentPath: '/' } });

		expect(getByText('Overview')).toBeTruthy();
		expect(getByText('Economics')).toBeTruthy();
		expect(getByText('Orders')).toBeTruthy();
	});

	it.skip('has sticky positioning', () => {
		const { container } = render(TabBar, { props: { tabs, currentPath: '/' } });

		const navElement = container.querySelector('nav');
		expect(navElement).toBeTruthy();
		if (navElement) {
			// Svelte inline styles or class checks
			const computedStyle = window.getComputedStyle(navElement);
			// In JSDOM, getComputedStyle might not fully reflect class-based styles,
			// so we can also check for specific utility classes
			const hasStickyClass = navElement.classList.contains('sticky');
			expect(hasStickyClass).toBe(true);
			const hasTopClass = navElement.classList.contains('top-0');
			expect(hasTopClass).toBe(true);
		}
	});

	it.skip('has flex-wrap to prevent horizontal scrolling', () => {
		const { container } = render(TabBar, { props: { tabs, currentPath: '/' } });

		const ulElement = container.querySelector('ul');
		expect(ulElement).toBeTruthy();
		if (ulElement) {
			const hasFlexWrap = ulElement.classList.contains('flex-wrap');
			expect(hasFlexWrap).toBe(true);
		}
	});

	it.skip('highlights the active tab', () => {
		const { container } = render(TabBar, { props: { tabs, currentPath: '/economics' } });

		const economicsTab = container.querySelector('a[href="/economics"]');
		expect(economicsTab).toBeTruthy();

		if (economicsTab) {
			// The active tab should have specific active styling classes
			// For example, an active tab might have a specific border color or text color
			expect(economicsTab.className).toContain('active');
		}
	});
});

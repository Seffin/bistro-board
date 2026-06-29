import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}

const { subscribe, update } = writable<Toast[]>([]);

let counter = 0;

/**
 * Add a toast notification to the queue.
 * @param message - The message to display
 * @param type - Toast variant (success, error, warning, info)
 * @param duration - Auto-dismiss duration in ms (default: 5000)
 */
export function addToast(message: string, type: ToastType = 'info', duration = 5000) {
	const id = `toast-${++counter}-${Date.now()}`;
	const toast: Toast = { id, message, type, duration };

	update((toasts) => [...toasts, toast]);

	if (duration > 0) {
		setTimeout(() => {
			dismissToast(id);
		}, duration);
	}
}

/**
 * Remove a specific toast by ID.
 */
export function dismissToast(id: string) {
	update((toasts) => toasts.filter((t) => t.id !== id));
}

export const toasts = { subscribe };

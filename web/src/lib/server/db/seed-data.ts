import type { InferInsertModel } from 'drizzle-orm';
import { channels } from './schema';

export type ChannelInsert = InferInsertModel<typeof channels>;

/**
 * Default channel definitions for Bistro Board.
 * These match the existing sales_reports/ folder structure and
 * the channel values stored in the orders table.
 */
export const DEFAULT_CHANNELS: ChannelInsert[] = [
	{
		id: 'counter',
		name: 'Counter',
		color: '#10b981',
		import_folder: 'sales_reports/counter',
		email_keywords: JSON.stringify(['Counter', 'POS', 'Philos-KKND']),
		is_active: true
	},
	{
		id: 'swiggy',
		name: 'Swiggy',
		color: '#f97316',
		import_folder: 'sales_reports/swiggy',
		email_keywords: JSON.stringify(['Annexure', 'Settlement', 'Swiggy Payments']),
		is_active: true
	},
	{
		id: 'zomato',
		name: 'Zomato',
		color: '#ef4444',
		import_folder: 'sales_reports/zomato',
		email_keywords: JSON.stringify(['Zomato']),
		is_active: true
	}
];

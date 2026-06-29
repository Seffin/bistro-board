import { db } from '$lib/server/db';
import { income_register } from '$lib/server/db/schema';
import { desc, between } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export const load = async ({ url }: { url: URL }) => {
	const { start, end } = parseDateRange(url);

	// Fetch the most recent 50 ledger entries
	const ledger =
		start && end
			? await db
					.select()
					.from(income_register)
					.where(between(income_register.date, start, end))
					.orderBy(desc(income_register.date))
					.limit(50)
			: await db.select().from(income_register).orderBy(desc(income_register.date)).limit(50);

	return {
		ledger,
		dateRange: { start: start || '', end: end || '' }
	};
};

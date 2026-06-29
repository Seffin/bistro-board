import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { getAllChannels } from '$lib/server/config';
import { between } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export interface ChannelEconomics {
	channel_id: string;
	channel_name: string;
	total_gross: number;
	total_commission: number;
	total_other_charges: number;
	total_net_payout: number;
	order_count: number;
	commission_rate: number;
	payout_ratio: number;
	leakage_rate: number;
}

export interface EconomicsData {
	channels: ChannelEconomics[];
	date_range: {
		start: string;
		end: string;
	};
	summary: {
		total_gross: number;
		total_commission: number;
		total_other_charges: number;
		total_net_payout: number;
		average_commission_rate: number;
		average_leakage_rate: number;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ economics: EconomicsData }> => {
	const { start, end } = parseDateRange(url);

	// Fetch all active channels
	const activeChannels = await getAllChannels();

	// Create a map of channel ID to channel info
	const channelMap = new Map(activeChannels.map((c) => [c.name.toLowerCase(), c]));

	// Fetch orders with optional date filtering
	const allOrders =
		start && end
			? await db
					.select()
					.from(orders)
					.where(between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`)))
			: await db.select().from(orders);

	// Aggregate by channel
	const channelStats: Record<
		string,
		{
			total_gross: number;
			total_commission: number;
			total_other_charges: number;
			total_net_payout: number;
			order_count: number;
		}
	> = {};

	let globalTotalGross = 0;
	let globalTotalCommission = 0;
	let globalTotalOtherCharges = 0;
	let globalTotalNetPayout = 0;

	for (const order of allOrders) {
		// Skip cancelled/failed orders
		const status = (order.status || '').toLowerCase();
		if (status === 'cancelled' || status === 'failed') {
			continue;
		}

		const channelKey = (order.channel || '').toLowerCase();
		const gross = order.grand_total || 0;
		const commission = order.commission || 0;
		const otherCharges = order.other_charges || 0;
		const netPayout = order.net_payout || 0;

		if (!channelStats[channelKey]) {
			channelStats[channelKey] = {
				total_gross: 0,
				total_commission: 0,
				total_other_charges: 0,
				total_net_payout: 0,
				order_count: 0
			};
		}

		channelStats[channelKey].total_gross += gross;
		channelStats[channelKey].total_commission += commission;
		channelStats[channelKey].total_other_charges += otherCharges;
		channelStats[channelKey].total_net_payout += netPayout;
		channelStats[channelKey].order_count += 1;

		globalTotalGross += gross;
		globalTotalCommission += commission;
		globalTotalOtherCharges += otherCharges;
		globalTotalNetPayout += netPayout;
	}

	// Convert to array and calculate rates
	const economicsChannels: ChannelEconomics[] = Object.entries(channelStats).map(([channelKey, stats]) => {
		const channel = channelMap.get(channelKey);
		const commissionRate = stats.total_gross > 0 ? (stats.total_commission / stats.total_gross) * 100 : 0;
		const payoutRatio = stats.total_gross > 0 ? (stats.total_net_payout / stats.total_gross) * 100 : 0;
		const leakageRate = stats.total_gross > 0 ? ((stats.total_commission + stats.total_other_charges) / stats.total_gross) * 100 : 0;

		return {
			channel_id: channel?.id || channelKey,
			channel_name: channel?.name || channelKey.charAt(0).toUpperCase() + channelKey.slice(1),
			total_gross: stats.total_gross,
			total_commission: stats.total_commission,
			total_other_charges: stats.total_other_charges,
			total_net_payout: stats.total_net_payout,
			order_count: stats.order_count,
			commission_rate: commissionRate,
			payout_ratio: payoutRatio,
			leakage_rate: leakageRate
		};
	});

	// Sort by commission rate (ascending - lower is better)
	economicsChannels.sort((a, b) => a.commission_rate - b.commission_rate);

	// Calculate summary
	const avgCommissionRate =
		globalTotalGross > 0 ? (globalTotalCommission / globalTotalGross) * 100 : 0;
	const avgLeakageRate =
		globalTotalGross > 0 ? ((globalTotalCommission + globalTotalOtherCharges) / globalTotalGross) * 100 : 0;

	return {
		economics: {
			channels: economicsChannels,
			date_range: {
				start: start || '',
				end: end || ''
			},
			summary: {
				total_gross: globalTotalGross,
				total_commission: globalTotalCommission,
				total_other_charges: globalTotalOtherCharges,
				total_net_payout: globalTotalNetPayout,
				average_commission_rate: avgCommissionRate,
				average_leakage_rate: avgLeakageRate
			}
		}
	};
};

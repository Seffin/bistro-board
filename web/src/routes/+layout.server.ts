import { getAllChannels } from '$lib/server/config';

export const load = async () => {
	const channels = await getAllChannels();

	return {
		channels
	};
};

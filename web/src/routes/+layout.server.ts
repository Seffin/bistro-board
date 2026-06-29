import { getAllChannels } from '$lib/server/config';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async (event) => {
	const locals = event?.locals || {};
	const channels = await getAllChannels();
	let userDetails = null;

	if (locals.user?.username) {
		const result = await db.select().from(users).where(eq(users.username, locals.user.username));
		if (result.length > 0) {
			userDetails = {
				username: result[0].username,
				fullName: result[0].full_name,
				email: result[0].email
			};
		}
	}

	return {
		channels,
		user: userDetails
	};
};

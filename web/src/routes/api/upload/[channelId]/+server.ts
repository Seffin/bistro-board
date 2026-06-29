import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { channels } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

export const POST: RequestHandler = async ({ params, request }) => {
	const channelId = params.channelId;

	try {
		const channel = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
		if (channel.length === 0) {
			return json({ error: 'Channel not found' }, { status: 404 });
		}

		const channelData = channel[0];
		if (!channelData.import_folder) {
			return json({ error: 'Channel has no import folder configured' }, { status: 400 });
		}

		const data = await request.formData();
		const file = data.get('file') as File;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
			return json(
				{ error: 'Invalid file type. Only .xlsx and .xls are supported' },
				{ status: 400 }
			);
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Navigate up from web/src/routes/api/upload/... to project root where sales_reports is
		// process.cwd() should be bistro-board/web if run from there, but we should be robust
		const projectRoot = path.resolve(process.cwd(), '..');
		// Wait, if running `npm run dev` in `web/`, cwd is `web/`.
		// Let's assume the root is one level above `process.cwd()`
		const targetDir = path.join(projectRoot, channelData.import_folder);

		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		const targetPath = path.join(targetDir, file.name);
		fs.writeFileSync(targetPath, buffer);

		return json({ success: true, message: 'File uploaded successfully', path: targetPath });
	} catch (error: any) {
		return json({ error: error.message }, { status: 500 });
	}
};

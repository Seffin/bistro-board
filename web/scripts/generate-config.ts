import { db } from '../src/lib/server/db/index.js';
import { channels, app_settings } from '../src/lib/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const configPath = path.join(projectRoot, 'settings.json');

async function generateConfig() {
	try {
		console.log('Fetching channels and settings from database...');
		
		const allChannels = await db.select().from(channels).where(eq(channels.is_active, true));
		
		const CREDENTIAL_KEYS = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'GOOGLE_SHEET_ID'];
		const settingsRecords = await db.select().from(app_settings).where(inArray(app_settings.key, CREDENTIAL_KEYS));
		
		const credentials: Record<string, string> = {};
		for (const setting of settingsRecords) {
			credentials[setting.key] = setting.value;
		}

		// Format channels for Python config
		const channelsConfig = allChannels.map(c => ({
			id: c.id,
			name: c.name,
			color: c.color,
			import_folder: c.import_folder,
			email_keywords: c.email_keywords ? JSON.parse(c.email_keywords as string) : []
		}));

		const config = {
			credentials,
			channels: channelsConfig
		};

		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(`Successfully wrote config to ${configPath}`);
		
		process.exit(0);
	} catch (error) {
		console.error('Failed to generate config:', error);
		process.exit(1);
	}
}

generateConfig();

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { invalidateAll } from '$lib/server/cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');
const webRoot = path.resolve(__dirname, '../../../../');

export const POST = async () => {
	const stream = new ReadableStream({
		async start(controller) {
			const sendLog = (msg: string) => {
				const chunk = `data: ${JSON.stringify({ message: msg })}\n\n`;
				controller.enqueue(new TextEncoder().encode(chunk));
			};

			const runCommand = (command: string, args: string[], cwd: string): Promise<void> => {
				return new Promise((resolve, reject) => {
					sendLog(`> Running: ${command} ${args.join(' ')}`);

					const child = spawn(command, args, { cwd, shell: true });

					child.stdout.on('data', (data) => {
						const lines = data
							.toString()
							.split('\n')
							.filter((l: string) => l.trim() !== '');
						lines.forEach((line: string) => sendLog(line));
					});

					child.stderr.on('data', (data) => {
						const lines = data
							.toString()
							.split('\n')
							.filter((l: string) => l.trim() !== '');
						lines.forEach((line: string) => sendLog(`ERROR: ${line}`));
					});

					child.on('close', (code) => {
						if (code === 0) {
							resolve();
						} else {
							reject(new Error(`Command failed with exit code ${code}`));
						}
					});

					child.on('error', (err) => {
						reject(err);
					});
				});
			};

			try {
				sendLog('Starting End-to-End Sync Pipeline...');

				// 1. Generate Config
				sendLog('Step 1: Generating settings.json from database config...');
				// Use npx tsx scripts/generate-config.ts inside web root
				await runCommand('npx', ['tsx', 'scripts/generate-config.ts'], webRoot);

				// 2. Fetch Emails
				sendLog('Step 2: Fetching emails (fetch_emails.py)...');
				await runCommand('python', ['fetch_emails.py'], projectRoot);

				// 3. Download Sheet
				sendLog('Step 3: Downloading business register (download_sheet.py)...');
				await runCommand('python', ['download_sheet.py'], projectRoot);

				// 4. Import Sales
				sendLog('Step 4: Importing sales data (import_sales.py)...');
				await runCommand('python', ['import_sales.py'], projectRoot);

				// 5. Import Register
				sendLog('Step 5: Importing register data (import_register.py)...');
				await runCommand('python', ['import_register.py'], projectRoot);

				sendLog('Sync Pipeline Completed Successfully!');

				// Invalidate all caches so next page load gets fresh data
				invalidateAll();
				sendLog('Cache invalidated.');

				// Send a special termination event
				const endChunk = `data: ${JSON.stringify({ done: true })}\n\n`;
				controller.enqueue(new TextEncoder().encode(endChunk));

				controller.close();
			} catch (error: any) {
				sendLog(`SYNC PIPELINE FAILED: ${error.message}`);
				const errorChunk = `data: ${JSON.stringify({ error: error.message })}\n\n`;
				controller.enqueue(new TextEncoder().encode(errorChunk));
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};

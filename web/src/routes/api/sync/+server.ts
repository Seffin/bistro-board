import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { invalidateAll } from '$lib/server/cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');
const webRoot = path.resolve(__dirname, '../../../../');

/**
 * Detect the available Python binary on the system.
 * Windows often has 'py' (Python launcher) or 'python', while Unix uses 'python3'.
 * Exit code 9009 on Windows means the command was not found in PATH.
 */
async function detectPythonBinary(): Promise<string> {
	const candidates = process.platform === 'win32'
		? ['py', 'python', 'python3']
		: ['python3', 'python'];

	for (const cmd of candidates) {
		try {
			const result = await new Promise<boolean>((resolve) => {
				const child = spawn(cmd, ['--version'], { shell: true, stdio: 'pipe' });
				child.on('close', (code) => resolve(code === 0));
				child.on('error', () => resolve(false));
				// Timeout after 3 seconds
				setTimeout(() => { child.kill(); resolve(false); }, 3000);
			});
			if (result) return cmd;
		} catch {
			continue;
		}
	}

	throw new Error(
		'Python not found. Please install Python and ensure it is in your system PATH. ' +
		'On Windows, try installing from python.org and check "Add to PATH" during installation.'
	);
}

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
						} else if (code === 9009) {
							reject(new Error(
								`Command '${command}' not found (exit code 9009). ` +
								`Ensure ${command} is installed and in your system PATH.`
							));
						} else {
							reject(new Error(`Command failed with exit code ${code}`));
						}
					});

					child.on('error', (err) => {
						reject(new Error(`Failed to start '${command}': ${err.message}`));
					});
				});
			};

			try {
				sendLog('Starting End-to-End Sync Pipeline...');

				// 0. Detect Python binary
				sendLog('Step 0: Detecting Python installation...');
				let pythonCmd: string;
				try {
					pythonCmd = await detectPythonBinary();
					sendLog(`Found Python: ${pythonCmd}`);
				} catch (err: any) {
					sendLog(`PYTHON NOT FOUND: ${err.message}`);
					const errorChunk = `data: ${JSON.stringify({ error: err.message })}\n\n`;
					controller.enqueue(new TextEncoder().encode(errorChunk));
					controller.close();
					return;
				}

				// 1. Generate Config
				sendLog('Step 1: Generating settings.json from database config...');
				try {
					await runCommand('npx', ['tsx', 'scripts/generate-config.ts'], webRoot);
				} catch (err: any) {
					sendLog(`Config generation failed: ${err.message}. Continuing with existing settings.json...`);
				}

				// 2. Fetch Emails
				sendLog('Step 2: Fetching emails (fetch_emails.py)...');
				await runCommand(pythonCmd, ['fetch_emails.py'], projectRoot);

				// 3. Download Sheet
				sendLog('Step 3: Downloading business register (download_sheet.py)...');
				await runCommand(pythonCmd, ['download_sheet.py'], projectRoot);

				// 4. Import Sales
				sendLog('Step 4: Importing sales data (import_sales.py)...');
				await runCommand(pythonCmd, ['import_sales.py'], projectRoot);

				// 5. Import Register
				sendLog('Step 5: Importing register data (import_register.py)...');
				await runCommand(pythonCmd, ['import_register.py'], projectRoot);

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

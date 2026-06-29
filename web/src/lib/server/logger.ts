import pino from 'pino';

/**
 * Structured logger for Bistro Board.
 * Uses pino for fast, JSON-based logging.
 * Log level is configurable via LOG_LEVEL env var.
 */
export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	transport:
		process.env.NODE_ENV !== 'production'
			? {
					target: 'pino/file',
					options: { destination: 1 } // stdout
				}
			: undefined,
	formatters: {
		level(label) {
			return { level: label };
		}
	},
	timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;

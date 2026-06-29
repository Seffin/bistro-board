/**
 * CSV generation utility.
 * Converts an array of row objects into a CSV string.
 */

/**
 * Escape a cell value for CSV format.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
function escapeCSV(value: unknown): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Generate a CSV string from headers and rows.
 *
 * @param headers - Array of column headers
 * @param rows - Array of row objects or arrays
 * @returns CSV string with BOM for Excel compatibility
 */
export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
	const BOM = '\uFEFF'; // UTF-8 BOM for Excel
	const headerLine = headers.map(escapeCSV).join(',');

	const dataLines = rows.map((row) => {
		return headers
			.map((header) => {
				const value = row[header];
				// Format dates nicely
				if (value instanceof Date) {
					return escapeCSV(value.toISOString().split('T')[0]);
				}
				return escapeCSV(value);
			})
			.join(',');
	});

	return BOM + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Create a Response object for CSV download.
 */
export function csvResponse(csv: string, filename: string): Response {
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-cache'
		}
	});
}

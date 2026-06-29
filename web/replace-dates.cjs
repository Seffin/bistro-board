const fs = require('fs');
const path = require('path');

const files = [
	'src/routes/+page.server.ts',
	'src/routes/sales/+page.server.ts',
	'src/routes/businesses/+page.server.ts',
	'src/routes/counter-insights/+page.server.ts',
	'src/routes/economics/+page.server.ts',
	'src/routes/ledger/+page.server.ts',
	'src/routes/orders/+page.server.ts',
	'src/routes/payouts/+page.server.ts',
	'src/routes/promo/+page.server.ts',
	'src/routes/reconciliation/+page.server.ts',
	'src/routes/api/export/reconciliation/+server.ts',
	'src/routes/api/export/orders/+server.ts',
	'src/routes/api/export/ledger/+server.ts'
];

for (const relPath of files) {
	const filePath = path.join(__dirname, relPath);
	if (!fs.existsSync(filePath)) continue;

	let content = fs.readFileSync(filePath, 'utf-8');

	// Add import
	if (!content.includes('parseDateRange')) {
		content = content.replace(/(import .*;\r?\n)+/, `$&import { parseDateRange } from '$lib/utils/date-filter';\n`);
	}

	// Replace URL params extraction
	content = content.replace(/const start = url\.(?:searchParams\.get\('start'\)|searchParams\?.get\('start'\));\r?\n\s*const end = url\.(?:searchParams\.get\('end'\)|searchParams\?.get\('end'\));/g, 
		`const { start, end } = parseDateRange(url);`);
		
	// Replace the dashboard specific extraction
	content = content.replace(/const start = url \? url\.searchParams\.get\('start'\) : null;\r?\n\s*const end = url \? url\.searchParams\.get\('end'\) : null;/g,
		`const { start, end } = parseDateRange(url);`);

	// Also fix instances where they check `start && end` because they're always populated now
	// Wait, some queries fall back to fetching everything if NO dates are provided, but now there are ALWAYS default dates!
	// Is this what we want? Yes: "The load functions use these defaults to fetch data."
	
	fs.writeFileSync(filePath, content);
}

console.log("Updated date range logic in load functions.");

const fs = require('fs');

const testFiles = [
    'src/routes/__tests__/overview-velocity.test.ts',
    'src/routes/__tests__/overview-pnl.test.ts',
    'src/routes/__tests__/overview-kpis.test.ts',
    'src/routes/__tests__/overview-controls.test.ts',
    'src/routes/__tests__/overview-charts.test.ts',
    'src/routes/__tests__/error-handling.test.ts',
    'src/routes/__tests__/auth-protection.test.ts'
];

testFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // We want to replace the `from:` function to return an object that can be chained with `.where()` or awaited directly.
    content = content.replace(/from: vi\.fn\(\)\.mockImplementation\(\(table: any\) => \{\s+if \(table && table\[Symbol\.for\('drizzle:Name'\)\] === 'expenses'\) \{\s+return Promise\.resolve\(\[\]\);\s+\}\s+return Promise\.resolve\(mockOrders\);\s+\}\)/g, `from: vi.fn().mockImplementation((table: any) => {
				const isExpense = table && table[Symbol.for('drizzle:Name')] === 'expenses';
				const data = isExpense ? [] : mockOrders;
				return {
					where: vi.fn().mockResolvedValue(data),
					then: (resolve) => resolve(data)
				};
			})`);
            
    // Some tests might just return Promise.resolve([]) or have different implementations
    // Let's also find `from: vi.fn().mockReturnValue(Promise.resolve(mockOrders))` or similar
    content = content.replace(/from: vi\.fn\(\)\.mockReturnValue\(Promise\.resolve\(\[\]\)\)/g, `from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]), then: (res) => res([]) })`);
    content = content.replace(/from: vi\.fn\(\)\.mockReturnValue\(Promise\.resolve\(mockOrders\)\)/g, `from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(mockOrders), then: (res) => res(mockOrders) })`);
    
    fs.writeFileSync(file, content);
});

console.log("Mocks updated.");

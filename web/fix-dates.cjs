const fs = require('fs');

const testFiles = [
    'src/routes/__tests__/overview-velocity.test.ts',
    'src/routes/__tests__/overview-pnl.test.ts',
    'src/routes/__tests__/overview-kpis.test.ts',
    'src/routes/__tests__/overview-charts.test.ts'
];

testFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace all new Date('2026-...') with new Date('2026-06-15...')
    content = content.replace(/new Date\('2026-\d{2}-\d{2}T/g, "new Date('2026-06-15T");
    
    fs.writeFileSync(file, content);
});

console.log("Dates updated.");

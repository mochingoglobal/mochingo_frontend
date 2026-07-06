import fs from 'fs';

const filePath = 'd:/dynleaf-mmp/mochingo_frontend/src/components/qr-builder/useBuilderState.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add use client
content = "'use client';\n" + content;

// 2. Fix imports
content = content.replace(
    "import { createStyledQRCodeCanvas, buildIdValue, formatIdLabel } from '@/lib/qrCodeGenerator';",
    "import { createStyledQRCodeCanvas } from '@/lib/qrCodeGenerator';"
);

// 3. Fix usages inside exportBulkPDF
content = content.replace(
    /const idValue = buildIdValue\(idPrefix, currentNum\);/g,
    "const idValue = `${idPrefix}-${currentNum}`;"
);
content = content.replace(
    /const idLabel = formatIdLabel\(idValue\)\.toUpperCase\(\);/g,
    "const idLabel = `#${currentNum}`;"
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed useBuilderState.ts');

import fs from 'fs';
import path from 'path';

const dir = 'd:/dynleaf-mmp/mochingo_frontend/src/components/qr-builder';
const files = fs.readdirSync(dir);

for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    let modified = false;
    
    // Add use client
    if (!content.startsWith("'use client';") && !content.startsWith('"use client";')) {
        content = "'use client';\n" + content;
        modified = true;
    }
    
    // Replace react-router-dom with next/navigation (simple replacements if applicable)
    // Actually, none of the components in qr-builder seem to use react-router-dom directly except maybe useBuilderState or similar, but wait, the page uses it. Let's replace any if they exist.
    if (content.includes("from 'react-router-dom'")) {
        content = content.replace(/from\s+['"]react-router-dom['"]/g, "from 'next/navigation'");
        modified = true;
    }
    
    // replace any relative imports of UI components if they are missing or different
    // Wait, BuilderCanvas imports @/components/ui/... which might not exist in mochingo_frontend.
    // Let me check if lucide-react is used, it is installed.

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Fixed:', file);
    }
}

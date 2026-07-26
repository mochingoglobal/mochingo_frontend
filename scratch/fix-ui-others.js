const fs = require('fs');
const files = [
  'src/app/portal-x/qr-management/dynamic/[id]/page.tsx',
  'src/app/portal-x/qr-management/page.tsx',
  'src/app/portal-x/qr-category/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');

    c = c.replace(/className="card /g, 'className="card bg-[#161b27] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20 ');
    c = c.replace(/className="card"/g, 'className="card bg-[#161b27] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20"');
    c = c.replace(/className="btn btn-primary(.*?)"/g, 'className="btn btn-primary$1 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/20"');
    c = c.replace(/className="btn btn-outline(.*?)"/g, 'className="btn btn-outline$1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200"');
    c = c.replace(/className="input /g, 'className="input bg-[#0f172a] border border-[#1e293b] text-slate-200 ');
    c = c.replace(/className="input"/g, 'className="input bg-[#0f172a] border border-[#1e293b] text-slate-200"');

    fs.writeFileSync(file, c);
    console.log('UI enhanced for', file);
  }
}

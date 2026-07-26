const fs = require('fs');
const file = 'src/app/portal-x/qr-management/dynamic/batch/[batchId]/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/className="card /g, 'className="card bg-[#161b27] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20 ');
c = c.replace(/border-indigo-200 bg-indigo-50\/30/g, '');
c = c.replace(/bg-indigo-500\/5/g, '');
c = c.replace(/className="btn btn-primary(.*?)"/g, 'className="btn btn-primary$1 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/20"');
c = c.replace(/className="btn btn-outline(.*?)"/g, 'className="btn btn-outline$1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200"');
c = c.replace(/className="input /g, 'className="input bg-[#0f172a] border border-[#1e293b] text-slate-200 ');
c = c.replace(/className="input"/g, 'className="input bg-[#0f172a] border border-[#1e293b] text-slate-200"');

fs.writeFileSync(file, c);
console.log('UI enhanced');

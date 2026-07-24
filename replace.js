const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'app', 'sys');

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // We want to replace frontend navigation to /admin with /sys
            // Examples: href="/admin/login", router.push('/admin/qr-management'), pathname === '/admin/login'
            // But NOT api.post('/admin/qr')
            
            // Replace strings starting with '/admin or "/admin
            // We will use regex to find instances where it's not preceded by api method or backtick
            // Or simpler: replace all `/admin` with `/sys` EXCEPT if it's part of an api call.
            
            // To be safe, we'll replace known frontend paths:
            const targets = [
                { from: "'/admin/login'", to: "'/sys/login'" },
                { from: '"/admin/login"', to: '"/sys/login"' },
                { from: "'/admin/qr-management'", to: "'/sys/qr-management'" },
                { from: '"/admin/qr-management"', to: '"/sys/qr-management"' },
                { from: "'/admin/qr-management", to: "'/sys/qr-management" }, // for dynamic routes
                { from: '"/admin/qr-management', to: '"/sys/qr-management' },
                { from: '`/admin/qr-management', to: '`/sys/qr-management' },
                { from: "'/admin/qr-category'", to: "'/sys/qr-category'" },
                { from: '"/admin/qr-category"', to: '"/sys/qr-category"' },
                { from: "'/admin/users'", to: "'/sys/users'" },
                { from: '"/admin/users"', to: '"/sys/users"' },
                { from: "`/admin/users", to: "`/sys/users" }
            ];

            let modified = false;
            targets.forEach(target => {
                if (content.includes(target.from)) {
                    content = content.replaceAll(target.from, target.to);
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    });
}

walkDir(directoryPath);
console.log('Done.');

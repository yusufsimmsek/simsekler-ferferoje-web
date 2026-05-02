const fs = require('fs');
const path = require('path');

const urlMap = [
    { old: '/about-us', new: '/hakkimizda' },
    { old: '/contact-us', new: '/iletisim' },
    { old: '/services', new: '/hizmetler' },
    { old: '/projects', new: '/projeler' },
    { old: '/faq', new: '/sss' },
    { old: '/home-1', new: '/' }
];

function processHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === '.gemini') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processHtmlFiles(fullPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            for (const map of urlMap) {
                // Match href="/old" or href="/old/..."
                const regex = new RegExp(`href="${map.old}(/|")`, 'g');
                content = content.replace(regex, `href="${map.new}$1`);
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated nested links in: ${fullPath}`);
            }
        }
    }
}

processHtmlFiles(__dirname);
console.log('All nested links updated successfully.');

const fs = require('fs');
const path = require('path');

// Folder renaming mappings (old -> new)
const rootFolders = {
    'about-us': 'hakkimizda',
    'contact-us': 'iletisim',
    'services': 'hizmetler',
    'projects': 'projeler',
    'faq': 'sss'
};

const subFolders = {
    'sheet-metal-work': 'ferforje',
    'architectural-elements': 'celik-konstruksiyon',
    'machinery-components': 'kapi-uretimleri',
    'industrial-metalwork': 'ozel-tasarim',
    'metal-forming': 'boardex-uygulamalari',
    'welding-and-repairs': 'korkuluk-balkon'
};

// Safely rename root folders
for (const [oldName, newName] of Object.entries(rootFolders)) {
    if (fs.existsSync(oldName)) {
        if (fs.existsSync(newName)) {
            fs.rmSync(newName, { recursive: true, force: true });
        }
        fs.renameSync(oldName, newName);
        console.log(`Renamed folder ${oldName} to ${newName}`);
    }
}

// Safely rename subfolders in hizmetler
if (fs.existsSync('hizmetler')) {
    for (const [oldName, newName] of Object.entries(subFolders)) {
        const oldPath = path.join('hizmetler', oldName);
        const newPath = path.join('hizmetler', newName);
        if (fs.existsSync(oldPath)) {
            if (fs.existsSync(newPath)) {
                fs.rmSync(newPath, { recursive: true, force: true });
            }
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed subfolder ${oldName} to ${newName}`);
        }
    }
}

// URL Mapping for HTML replacements
const urlMap = [
    { old: '/services/sheet-metal-work', new: '/hizmetler/ferforje' },
    { old: '/services/architectural-elements', new: '/hizmetler/celik-konstruksiyon' },
    { old: '/services/machinery-components', new: '/hizmetler/kapi-uretimleri' },
    { old: '/services/industrial-metalwork', new: '/hizmetler/ozel-tasarim' },
    { old: '/services/metal-forming', new: '/hizmetler/boardex-uygulamalari' },
    { old: '/services/welding-and-repairs', new: '/hizmetler/korkuluk-balkon' },
    { old: '/about-us', new: '/hakkimizda' },
    { old: '/contact-us', new: '/iletisim' },
    { old: '/services', new: '/hizmetler' },
    { old: '/projects', new: '/projeler' },
    { old: '/faq', new: '/sss' },
    { old: '/home-1', new: '/' }
];

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.git') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(dirPath);
        }
    });
}

walkDir('.', function(filePath) {
    if (filePath.endsWith('.html')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        for (const map of urlMap) {
            const regexExact = new RegExp(`href="${map.old}/?"`, 'g');
            content = content.replace(regexExact, `href="${map.new}"`);
        }

        // Phone fix
        content = content.replace(/tel:\+3000002233/g, 'tel:+905323595349');

        // Social link fix
        let socialRegex = /<a[^>]*class="[^"]*social-link[^"]*"[^>]*>/g;
        content = content.replace(socialRegex, (match) => {
            let newMatch = match.replace(/href="[^"]*"/, 'href="https://instagram.com/simseklerferforje"');
            if (!newMatch.includes('target="_blank"')) {
                newMatch = newMatch.replace('>', ' target="_blank">');
            }
            return newMatch;
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated links in: ' + filePath);
        }
    }
});
console.log("Refactoring complete.");

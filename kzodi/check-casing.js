const fs = require('fs');
const path = require('path');

function checkFile(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkFile(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                const match = line.match(/from\s+['"](\.[^'"]+)['"]/);
                if (match) {
                    const importPath = match[1];
                    // check if path exists exactly
                    let resolved = '';
                    if (importPath.endsWith('.tsx') || importPath.endsWith('.ts')) {
                         resolved = path.resolve(dir, importPath);
                    } else {
                         // try adding .ts, .tsx, /index.ts, /index.tsx
                         const base = path.resolve(dir, importPath);
                         if (fs.existsSync(base + '.ts')) resolved = base + '.ts';
                         else if (fs.existsSync(base + '.tsx')) resolved = base + '.tsx';
                         else if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
                             if (fs.existsSync(path.join(base, 'index.ts'))) resolved = path.join(base, 'index.ts');
                             else if (fs.existsSync(path.join(base, 'index.tsx'))) resolved = path.join(base, 'index.tsx');
                         }
                    }

                    if (resolved) {
                        // Check if the actual filesystem casing matches the resolved path
                        const dirOfResolved = path.dirname(resolved);
                        const baseOfResolved = path.basename(resolved);
                        const actualFiles = fs.readdirSync(dirOfResolved);
                        
                        if (!actualFiles.includes(baseOfResolved)) {
                            console.error(`CASE MISMATCH in ${fullPath}:${i+1} -> imported '${importPath}', but actual file is likely cased differently in folder ${dirOfResolved}`);
                        }
                    } else if (fs.existsSync(path.resolve(dir, importPath))) {
                        // could be css, json, etc
                        const resolvedOther = path.resolve(dir, importPath);
                        const dirOfResolved = path.dirname(resolvedOther);
                        const baseOfResolved = path.basename(resolvedOther);
                        const actualFiles = fs.readdirSync(dirOfResolved);
                        if (!actualFiles.includes(baseOfResolved)) {
                            console.error(`CASE MISMATCH in ${fullPath}:${i+1} -> imported '${importPath}', but actual file is likely cased differently in folder ${dirOfResolved}`);
                        }
                    }
                }
            });
        }
    });
}

const srcDir = path.join(process.cwd(), 'src');
console.log("Checking case sensitivity in: " + srcDir);
checkFile(srcDir);
console.log("Check complete.");

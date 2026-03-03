import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');

const envPath = process.env.PATH ? `C:\\Users\\Administrator\\AppData\\Roaming\\npm;C:\\Program Files\\nodejs;${process.env.PATH}` : '';

for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const splitIndex = trimmed.indexOf('=');
    if (splitIndex === -1) continue;

    const key = trimmed.slice(0, splitIndex).trim();
    let val = trimmed.slice(splitIndex + 1).trim();

    // Fully strip any starting or ending quotes
    val = val.replace(/^["'](.*)["']$/, '$1');

    // Skip localhost definitions
    if (val.includes('localhost')) {
        continue;
    }

    console.log(`Setting ${key}...`);
    try {
        const cmd = `vercel env add ${key} production --value "${val}" --force`;
        execSync(cmd, { env: { ...process.env, PATH: envPath }, stdio: 'inherit' });
    } catch (e) {
        console.error(`Failed to set ${key}:`, e.message);
    }
}

// Ensure the prod URLs are correct
try {
    execSync(`vercel env add NEXTAUTH_URL production --value "https://www.kakoei.com" --force`, { env: { ...process.env, PATH: envPath }, stdio: 'inherit' });
    execSync(`vercel env add AUTH_URL production --value "https://www.kakoei.com" --force`, { env: { ...process.env, PATH: envPath }, stdio: 'inherit' });
    execSync(`vercel env add AUTH_TRUST_HOST production --value "true" --force`, { env: { ...process.env, PATH: envPath }, stdio: 'inherit' });
    console.log("URLs set.");
} catch (e) {
    console.error(e.message);
}

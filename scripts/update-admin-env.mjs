#!/usr/bin/env node
/**
 * Update ADMIN_* and STAFF_PASSWORD in .env (project root).
 * Usage:
 *   node scripts/update-admin-env.mjs --admin-password 'Secret123!' --staff-password 'StaffSecret456!'
 *   node scripts/update-admin-env.mjs --admin-username superadmin --admin-email ops@site.com
 *
 * Or via npm: npm run update-admin-env -- --admin-password '...'
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-/g, '');
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function setEnvLine(lines, key, value) {
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  const newLine = `${key}=${escaped}`;
  const idx = lines.findIndex((l) => {
    const t = l.trim();
    if (t.startsWith('#') || !t.includes('=')) return false;
    return t.split('=')[0].trim() === key;
  });
  if (idx >= 0) lines[idx] = newLine;
  else {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push(`# Updated ${new Date().toISOString()}`);
    lines.push(newLine);
  }
}

async function main() {
  const a = parseArgs();
  const adminPassword = a.adminpassword || a.adminpass;
  const staffPassword = a.staffpassword || a.staffpass;
  const adminUsername = a.adminusername;
  const adminEmail = a.adminemail;

  if (!adminPassword && !staffPassword && !adminUsername && !adminEmail) {
    console.error(`
Usage:
  node scripts/update-admin-env.mjs --admin-password 'YOUR_SECRET' [--staff-password 'STAFF_SECRET'] [--admin-username admin] [--admin-email you@domain.com]

Or:
  npm run update-admin-env -- --admin-password 'YOUR_SECRET'

File: ${envPath}
`);
    process.exit(1);
  }

  let content;
  try {
    content = await fs.readFile(envPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error(`Missing .env — copy .env.example to .env first:\n  cp .env.example .env`);
      process.exit(1);
    }
    throw e;
  }

  const lines = content.split(/\r?\n/);
  if (adminUsername) setEnvLine(lines, 'ADMIN_USERNAME', adminUsername);
  if (adminEmail) setEnvLine(lines, 'ADMIN_EMAIL', adminEmail);
  if (adminPassword) setEnvLine(lines, 'ADMIN_PASSWORD', adminPassword);
  if (staffPassword) setEnvLine(lines, 'STAFF_PASSWORD', staffPassword);

  await fs.writeFile(envPath, lines.join('\n'), 'utf8');
  console.log(`Updated ${envPath}`);
  console.log('Restart the app (e.g. pm2 restart rich-room --update-env) so Next.js picks up new variables.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

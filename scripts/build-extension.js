import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env file. Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const envResult = dotenv.config({ path: envPath });
const env = envResult.parsed;
if (!env) {
  console.error('Failed to parse .env file.');
  process.exit(1);
}

const required = ['GOOGLE_OAUTH_CLIENT_ID', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error('Missing required .env values:', missing.join(', '));
  process.exit(1);
}

const distExtensionDir = path.join(projectRoot, 'dist', 'extension');
if (fs.existsSync(distExtensionDir)) {
  fs.rmSync(distExtensionDir, { recursive: true, force: true });
}
fs.mkdirSync(distExtensionDir, { recursive: true });

const sourceExtensionDir = path.join(projectRoot, 'extension');
fs.cpSync(sourceExtensionDir, distExtensionDir, { recursive: true });

const manifestPath = path.join(distExtensionDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.oauth2 = manifest.oauth2 || {};
manifest.oauth2.client_id = env.GOOGLE_OAUTH_CLIENT_ID;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const runtimeConfig = {
  SUPABASE_URL: env.SUPABASE_URL,
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
};
fs.writeFileSync(path.join(distExtensionDir, 'runtime-config.json'), JSON.stringify(runtimeConfig, null, 2));

console.log('Build completed. Dist extension generated at dist/extension');

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const runtimeConfigPath = path.join(projectRoot, 'extension', 'runtime-config.json');

let sourceConfig = {};
if (fs.existsSync(envPath)) {
  const envResult = dotenv.config({ path: envPath });
  const env = envResult.parsed;
  if (!env) {
    console.error('Failed to parse .env file.');
    process.exit(1);
  }
  sourceConfig = {
    googleClientId: env.GOOGLE_OAUTH_CLIENT_ID,
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY
  };
}

if (fs.existsSync(runtimeConfigPath)) {
  try {
    const runtimeJson = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
    sourceConfig = {
      googleClientId: runtimeJson.googleClientId || sourceConfig.googleClientId,
      supabaseUrl: runtimeJson.supabaseUrl || runtimeJson.SUPABASE_URL || sourceConfig.supabaseUrl,
      supabaseAnonKey: runtimeJson.supabaseAnonKey || runtimeJson.SUPABASE_ANON_KEY || sourceConfig.supabaseAnonKey
    };
  } catch (err) {
    console.error('Invalid extension/runtime-config.json:', err.message);
    process.exit(1);
  }
}

const required = ['googleClientId', 'supabaseUrl', 'supabaseAnonKey'];
const missing = required.filter((key) => !sourceConfig[key]);
if (missing.length) {
  console.error('Missing required runtime configuration:', missing.join(', '));
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
manifest.oauth2.client_id = sourceConfig.googleClientId;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const runtimeConfig = {
  SUPABASE_URL: sourceConfig.supabaseUrl,
  SUPABASE_ANON_KEY: sourceConfig.supabaseAnonKey
};
fs.writeFileSync(path.join(distExtensionDir, 'runtime-config.json'), JSON.stringify(runtimeConfig, null, 2));

console.log('Build completed. Dist extension generated at dist/extension');

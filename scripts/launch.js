const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration Paths
const SECRETS_PATH = path.join(__dirname, '../config/secrets.local.json');

/**
 * Load secrets from local JSON file
 */
function loadLocalSecrets() {
    if (fs.existsSync(SECRETS_PATH)) {
        try {
            const secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf8'));
            console.log('🔒 Loaded local secrets from config/secrets.local.json');
            return secrets;
        } catch (e) {
            console.error('❌ Failed to parse secrets.local.json:', e.message);
            process.exit(1);
        }
    } else {
        console.warn('⚠️  No config/secrets.local.json found. Using default environment.');
        return {};
    }
}

// 1. Load Secrets
const secrets = loadLocalSecrets();

// 2. Logic: Resolve Environment Variables based on APP_ENV
// Priority: process.env (CLI) > secrets.json value
const APP_ENV = process.env.APP_ENV || secrets.APP_ENV || 'local';

console.log(`🚀 Launching in [${APP_ENV.toUpperCase()}] mode`);

// Helper to pick var based on env
const pickEnvVar = (baseKey) => {
    const specificKey = `${baseKey}_${APP_ENV.toUpperCase()}`;
    return process.env[specificKey] || secrets[specificKey] || process.env[baseKey] || secrets[baseKey];
};

// Construct the final environment
const finalEnv = {
    ...process.env,
    ...secrets,
    APP_ENV: APP_ENV,
    // Dynamically resolve DATABASE_URL based on active environment
    DATABASE_URL: pickEnvVar('DATABASE_URL'),
    // Ensure ONLINE_DATABASE_URL is available for sync (default to PROD if not explicitly set)
    ONLINE_DATABASE_URL: secrets.ONLINE_DATABASE_URL || secrets.DATABASE_URL_PROD
};

// 3. Get command from arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node scripts/launch.js <command>');
    process.exit(1);
}

const command = args[0];
const commandArgs = args.slice(1);

// 4. Spawn the Child Process
// stdio: 'inherit' allows colors and interaction to pass through correctly
const child = spawn(command, commandArgs, {
    env: finalEnv,
    stdio: 'inherit',
    shell: true // Required for npm scripts resolution on Windows usually, or running complex commands
});

child.on('exit', (code) => {
    process.exit(code);
});

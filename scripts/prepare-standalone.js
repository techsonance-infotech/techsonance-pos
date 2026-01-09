const fs = require('fs-extra');
const path = require('path');

async function main() {
    const standaloneDir = path.join(__dirname, '../.next/standalone');
    const publicDir = path.join(__dirname, '../public');
    const staticDir = path.join(__dirname, '../.next/static');

    console.log('Checking standalone directory:', standaloneDir);
    if (!await fs.pathExists(standaloneDir)) {
        console.error('Error: .next/standalone directory not found. Run next build first.');
        process.exit(1);
    }

    console.log('Copying static files to standalone directory...');

    // Copy public -> .next/standalone/public
    if (await fs.pathExists(publicDir)) {
        console.log('Copying public folder...');
        await fs.copy(publicDir, path.join(standaloneDir, 'public'));
    }

    // Copy .next/static -> .next/standalone/.next/static
    if (await fs.pathExists(staticDir)) {
        console.log('Copying .next/static folder...');
        await fs.copy(staticDir, path.join(standaloneDir, '.next/static'));
    }

    // Copy .env -> .next/standalone/.env
    const envPath = path.join(__dirname, '../.env');
    if (await fs.pathExists(envPath)) {
        console.log('Copying .env file...');
        await fs.copy(envPath, path.join(standaloneDir, '.env'));
    }

    console.log('Standalone build prepared successfully.');
}

main().catch(err => {
    console.error('Preparation failed:', err);
    process.exit(1);
});

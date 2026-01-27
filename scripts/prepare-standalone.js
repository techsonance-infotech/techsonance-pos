const fs = require('fs-extra');
const path = require('path');

async function main() {
    const standaloneDir = path.join(__dirname, '../.next/standalone');
    const publicDir = path.join(__dirname, '../public');
    const staticDir = path.join(__dirname, '../.next/static');
    const prismaDir = path.join(__dirname, '../prisma');

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

    // Copy prisma schemas -> .next/standalone/prisma (for reference)
    const prismaStandaloneDir = path.join(standaloneDir, 'prisma');
    await fs.ensureDir(prismaStandaloneDir);

    const schemaPrisma = path.join(prismaDir, 'schema.prisma');
    const schemaPostgres = path.join(prismaDir, 'schema.postgres.prisma');

    if (await fs.pathExists(schemaPrisma)) {
        console.log('Copying prisma/schema.prisma...');
        await fs.copy(schemaPrisma, path.join(prismaStandaloneDir, 'schema.prisma'));
    }

    if (await fs.pathExists(schemaPostgres)) {
        console.log('Copying prisma/schema.postgres.prisma...');
        await fs.copy(schemaPostgres, path.join(prismaStandaloneDir, 'schema.postgres.prisma'));
    }

    // Create backups directory structure
    const backupsDir = path.join(standaloneDir, 'backups');
    if (!await fs.pathExists(backupsDir)) {
        console.log('Creating backups directory...');
        await fs.ensureDir(backupsDir);
    }

    // Create data directory for SQLite database
    const dataDir = path.join(standaloneDir, 'data');
    if (!await fs.pathExists(dataDir)) {
        console.log('Creating data directory for SQLite...');
        await fs.ensureDir(dataDir);
    }

    console.log('Standalone build prepared successfully.');
}

main().catch(err => {
    console.error('Preparation failed:', err);
    process.exit(1);
});

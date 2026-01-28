const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

async function main() {
    console.log('Initializing SQLite database for Electron...\n');

    // Determine the user data path based on OS
    let userDataPath;
    if (process.platform === 'darwin') {
        userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'SyncServe POS');
    } else if (process.platform === 'win32') {
        userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SyncServe POS');
    } else {
        userDataPath = path.join(os.homedir(), '.config', 'SyncServe POS');
    }

    // Create the directory if it doesn't exist
    await fs.ensureDir(userDataPath);
    console.log('User data directory:', userDataPath);

    const dbPath = path.join(userDataPath, 'pos.db');
    const dbUrl = `file:${dbPath}`;
    console.log('Database path:', dbPath);
    console.log('Database URL:', dbUrl);

    // Push the Prisma schema to create/update the database
    console.log('\nPushing Prisma schema to SQLite database...\n');

    try {
        execSync(`SQLITE_DATABASE_URL="${dbUrl}" npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss`, {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
            env: {
                ...process.env,
                SQLITE_DATABASE_URL: dbUrl
            }
        });

        console.log('\n✅ SQLite database initialized successfully!');
        console.log('   Database location:', dbPath);

    } catch (error) {
        console.error('\n❌ Failed to initialize database:', error.message);
        process.exit(1);
    }
}

main();

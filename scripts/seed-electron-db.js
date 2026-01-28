const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

// Determine the user data path based on OS
function getUserDataPath() {
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'SyncServe POS');
    } else if (process.platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'SyncServe POS');
    } else {
        return path.join(os.homedir(), '.config', 'SyncServe POS');
    }
}

async function main() {
    console.log('Seeding Electron SQLite database with initial user...\n');

    const userDataPath = getUserDataPath();
    const dbPath = path.join(userDataPath, 'pos.db');
    const dbUrl = `file:${dbPath}`;

    console.log('Database path:', dbPath);

    // Set env for Prisma
    process.env.SQLITE_DATABASE_URL = dbUrl;

    // Use the SQLite Prisma client
    const { PrismaClient } = require('@prisma/client-sqlite');
    const prisma = new PrismaClient({
        datasourceUrl: dbUrl,
    });

    try {
        // Check if any users exist
        const userCount = await prisma.user.count();

        if (userCount > 0) {
            console.log(`Database already has ${userCount} user(s). Skipping seed.`);
            console.log('\nTo reset, delete the database file and run this script again.');
            return;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create a company first (only required fields)
        const company = await prisma.company.create({
            data: {
                name: 'My Restaurant',
                slug: 'my-restaurant',
                email: 'admin@restaurant.com',
                isActive: true,
            }
        });
        console.log('✅ Created company:', company.name);

        // Create a default store (location is required, not address)
        const store = await prisma.store.create({
            data: {
                name: 'Main Store',
                location: 'Default Location',
                companyId: company.id,
            }
        });
        console.log('✅ Created store:', store.name);

        // Create admin user with all required fields
        const admin = await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@restaurant.com',
                password: hashedPassword,
                role: 'ADMIN',
                isApproved: true,
                isVerified: true,
                isLocked: false,
                companyId: company.id,
                defaultStoreId: store.id,
            }
        });
        console.log('✅ Created admin user:', admin.username);

        // Connect user to store
        await prisma.store.update({
            where: { id: store.id },
            data: {
                users: {
                    connect: { id: admin.id }
                }
            }
        });
        console.log('✅ Connected admin to store');

        console.log('\n========================================');
        console.log('   INITIAL SETUP COMPLETE!');
        console.log('========================================');
        console.log('\nYou can now login with:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

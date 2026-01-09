/**
 * Sync Online Database to Local
 * 
 * This script connects to the ONLINE database, fetches all data,
 * and inserts it into the LOCAL database.
 * 
 * Usage:
 *   1. Set ONLINE_DATABASE_URL in your .env (your Prisma/cloud DB)
 *   2. Set DATABASE_URL to your local PostgreSQL
 *   3. Run: npx tsx scripts/sync-online-to-local.ts
 */

import { PrismaClient } from '@prisma/client'

// Get URLs from environment
const ONLINE_URL = process.env.ONLINE_DATABASE_URL
const LOCAL_URL = process.env.DATABASE_URL

if (!ONLINE_URL) {
    console.error('❌ Error: ONLINE_DATABASE_URL not set in .env')
    console.log('Add this to your .env file:')
    console.log('ONLINE_DATABASE_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require"')
    process.exit(1)
}

if (!LOCAL_URL) {
    console.error('❌ Error: DATABASE_URL not set in .env')
    process.exit(1)
}

console.log('🔄 Starting Online → Local Sync\n')

// Create two Prisma clients
const onlineDb = new PrismaClient({
    datasources: { db: { url: ONLINE_URL } }
})

const localDb = new PrismaClient({
    datasources: { db: { url: LOCAL_URL } }
})

async function clearLocalDatabase() {
    console.log('🧹 Clearing Local Database...')

    // Delete in order of dependency (Child -> Parent)
    // 1. Transactional Data
    await localDb.addon.deleteMany()
    await localDb.order.deleteMany()
    await localDb.notification.deleteMany()

    // 2. Operational Data
    await localDb.product.deleteMany()
    await localDb.category.deleteMany()
    await localDb.table.deleteMany()

    // 3. Licensing
    await localDb.licenseDevice.deleteMany()
    await localDb.license.deleteMany()

    // 4. Core Entities
    await localDb.user.deleteMany()
    await localDb.store.deleteMany()

    // 5. Config
    await localDb.systemConfig.deleteMany()
    await localDb.securityRule.deleteMany()

    console.log('   ✅ Local Database Cleared\n')
}

async function syncTable<T>(
    tableName: string,
    fetchFn: () => Promise<T[]>,
    insertFn: (data: T[]) => Promise<any>
) {
    try {
        const data = await fetchFn()
        if (data.length === 0) {
            console.log(`   ⏭️  ${tableName}: No data`)
            return 0
        }

        // Insert new data
        await insertFn(data)

        console.log(`   ✅ ${tableName}: ${data.length} records`)
        return data.length
    } catch (error: any) {
        console.log(`   ❌ ${tableName}: ${error.message}`)
        return 0
    }
}

async function main() {
    try {
        // Test connections
        console.log('📡 Connecting to Online DB...')
        await onlineDb.$connect()
        console.log('   ✅ Connected\n')

        console.log('💾 Connecting to Local DB...')
        await localDb.$connect()
        console.log('   ✅ Connected\n')

        // CLEAR LOCAL DB
        await clearLocalDatabase()

        console.log('📥 Syncing Tables...\n')

        // 1. System Config
        await syncTable(
            'SystemConfig',
            () => onlineDb.systemConfig.findMany(),
            (data) => localDb.systemConfig.createMany({ data, skipDuplicates: true })
        )

        // 2. Stores (Must be before Users due to relation constraints when linking)
        await syncTable(
            'Store',
            () => onlineDb.store.findMany(),
            (data) => localDb.store.createMany({ data, skipDuplicates: true })
        )

        // 3. Users (without relations first)
        const users = await onlineDb.user.findMany()
        if (users.length > 0) {
            for (const user of users) {
                await localDb.user.create({
                    data: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        contactNo: user.contactNo,
                        password: user.password,
                        pin: user.pin,
                        role: user.role,
                        tableMode: user.tableMode,
                        isLocked: user.isLocked,
                        isApproved: user.isApproved,
                        disabledModules: user.disabledModules,
                        lastIp: user.lastIp,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    }
                })
            }
            console.log(`   ✅ Users: ${users.length} records`)
        }

        // 4. Link Users to Stores (many-to-many)
        // Now that both exist
        const usersWithStores = await onlineDb.user.findMany({
            include: { stores: { select: { id: true } } }
        })
        for (const user of usersWithStores) {
            if (user.stores.length > 0 || user.defaultStoreId) {
                try {
                    await localDb.user.update({
                        where: { id: user.id },
                        data: {
                            stores: { connect: user.stores.map(s => ({ id: s.id })) },
                            defaultStoreId: user.defaultStoreId // This requires Store to exist, which it should
                        }
                    })
                } catch (e) {
                    // console.warn(`   ⚠️ Link Error for ${user.username}:`, e)
                }
            }
        }
        console.log(`   ✅ User-Store Links: Updated`)

        // 5. Licenses
        await syncTable(
            'License',
            () => onlineDb.license.findMany(),
            (data) => localDb.license.createMany({ data, skipDuplicates: true })
        )

        // 6. License Devices
        await syncTable(
            'LicenseDevice',
            () => onlineDb.licenseDevice.findMany(),
            (data) => localDb.licenseDevice.createMany({ data, skipDuplicates: true })
        )

        // 7. Security Rules
        await syncTable(
            'SecurityRule',
            () => onlineDb.securityRule.findMany(),
            (data) => localDb.securityRule.createMany({ data, skipDuplicates: true })
        )

        // 8. Tables
        await syncTable(
            'Table',
            () => onlineDb.table.findMany(),
            (data) => localDb.table.createMany({ data, skipDuplicates: true })
        )

        // 9. Notifications
        await syncTable(
            'Notification',
            () => onlineDb.notification.findMany(),
            (data) => localDb.notification.createMany({ data, skipDuplicates: true })
        )

        // 10. Categories
        await syncTable(
            'Category',
            () => onlineDb.category.findMany(),
            (data) => localDb.category.createMany({ data, skipDuplicates: true })
        )

        // 11. Products
        await syncTable(
            'Product',
            () => onlineDb.product.findMany(),
            (data) => localDb.product.createMany({ data, skipDuplicates: true })
        )

        // 12. Addons
        await syncTable(
            'Addon',
            () => onlineDb.addon.findMany(),
            (data) => localDb.addon.createMany({ data, skipDuplicates: true })
        )

        // 13. Orders
        await syncTable(
            'Order',
            () => onlineDb.order.findMany(),
            (data) => localDb.order.createMany({ data, skipDuplicates: true })
        )

        console.log('\n🎉 Sync Complete!')

    } catch (error) {
        console.error('❌ Sync Error:', error)
    } finally {
        await onlineDb.$disconnect()
        await localDb.$disconnect()
    }
}

main()

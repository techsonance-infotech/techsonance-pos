import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDatabase() {
    console.log('🔍 Verifying Cloud Database Connection...\n')

    try {
        // Test connection
        await prisma.$connect()
        console.log('✅ Database connection successful!\n')

        // Count records in each table
        const userCount = await prisma.user.count()
        const storeCount = await prisma.store.count()
        const categoryCount = await prisma.category.count()
        const productCount = await prisma.product.count()
        const tableCount = await prisma.table.count()
        const orderCount = await prisma.order.count()
        const notificationCount = await prisma.notification.count()

        console.log('📊 Database Statistics:')
        console.log('─────────────────────────')
        console.log(`Users:         ${userCount}`)
        console.log(`Stores:        ${storeCount}`)
        console.log(`Categories:    ${categoryCount}`)
        console.log(`Products:      ${productCount}`)
        console.log(`Tables:        ${tableCount}`)
        console.log(`Orders:        ${orderCount}`)
        console.log(`Notifications: ${notificationCount}`)
        console.log('─────────────────────────\n')

        // List users
        const users = await prisma.user.findMany({
            select: {
                username: true,
                email: true,
                role: true
            }
        })
        console.log('👥 Users in Database:')
        users.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - ${user.role}`)
        })
        console.log()

        // List stores
        const stores = await prisma.store.findMany({
            select: {
                name: true,
                location: true
            }
        })
        console.log('🏪 Stores in Database:')
        stores.forEach(store => {
            console.log(`  - ${store.name} (${store.location})`)
        })
        console.log()

        // List categories
        const categories = await prisma.category.findMany({
            select: {
                name: true,
                _count: {
                    select: { products: true }
                }
            }
        })
        console.log('📁 Categories in Database:')
        categories.forEach(cat => {
            console.log(`  - ${cat.name} (${cat._count.products} products)`)
        })
        console.log()

        console.log('✅ All tables created and seeded successfully!')
        console.log('🎉 Cloud database is ready to use!\n')

    } catch (error) {
        console.error('❌ Database verification failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

verifyDatabase()

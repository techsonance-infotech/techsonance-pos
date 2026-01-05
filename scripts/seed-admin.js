const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // Create a store first
    const store = await prisma.store.create({
        data: {
            name: "Main Store",
            location: "Downtown"
        }
    })

    // Create admin user with isApproved: true
    const admin = await prisma.user.create({
        data: {
            username: "admin",
            email: "admin@cafepos.com",
            password: "admin", // Plain text for demo
            role: "SUPER_ADMIN",
            isApproved: true,
            isLocked: false,
            defaultStoreId: store.id,
            stores: {
                connect: { id: store.id }
            }
        }
    })

    console.log("✅ Admin user created successfully!")
    console.log("Username: admin")
    console.log("Password: admin")
    console.log("Store:", store.name)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

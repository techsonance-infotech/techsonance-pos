const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAdmin() {
    const admin = await prisma.$queryRaw`
        SELECT id, username, email, role, "isApproved", "isLocked" 
        FROM "User" 
        WHERE username = 'admin'
    `

    console.log("Admin user in database:")
    console.log(admin)

    if (admin.length > 0 && !admin[0].isApproved) {
        console.log("\n⚠️  Admin is NOT approved. Fixing...")
        await prisma.$executeRaw`
            UPDATE "User" 
            SET "isApproved" = true 
            WHERE username = 'admin'
        `
        console.log("✅ Admin approved!")
    } else if (admin.length > 0) {
        console.log("\n✅ Admin is already approved")
    } else {
        console.log("\n❌ Admin user not found!")
    }
}

checkAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

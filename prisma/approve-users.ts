import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function approveUsers() {
    console.log('🔓 Approving all seeded users...\n')

    try {
        // Approve all users
        const result = await prisma.user.updateMany({
            where: {
                email: {
                    in: [
                        'superadmin@techsonance.com',
                        'owner@techsonance.com',
                        'staff@techsonance.com'
                    ]
                }
            },
            data: {
                isApproved: true
            }
        })

        console.log(`✅ Approved ${result.count} users`)

        // Verify
        const users = await prisma.user.findMany({
            select: {
                username: true,
                email: true,
                isApproved: true,
                isLocked: true
            }
        })

        console.log('\n👥 User Status:')
        users.forEach(user => {
            console.log(`  - ${user.username}: Approved=${user.isApproved}, Locked=${user.isLocked}`)
        })

        console.log('\n✅ All users can now login!')

    } catch (error) {
        console.error('❌ Failed to approve users:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

approveUsers()

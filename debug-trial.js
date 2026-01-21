
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const userId = '78b04d6f-c4ab-4454-bd26-01a999aeed4e' // From logs

    console.log(`Checking trial status for user: ${userId}`)

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            stores: { include: { license: true } },
            defaultStore: { include: { license: true } }
        }
    })

    if (!user) {
        console.log("User not found")
        return
    }

    const store = user.defaultStore || user.stores[0]
    if (!store) {
        console.log("No store found")
        return
    }

    console.log(`Store Name: ${store.name}`)
    console.log(`Store CreatedAt: ${store.createdAt}`)
    console.log(`Has License: ${!!store.license}`)

    const trialDays = 7
    const trialStartDate = new Date(store.createdAt)
    const now = new Date()

    const diffTime = Math.abs(now.getTime() - trialStartDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    console.log(`Now: ${now}`)
    console.log(`Diff Time (ms): ${diffTime}`)
    console.log(`Diff Days: ${diffDays}`)
    console.log(`Trial Limit: ${trialDays}`)

    if (diffDays <= trialDays) {
        console.log("RESULT: Valid (In Trial)")
    } else {
        console.log("RESULT: Expired")
    }
}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

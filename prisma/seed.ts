import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Create Super Admin
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@techsonance.com' },
        update: {},
        create: {
            username: 'superadmin',
            email: 'superadmin@techsonance.com',
            password: 'password123', // In a real app, hash this!
            role: Role.SUPER_ADMIN,
            contactNo: '9876543210',
        },
    })
    console.log({ superAdmin })

    // 2. Create Restaurant
    const restaurant = await prisma.restaurant.create({
        data: {
            name: 'TechSonance Cafe',
            address: '123 Tech Park',
            area: 'Innovation Hub',
        }
    })
    console.log({ restaurant })

    // 3. Create Business Owner linked to Restaurant
    const businessOwner = await prisma.user.upsert({
        where: { email: 'owner@techsonance.com' },
        update: {},
        create: {
            username: 'business_owner',
            email: 'owner@techsonance.com',
            password: 'password123',
            role: Role.BUSINESS_OWNER,
            contactNo: '9876543211',
            restaurantId: restaurant.id
        },
    })
    console.log({ businessOwner })

    // 4. Create Regular User (Staff) linked to Restaurant
    const staffUser = await prisma.user.upsert({
        where: { email: 'staff@techsonance.com' },
        update: {},
        create: {
            username: 'staff_user',
            email: 'staff@techsonance.com',
            password: 'password123',
            role: Role.USER,
            contactNo: '9876543212',
            restaurantId: restaurant.id
        },
    })
    console.log({ staffUser })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

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

    // 2. Create Stores
    const store1 = await prisma.store.create({
        data: { name: 'Godadara, Surat', location: '123 Main Street' }
    })
    const store2 = await prisma.store.create({
        data: { name: 'Vesu, Surat', location: '456 Downtown Ave' }
    })
    const store3 = await prisma.store.create({
        data: { name: 'Vapi, Gujarat', location: '789 Shopping Mall' }
    })
    console.log({ store1, store2, store3 })

    // 2b. Link Super Admin to Stores
    await prisma.user.update({
        where: { id: superAdmin.id },
        data: {
            stores: {
                connect: [{ id: store1.id }, { id: store2.id }, { id: store3.id }]
            },
            defaultStoreId: store1.id
        }
    })

    // 3. Create Business Owner linked to All Stores
    const businessOwner = await prisma.user.upsert({
        where: { email: 'owner@techsonance.com' },
        update: {},
        create: {
            username: 'business_owner',
            email: 'owner@techsonance.com',
            password: 'password123',
            role: Role.BUSINESS_OWNER,
            contactNo: '9876543211',
            stores: {
                connect: [{ id: store1.id }, { id: store2.id }, { id: store3.id }]
            },
            // defaultStoreId removed to force selection
        },
    })
    console.log({ businessOwner })

    // 4. Create Regular User (Staff) linked to Vesu only
    const staffUser = await prisma.user.upsert({
        where: { email: 'staff@techsonance.com' },
        update: {},
        create: {
            username: 'staff_user',
            email: 'staff@techsonance.com',
            password: 'password123',
            role: Role.USER,
            contactNo: '9876543212',
            stores: {
                connect: [{ id: store2.id }]
            },
            defaultStoreId: store2.id
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

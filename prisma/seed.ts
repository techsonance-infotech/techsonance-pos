import { PrismaClient } from '@prisma/client'
import { Role } from '../types/enums'

const prisma = new PrismaClient()

async function main() {
    // 1. Create Default Company for multi-tenant support
    const defaultCompany = await prisma.company.upsert({
        where: { slug: 'default' },
        update: {},
        create: {
            name: 'TechSonance Demo',
            slug: 'default',
            address: '123 Demo Street, Gujarat',
            phone: '9876543210',
            email: 'demo@techsonance.com',
            isActive: true
        }
    })
    console.log({ defaultCompany })

    // 2. Create Super Admin (no companyId - global access)
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@techsonance.com' },
        update: {},
        create: {
            username: 'superadmin',
            email: 'superadmin@techsonance.com',
            password: 'password123', // In a real app, hash this!
            role: Role.SUPER_ADMIN,
            contactNo: '9876543210',
            isApproved: true,
            // Super Admin has no companyId - global access to all companies
        },
    })
    console.log({ superAdmin })

    // 3. Create Stores linked to default company
    const store1 = await prisma.store.upsert({
        where: { id: 'store-godadara' },
        update: { companyId: defaultCompany.id },
        create: {
            id: 'store-godadara',
            name: 'Godadara, Surat',
            location: '123 Main Street',
            companyId: defaultCompany.id
        }
    })
    const store2 = await prisma.store.upsert({
        where: { id: 'store-vesu' },
        update: { companyId: defaultCompany.id },
        create: {
            id: 'store-vesu',
            name: 'Vesu, Surat',
            location: '456 Downtown Ave',
            companyId: defaultCompany.id
        }
    })
    const store3 = await prisma.store.upsert({
        where: { id: 'store-vapi' },
        update: { companyId: defaultCompany.id },
        create: {
            id: 'store-vapi',
            name: 'Vapi, Gujarat',
            location: '789 Shopping Mall',
            companyId: defaultCompany.id
        }
    })
    console.log({ store1, store2, store3 })

    // 4. Link Super Admin to Stores (optional - Super Admin has global access anyway)
    await prisma.user.update({
        where: { id: superAdmin.id },
        data: {
            stores: {
                connect: [{ id: store1.id }, { id: store2.id }, { id: store3.id }]
            },
            defaultStoreId: store1.id
        }
    })

    // 5. Create Business Owner linked to default company and all stores
    const businessOwner = await prisma.user.upsert({
        where: { email: 'owner@techsonance.com' },
        update: { companyId: defaultCompany.id },
        create: {
            username: 'business_owner',
            email: 'owner@techsonance.com',
            password: 'password123',
            role: Role.BUSINESS_OWNER,
            contactNo: '9876543211',
            isApproved: true,
            companyId: defaultCompany.id, // Belongs to default company
            stores: {
                connect: [{ id: store1.id }, { id: store2.id }, { id: store3.id }]
            },
            defaultStoreId: store1.id
        },
    })
    console.log({ businessOwner })

    // 6. Create Regular User (Staff) linked to default company and Vesu store
    const staffUser = await prisma.user.upsert({
        where: { email: 'staff@techsonance.com' },
        update: { companyId: defaultCompany.id },
        create: {
            username: 'staff_user',
            email: 'staff@techsonance.com',
            password: 'password123',
            role: Role.USER,
            contactNo: '9876543212',
            isApproved: true,
            companyId: defaultCompany.id, // Belongs to default company
            stores: {
                connect: [{ id: store2.id }]
            },
            defaultStoreId: store2.id
        },
    })
    console.log({ staffUser })

    // 7. Create default backup schedule (disabled by default)
    await prisma.backupSchedule.upsert({
        where: { id: 'default-schedule' },
        update: {},
        create: {
            id: 'default-schedule',
            frequency: 'daily',
            time: '02:00',
            retentionDays: 30,
            isEnabled: false
        }
    })
    console.log('Default backup schedule created')
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

/**
 * Full Database Seed for Local Development
 * 
 * Usage: 
 *   1. Ensure DATABASE_URL in .env points to your local PostgreSQL
 *   2. Run: npx prisma migrate dev (if needed)
 *   3. Run: npx ts-node prisma/seed-local.ts
 * 
 * This script creates:
 *   - Super Admin, Business Owner, and Staff users
 *   - 3 Stores with licenses
 *   - Categories and Products with addons
 *   - Sample Tables
 *   - System Configuration
 */

import { PrismaClient, Role, LicenseStatus, LicenseType, TableStatus } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// --- Helper: Simple Password Hash (for demo; use bcrypt in production) ---
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex')
}

// --- SEED DATA ---

const USERS = [
    {
        username: 'superadmin',
        email: 'superadmin@techsonance.com',
        password: 'admin@123',
        role: Role.SUPER_ADMIN,
        contactNo: '9876543210',
        isApproved: true,
    },
    {
        username: 'owner',
        email: 'owner@techsonance.com',
        password: 'owner@123',
        role: Role.BUSINESS_OWNER,
        contactNo: '9876543211',
        isApproved: true,
    },
    {
        username: 'manager',
        email: 'manager@techsonance.com',
        password: 'manager@123',
        role: Role.MANAGER,
        contactNo: '9876543212',
        isApproved: true,
    },
    {
        username: 'staff',
        email: 'staff@techsonance.com',
        password: 'staff@123',
        role: Role.USER,
        contactNo: '9876543213',
        isApproved: true,
    },
]

const STORES = [
    { name: 'Godadara, Surat', location: '123 Main Street, Godadara', tableMode: true },
    { name: 'Vesu, Surat', location: '456 Downtown Ave, Vesu', tableMode: true },
    { name: 'Vapi, Gujarat', location: '789 Shopping Mall, Vapi', tableMode: false },
]

const CATEGORIES = [
    { name: 'Hot Beverages', sortOrder: 1, image: null },
    { name: 'Cold Beverages', sortOrder: 2, image: null },
    { name: 'Snacks', sortOrder: 3, image: null },
    { name: 'Desserts', sortOrder: 4, image: null },
    { name: 'Main Course', sortOrder: 5, image: null },
    { name: 'Combos', sortOrder: 6, image: null },
]

const PRODUCTS = [
    // Hot Beverages
    { categoryName: 'Hot Beverages', name: 'Espresso', price: 120, description: 'Strong Italian coffee' },
    { categoryName: 'Hot Beverages', name: 'Cappuccino', price: 150, description: 'Espresso with steamed milk foam' },
    { categoryName: 'Hot Beverages', name: 'Latte', price: 160, description: 'Smooth espresso with milk' },
    { categoryName: 'Hot Beverages', name: 'Americano', price: 130, description: 'Espresso with hot water' },
    { categoryName: 'Hot Beverages', name: 'Mocha', price: 180, description: 'Chocolate espresso' },
    { categoryName: 'Hot Beverages', name: 'Hot Chocolate', price: 140, description: 'Rich cocoa drink' },
    { categoryName: 'Hot Beverages', name: 'Masala Chai', price: 60, description: 'Traditional Indian spiced tea' },
    { categoryName: 'Hot Beverages', name: 'Green Tea', price: 80, description: 'Healthy antioxidant tea' },

    // Cold Beverages
    { categoryName: 'Cold Beverages', name: 'Iced Latte', price: 170, description: 'Chilled latte over ice' },
    { categoryName: 'Cold Beverages', name: 'Cold Brew', price: 190, description: 'Slow-steeped cold coffee' },
    { categoryName: 'Cold Beverages', name: 'Frappe', price: 200, description: 'Blended iced coffee' },
    { categoryName: 'Cold Beverages', name: 'Mango Smoothie', price: 150, description: 'Fresh mango blend' },
    { categoryName: 'Cold Beverages', name: 'Lemonade', price: 80, description: 'Fresh squeezed lemon' },
    { categoryName: 'Cold Beverages', name: 'Mojito', price: 120, description: 'Mint and lime refresh' },

    // Snacks
    { categoryName: 'Snacks', name: 'Croissant', price: 90, description: 'Buttery French pastry' },
    { categoryName: 'Snacks', name: 'Chocolate Muffin', price: 80, description: 'Rich chocolate muffin' },
    { categoryName: 'Snacks', name: 'Club Sandwich', price: 180, description: 'Triple-decker sandwich' },
    { categoryName: 'Snacks', name: 'Veg Burger', price: 150, description: 'Crispy veggie patty' },
    { categoryName: 'Snacks', name: 'French Fries', price: 100, description: 'Crispy golden fries' },
    { categoryName: 'Snacks', name: 'Garlic Bread', price: 110, description: 'Toasted with garlic butter' },
    { categoryName: 'Snacks', name: 'Nachos', price: 140, description: 'With cheese dip' },

    // Desserts
    { categoryName: 'Desserts', name: 'Chocolate Brownie', price: 120, description: 'Warm fudgy brownie' },
    { categoryName: 'Desserts', name: 'Cheesecake', price: 180, description: 'New York style' },
    { categoryName: 'Desserts', name: 'Ice Cream Sundae', price: 150, description: 'With toppings' },
    { categoryName: 'Desserts', name: 'Tiramisu', price: 200, description: 'Italian coffee dessert' },

    // Main Course
    { categoryName: 'Main Course', name: 'Pasta Alfredo', price: 250, description: 'Creamy white sauce pasta' },
    { categoryName: 'Main Course', name: 'Margherita Pizza', price: 300, description: '8" classic pizza' },
    { categoryName: 'Main Course', name: 'Grilled Paneer', price: 280, description: 'With veggies' },

    // Combos
    { categoryName: 'Combos', name: 'Coffee + Croissant', price: 180, description: 'Morning combo' },
    { categoryName: 'Combos', name: 'Burger + Fries + Drink', price: 280, description: 'Lunch special' },
    { categoryName: 'Combos', name: 'Pizza + Cold Drink', price: 350, description: 'Party combo' },
]

const ADDONS = [
    { productName: 'Espresso', name: 'Extra Shot', price: 30 },
    { productName: 'Espresso', name: 'Oat Milk', price: 40 },
    { productName: 'Cappuccino', name: 'Extra Shot', price: 30 },
    { productName: 'Cappuccino', name: 'Vanilla Syrup', price: 25 },
    { productName: 'Cappuccino', name: 'Caramel Syrup', price: 25 },
    { productName: 'Latte', name: 'Extra Shot', price: 30 },
    { productName: 'Latte', name: 'Hazelnut Syrup', price: 25 },
    { productName: 'Iced Latte', name: 'Extra Shot', price: 30 },
    { productName: 'Frappe', name: 'Whipped Cream', price: 20 },
    { productName: 'Frappe', name: 'Chocolate Chips', price: 30 },
    { productName: 'Veg Burger', name: 'Extra Cheese', price: 30 },
    { productName: 'Veg Burger', name: 'Jalapenos', price: 20 },
    { productName: 'French Fries', name: 'Cheese Dip', price: 40 },
    { productName: 'French Fries', name: 'Peri Peri', price: 15 },
    { productName: 'Pizza Margherita', name: 'Extra Cheese', price: 50 },
    { productName: 'Ice Cream Sundae', name: 'Chocolate Sauce', price: 25 },
    { productName: 'Ice Cream Sundae', name: 'Nuts', price: 30 },
]

const TABLES = [
    { name: 'Table 1', capacity: 2 },
    { name: 'Table 2', capacity: 4 },
    { name: 'Table 3', capacity: 4 },
    { name: 'Table 4', capacity: 6 },
    { name: 'Table 5', capacity: 2 },
    { name: 'Table 6', capacity: 8 },
    { name: 'Outdoor 1', capacity: 4 },
    { name: 'Outdoor 2', capacity: 4 },
]

const SYSTEM_CONFIG = [
    { key: 'app_name', value: 'TechSonance POS' },
    { key: 'currency', value: 'INR' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'tax_rate', value: '5' },
    { key: 'tax_name', value: 'GST' },
    { key: 'show_tax_breakdown', value: 'true' },
    { key: 'enable_discount', value: 'true' },
    { key: 'default_discount', value: '0' },
    { key: 'receipt_header', value: 'Thank you for your order!' },
    { key: 'receipt_footer', value: 'Visit again!' },
]

// --- MAIN SEED FUNCTION ---

async function main() {
    console.log('🌱 Starting Full Database Seed...\n')

    // 1. System Config
    console.log('📝 Seeding System Config...')
    for (const config of SYSTEM_CONFIG) {
        await prisma.systemConfig.upsert({
            where: { key: config.key },
            update: { value: config.value },
            create: { key: config.key, value: config.value, isEnabled: true },
        })
    }
    console.log(`   ✅ ${SYSTEM_CONFIG.length} config entries\n`)

    // 2. Users
    console.log('👤 Seeding Users...')
    const userMap = new Map<string, string>()
    for (const userData of USERS) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                ...userData,
                password: hashPassword(userData.password),
            },
        })
        userMap.set(userData.email, user.id)
        console.log(`   ✅ ${userData.username} (${userData.role})`)
    }
    console.log('')

    // 3. Stores
    console.log('🏪 Seeding Stores...')
    const storeIds: string[] = []
    for (const storeData of STORES) {
        const store = await prisma.store.create({ data: storeData })
        storeIds.push(store.id)
        console.log(`   ✅ ${store.name}`)
    }
    console.log('')

    // 4. Link Users to Stores
    console.log('🔗 Linking Users to Stores...')
    // Super Admin & Owner get all stores
    for (const email of ['superadmin@techsonance.com', 'owner@techsonance.com']) {
        await prisma.user.update({
            where: { email },
            data: {
                stores: { connect: storeIds.map(id => ({ id })) },
                defaultStoreId: storeIds[0],
            },
        })
    }
    // Manager gets first store
    await prisma.user.update({
        where: { email: 'manager@techsonance.com' },
        data: {
            stores: { connect: [{ id: storeIds[0] }] },
            defaultStoreId: storeIds[0],
        },
    })
    // Staff gets second store
    await prisma.user.update({
        where: { email: 'staff@techsonance.com' },
        data: {
            stores: { connect: [{ id: storeIds[1] }] },
            defaultStoreId: storeIds[1],
        },
    })
    console.log('   ✅ Users linked to stores\n')

    // 5. Licenses for Stores
    console.log('🔑 Creating Licenses...')
    for (const storeId of storeIds) {
        const key = `LIC-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
        await prisma.license.create({
            data: {
                key,
                keyHash: crypto.createHash('sha256').update(key).digest('hex'),
                maskedKey: `XXXXX-XXXXX-${key.slice(-5)}`,
                status: LicenseStatus.ACTIVE,
                type: LicenseType.PERPETUAL,
                maxDevices: 3,
                storeId,
            },
        })
    }
    console.log(`   ✅ ${storeIds.length} licenses created\n`)

    // 6. Tables (for first store only)
    console.log('🪑 Seeding Tables...')
    for (const table of TABLES) {
        await prisma.table.create({
            data: {
                ...table,
                status: TableStatus.AVAILABLE,
                storeId: storeIds[0],
            },
        })
    }
    console.log(`   ✅ ${TABLES.length} tables for first store\n`)

    // 7. Categories (for first store)
    console.log('📂 Seeding Categories...')
    const categoryMap = new Map<string, string>()
    for (const cat of CATEGORIES) {
        const category = await prisma.category.create({
            data: {
                name: cat.name,
                sortOrder: cat.sortOrder,
                image: cat.image,
                storeId: storeIds[0],
            },
        })
        categoryMap.set(cat.name, category.id)
    }
    console.log(`   ✅ ${CATEGORIES.length} categories\n`)

    // 8. Products
    console.log('🍔 Seeding Products...')
    const productMap = new Map<string, string>()
    for (const prod of PRODUCTS) {
        const categoryId = categoryMap.get(prod.categoryName)
        if (categoryId) {
            const product = await prisma.product.create({
                data: {
                    name: prod.name,
                    price: prod.price,
                    description: prod.description,
                    isAvailable: true,
                    categoryId,
                },
            })
            productMap.set(prod.name, product.id)
        }
    }
    console.log(`   ✅ ${PRODUCTS.length} products\n`)

    // 9. Addons
    console.log('➕ Seeding Addons...')
    let addonCount = 0
    for (const addon of ADDONS) {
        const productId = productMap.get(addon.productName)
        if (productId) {
            await prisma.addon.create({
                data: {
                    name: addon.name,
                    price: addon.price,
                    isAvailable: true,
                    productId,
                },
            })
            addonCount++
        }
    }
    console.log(`   ✅ ${addonCount} addons\n`)

    console.log('🎉 Database seeding complete!')
    console.log('\n📋 Login Credentials:')
    console.log('   Super Admin: superadmin@techsonance.com / admin@123')
    console.log('   Owner:       owner@techsonance.com / owner@123')
    console.log('   Manager:     manager@techsonance.com / manager@123')
    console.log('   Staff:       staff@techsonance.com / staff@123')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Seed Error:', e)
        await prisma.$disconnect()
        process.exit(1)
    })

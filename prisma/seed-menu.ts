
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mock Data from NewOrderPage
const CATEGORIES = [
    { name: 'Coffee', sortOrder: 1 },
    { name: 'Snacks', sortOrder: 2 },
    { name: 'Beverages', sortOrder: 3 },
    { name: 'Desserts', sortOrder: 4 },
    { name: 'Combos', sortOrder: 5 },
]

const PRODUCTS = [
    { categoryName: 'Coffee', name: 'Espresso', price: 120 },
    { categoryName: 'Coffee', name: 'Cappuccino', price: 150 },
    { categoryName: 'Coffee', name: 'Latte', price: 160 },
    { categoryName: 'Coffee', name: 'Americano', price: 130 },
    { categoryName: 'Coffee', name: 'Mocha', price: 180 },
    { categoryName: 'Snacks', name: 'Croissant', price: 90 },
    { categoryName: 'Snacks', name: 'Muffin', price: 80 },
    { categoryName: 'Snacks', name: 'Sandwich', price: 110 },
]

async function main() {
    console.log('Seeding Menu...')

    // Get the first available store
    const store = await prisma.store.findFirst()
    if (!store) {
        throw new Error('No store found. Please run the main seed script first.')
    }
    console.log(`Using store: ${store.name}`)

    // Create Categories
    const categoryMap = new Map()

    for (const cat of CATEGORIES) {
        // Upsert to avoid duplicates if re-running
        const existing = await prisma.category.findFirst({ where: { name: cat.name, storeId: store.id } })
        if (existing) {
            categoryMap.set(cat.name, existing.id)
        } else {
            const created = await prisma.category.create({
                data: {
                    name: cat.name,
                    sortOrder: cat.sortOrder,
                    storeId: store.id
                }
            })
            categoryMap.set(cat.name, created.id)
        }
    }

    // Create Products
    for (const p of PRODUCTS) {
        const catId = categoryMap.get(p.categoryName)
        if (catId) {
            const existing = await prisma.product.findFirst({ where: { name: p.name } })
            if (!existing) {
                await prisma.product.create({
                    data: {
                        name: p.name,
                        price: p.price,
                        categoryId: catId,
                        isAvailable: true
                    }
                })
            }
        }
    }

    console.log('Menu Seeded!')
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

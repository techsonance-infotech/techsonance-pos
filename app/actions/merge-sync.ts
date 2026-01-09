'use server'

import { PrismaClient } from '@prisma/client'
import { getUserProfile } from "./user"

/**
 * Sync Local PostgreSQL to Remote PostgreSQL using Prisma Upsert
 * This is a SAFE merge operation that preserves existing remote data
 */
export async function syncLocalToRemote() {
    const user = await getUserProfile()

    // Authorization check
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
        return { error: "Unauthorized" }
    }

    try {
        // Get connection strings
        const localUrl = process.env.DATABASE_URL
        const remoteUrl = process.env.ONLINE_DATABASE_URL || process.env.DATABASE_URL_PROD

        if (!localUrl) {
            return { error: "Local DATABASE_URL not configured" }
        }

        if (!remoteUrl) {
            return { error: "Remote database URL not configured (ONLINE_DATABASE_URL)" }
        }

        // Create Prisma clients for both databases
        const localPrisma = new PrismaClient({ datasources: { db: { url: localUrl } } })
        const remotePrisma = new PrismaClient({ datasources: { db: { url: remoteUrl } } })

        const stats = {
            companies: 0,
            stores: 0,
            users: 0,
            categories: 0,
            products: 0,
            addons: 0,
            tables: 0,
            orders: 0,
            errors: [] as string[]
        }

        try {
            // 1. Sync Companies (if multi-tenant)
            const companies = await localPrisma.company.findMany()
            for (const company of companies) {
                try {
                    await remotePrisma.company.upsert({
                        where: { id: company.id },
                        create: company,
                        update: {
                            name: company.name,
                            slug: company.slug,
                            logo: company.logo,
                            address: company.address,
                            phone: company.phone,
                            email: company.email,
                            isActive: company.isActive
                        }
                    })
                    stats.companies++
                } catch (e: any) {
                    stats.errors.push(`Company ${company.name}: ${e.message}`)
                }
            }

            // 2. Sync Stores
            const stores = await localPrisma.store.findMany()
            for (const store of stores) {
                try {
                    await remotePrisma.store.upsert({
                        where: { id: store.id },
                        create: store,
                        update: {
                            name: store.name,
                            location: store.location,
                            tableMode: store.tableMode,
                            companyId: store.companyId
                        }
                    })
                    stats.stores++
                } catch (e: any) {
                    stats.errors.push(`Store ${store.name}: ${e.message}`)
                }
            }

            // 3. Sync Users
            const users = await localPrisma.user.findMany()
            for (const u of users) {
                try {
                    await remotePrisma.user.upsert({
                        where: { id: u.id },
                        create: u,
                        update: {
                            username: u.username,
                            email: u.email,
                            contactNo: u.contactNo,
                            password: u.password,
                            pin: u.pin,
                            role: u.role,
                            tableMode: u.tableMode,
                            isLocked: u.isLocked,
                            isApproved: u.isApproved,
                            disabledModules: u.disabledModules,
                            lastIp: u.lastIp,
                            companyId: u.companyId,
                            defaultStoreId: u.defaultStoreId
                        }
                    })
                    stats.users++
                } catch (e: any) {
                    stats.errors.push(`User ${u.username}: ${e.message}`)
                }
            }

            // 4. Sync Categories
            const categories = await localPrisma.category.findMany()
            for (const cat of categories) {
                try {
                    await remotePrisma.category.upsert({
                        where: { id: cat.id },
                        create: cat,
                        update: {
                            name: cat.name,
                            image: cat.image,
                            sortOrder: cat.sortOrder,
                            isActive: cat.isActive,
                            storeId: cat.storeId
                        }
                    })
                    stats.categories++
                } catch (e: any) {
                    stats.errors.push(`Category ${cat.name}: ${e.message}`)
                }
            }

            // 5. Sync Products
            const products = await localPrisma.product.findMany()
            for (const prod of products) {
                try {
                    await remotePrisma.product.upsert({
                        where: { id: prod.id },
                        create: prod,
                        update: {
                            name: prod.name,
                            price: prod.price,
                            description: prod.description,
                            image: prod.image,
                            isAvailable: prod.isAvailable,
                            sortOrder: prod.sortOrder,
                            categoryId: prod.categoryId
                        }
                    })
                    stats.products++
                } catch (e: any) {
                    stats.errors.push(`Product ${prod.name}: ${e.message}`)
                }
            }

            // 6. Sync Addons
            const addons = await localPrisma.addon.findMany()
            for (const addon of addons) {
                try {
                    await remotePrisma.addon.upsert({
                        where: { id: addon.id },
                        create: addon,
                        update: {
                            name: addon.name,
                            price: addon.price,
                            isAvailable: addon.isAvailable,
                            sortOrder: addon.sortOrder,
                            productId: addon.productId
                        }
                    })
                    stats.addons++
                } catch (e: any) {
                    stats.errors.push(`Addon ${addon.name}: ${e.message}`)
                }
            }

            // 7. Sync Tables
            const tables = await localPrisma.table.findMany()
            for (const table of tables) {
                try {
                    await remotePrisma.table.upsert({
                        where: { id: table.id },
                        create: table,
                        update: {
                            name: table.name,
                            capacity: table.capacity,
                            status: table.status,
                            storeId: table.storeId
                        }
                    })
                    stats.tables++
                } catch (e: any) {
                    stats.errors.push(`Table ${table.name}: ${e.message}`)
                }
            }

            // 8. Sync Orders
            const orders = await localPrisma.order.findMany()
            for (const order of orders) {
                try {
                    await remotePrisma.order.upsert({
                        where: { id: order.id },
                        create: {
                            ...order,
                            items: order.items as any
                        },
                        update: {
                            kotNo: order.kotNo,
                            status: order.status,
                            totalAmount: order.totalAmount,
                            discountAmount: order.discountAmount,
                            items: order.items as any,
                            paymentMode: order.paymentMode,
                            customerName: order.customerName,
                            customerMobile: order.customerMobile,
                            tableId: order.tableId,
                            tableName: order.tableName,
                            userId: order.userId,
                            storeId: order.storeId
                        }
                    })
                    stats.orders++
                } catch (e: any) {
                    stats.errors.push(`Order ${order.kotNo}: ${e.message}`)
                }
            }

        } finally {
            // Always disconnect
            await localPrisma.$disconnect()
            await remotePrisma.$disconnect()
        }

        const summary = `Synced: ${stats.companies} companies, ${stats.stores} stores, ${stats.users} users, ${stats.categories} categories, ${stats.products} products, ${stats.addons} addons, ${stats.tables} tables, ${stats.orders} orders.`

        if (stats.errors.length > 0) {
            return {
                success: true,
                message: summary,
                warnings: `${stats.errors.length} errors occurred`,
                errors: stats.errors.slice(0, 10) // Return first 10 errors
            }
        }

        return { success: true, message: summary }

    } catch (error: any) {
        console.error("Sync Local to Remote Error:", error)
        return { error: "Failed to sync: " + error.message }
    }
}

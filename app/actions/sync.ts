'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import path from "path"
import fs from "fs"
import os from "os"

/**
 * Sync offline SQLite data (from Electron) to Online Cloud DB
 */
export async function syncOfflineData() {
    const user = await getUserProfile()

    // Authorization check
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BUSINESS_OWNER')) {
        return { error: "Unauthorized" }
    }

    try {
        // 1. Locate pos.db
        // Electron stores data in AppData/Roaming/<AppName>
        // We need to find it relative to the user's home dir
        const homeDir = os.homedir()

        // Common paths to check
        const candidatePaths = [
            path.join(homeDir, 'AppData', 'Roaming', 'techsonance-pos', 'pos.db'), // Windows Production
            path.join(homeDir, 'AppData', 'Roaming', 'Electron', 'pos.db'),        // Electron Dev
            path.join(process.cwd(), 'pos.db'),                                    // App Root (sometimes)
        ]

        let dbPath = ''
        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                dbPath = p
                break
            }
        }

        if (!dbPath) {
            return { error: "Could not find offline database (pos.db). are you running in Electron?" }
        }

        console.log("Found offline DB at:", dbPath)

        // 2. Open SQLite DB
        // We use dynamic require to avoid bundling issues if better-sqlite3 isn't available in server env
        let db;
        try {
            const Database = require('better-sqlite3')
            db = new Database(dbPath, { readonly: true })
        } catch (e: any) {
            console.error("Failed to load better-sqlite3:", e)
            return { error: "Failed to load SQLite driver. Ensure better-sqlite3 is installed." }
        }

        // 3. Read Data
        const categories = db.prepare('SELECT * FROM categories').all()
        const products = db.prepare('SELECT * FROM products').all()

        // 4. Sycn to Prisma (Online)
        // We assume valid prisma connection (ONLINE_DATABASE_URL or DATABASE_URL_PROD)

        // Determine store to sync to
        // If user has a store, use it. Otherwise fail safely.
        const storeId = user.defaultStoreId || (user.stores && user.stores.length > 0 ? user.stores[0].id : null)

        if (!storeId) {
            return { error: "No target store found for this user. Cannot sync products without a store." }
        }

        let stats = { categories: 0, products: 0 }

        // Sync Categories
        for (const cat of categories) {
            // Upsert Category
            // We match by name+storeId if id doesn't match? Or just use name?
            // SQLite IDs might be different. Let's assume we want to match by Name for now if ID is UUID.
            // If SQLite IDs are UUIDs, we can try to use them.

            await prisma.category.upsert({
                where: { id: cat.id || 'unknown' }, // Fallback if id missing
                create: {
                    id: cat.id,
                    name: cat.name,
                    image: cat.image,
                    sortOrder: cat.sortOrder || 0,
                    storeId: storeId
                },
                update: {
                    name: cat.name,
                    image: cat.image,
                    sortOrder: cat.sortOrder || 0
                }
            }).catch(async () => {
                // Fallback: create new if ID conflict or missing (e.g. if ID was integer in sqlite but uuid in pg)
                // Actually upsert requires unique where. 
                // If catch, maybe try finding by name?
                const existing = await prisma.category.findFirst({
                    where: { name: cat.name, storeId }
                })

                if (existing) {
                    await prisma.category.update({
                        where: { id: existing.id },
                        data: { image: cat.image }
                    })
                } else {
                    await prisma.category.create({
                        data: {
                            name: cat.name,
                            image: cat.image,
                            sortOrder: cat.sortOrder || 0,
                            storeId
                        }
                    })
                }
            })
            stats.categories++
        }

        // Sync Products
        for (const prod of products) {
            // We need to resolve categoryId from SQLite to Postgres
            // Postgres Category ID might depend on what we just inserted.

            // Find category in Postgres by Name (from SQLite)
            const sqliteCategory = categories.find((c: any) => c.id === prod.categoryId)
            if (!sqliteCategory) continue // Product has orphan category?

            const pgCategory = await prisma.category.findFirst({
                where: { name: sqliteCategory.name, storeId }
            })

            if (!pgCategory) continue // Should not happen if we just synced categories

            await prisma.product.upsert({
                where: { id: prod.id || 'unknown' },
                create: {
                    id: prod.id,
                    name: prod.name,
                    price: prod.price,
                    image: prod.image,
                    description: prod.description,
                    sortOrder: prod.sortOrder || 0,
                    categoryId: pgCategory.id,
                    // If addons exist?
                },
                update: {
                    name: prod.name,
                    price: prod.price,
                    image: prod.image,
                    description: prod.description,
                    categoryId: pgCategory.id
                }
            }).catch(async () => {
                // Fallback logic similar to category
                await prisma.product.create({
                    data: {
                        name: prod.name,
                        price: prod.price,
                        image: prod.image,
                        description: prod.description,
                        sortOrder: prod.sortOrder || 0,
                        categoryId: pgCategory.id
                    }
                })
            })
            stats.products++
        }

        db.close()
        return { success: true, message: `Synced ${stats.categories} categories and ${stats.products} products.` }

    } catch (error: any) {
        console.error("Sync Offline Data Error:", error)
        return { error: "Failed to sync offline data: " + error.message }
    }
}

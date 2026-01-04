'use server'

import { getCategories, getProducts } from "./menu"
import { getBusinessSettings } from "./settings"
import { getUserStoreDetails } from "./user"
import { getUserProfile } from "./user"
import { getRecentOrders } from "./orders"

export async function getPOSInitialData() {
    // Check auth once
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) {
        return null
    }

    // Run all fetches in parallel on the server
    // Note: getProducts and getCategories also check store internally, 
    // but the overhead is minimal compared to network RTT.
    // We could optimize them to accept storeId, but let's stick to public API for now.

    try {
        const [categories, products, settings, store] = await Promise.all([
            getCategories(),
            getProducts('all'),
            getBusinessSettings(),
            getUserStoreDetails()
        ])

        return {
            categories,
            products: products.map((p: any) => ({
                ...p,
                image: p.image || undefined
            })),
            businessDetails: settings,
            storeDetails: store
        }
    } catch (error) {
        console.error("Failed to fetch POS initial data", error)
        return null
    }
}

// Aggregate function for Recent Orders page
export async function getRecentOrdersPageData() {
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) {
        return null
    }

    try {
        const [orders, settings, store] = await Promise.all([
            getRecentOrders(),
            getBusinessSettings(),
            getUserStoreDetails()
        ])

        return { orders, businessDetails: settings, storeDetails: store }
    } catch (error) {
        console.error("Failed to fetch Recent Orders page data", error)
        return null
    }
}

// Aggregate function for Menu Management page
export async function getMenuPageData() {
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) {
        return null
    }

    try {
        // Fetch categories first (needed to know first category ID)
        const categories = await getCategories(true) // includeInactive = true for management

        // If categories exist, fetch first category's products in parallel
        const firstCategoryId = categories.length > 0 ? categories[0].id : null
        const products = firstCategoryId
            ? await getProducts(firstCategoryId, true) // includeUnavailable = true
            : []

        return {
            categories,
            products,
            firstCategoryId
        }
    } catch (error) {
        console.error("Failed to fetch Menu page data", error)
        return null
    }
}

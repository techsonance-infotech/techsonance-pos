'use server'

import { getCategories, getProducts } from "./menu"
import { getCompanyBusinessSettings } from "./settings"
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
        const [categories, products, companySettings, store] = await Promise.all([
            getCategories(),
            getProducts('all'),
            getCompanyBusinessSettings(),
            getUserStoreDetails()
        ])

        // Build business details from company settings
        // Now getCompanyBusinessSettings returns merged global tax/discount settings!
        const settings = companySettings.settings ? {
            businessName: companySettings.settings.businessName || '',
            address: companySettings.settings.address || '',
            phone: companySettings.settings.phone || '',
            email: companySettings.settings.email || '',
            logoUrl: companySettings.settings.logoUrl || '',

            // Tax & Discount Settings (mapped)
            gstNo: (companySettings.settings as any).gstNo || '',
            taxRate: (companySettings.settings as any).taxRate || '0',
            taxName: (companySettings.settings as any).taxName || 'Tax',
            showTaxBreakdown: (companySettings.settings as any).showTaxBreakdown === true,
            enableDiscount: (companySettings.settings as any).enableDiscount === true,
            defaultDiscount: (companySettings.settings as any).defaultDiscount || '0',
            discountType: (companySettings.settings as any).discountType || 'FIXED',
            minOrderForDiscount: (companySettings.settings as any).minOrderForDiscount || '0',
            maxDiscount: (companySettings.settings as any).maxDiscount || '0'
        } : {}

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
export async function getRecentOrdersPageData(
    filter?: { search?: string, status?: string, date?: string, page?: number }
) {
    const user = await getUserProfile()
    if (!user || !user.defaultStoreId) {
        return null
    }

    try {
        const { getFilteredOrders } = await import("./orders")

        const [ordersData, companySettings, store] = await Promise.all([
            getFilteredOrders({ storeId: user.defaultStoreId, ...filter }),
            getCompanyBusinessSettings(),
            getUserStoreDetails()
        ])

        // Build business details from company settings
        const settings = companySettings.settings ? {
            businessName: companySettings.settings.businessName || '',
            address: companySettings.settings.address || '',
            phone: companySettings.settings.phone || '',
            email: companySettings.settings.email || '',
            logoUrl: companySettings.settings.logoUrl || '',
            // Tax & Discount Settings (mapped)
            gstNo: (companySettings.settings as any).gstNo || '',
            taxRate: (companySettings.settings as any).taxRate || '0',
            taxName: (companySettings.settings as any).taxName || 'Tax',
            showTaxBreakdown: (companySettings.settings as any).showTaxBreakdown === true,
            enableDiscount: (companySettings.settings as any).enableDiscount === true,
            defaultDiscount: (companySettings.settings as any).defaultDiscount || '0',
            discountType: (companySettings.settings as any).discountType || 'FIXED',
            minOrderForDiscount: (companySettings.settings as any).minOrderForDiscount || '0',
            maxDiscount: (companySettings.settings as any).maxDiscount || '0'
        } : {}

        return {
            orders: ordersData.orders,
            total: ordersData.total,
            totalPages: ordersData.totalPages,
            currentPage: ordersData.currentPage,
            businessDetails: settings,
            storeDetails: store
        }
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

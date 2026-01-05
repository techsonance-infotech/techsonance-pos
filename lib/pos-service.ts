import { db, LocalOrder, LocalProduct, LocalCategory, LocalSettings } from '@/lib/db';

export interface POSDataService {
    getProducts: () => Promise<LocalProduct[]>;
    getCategories: () => Promise<LocalCategory[]>;
    getSettings: () => Promise<LocalSettings[]>;

    saveOrder: (order: any) => Promise<{ success: boolean; id: string; error?: string }>;

    // Sync
    getPendingOrders: () => Promise<LocalOrder[]>;
    markOrdersSynced: (ids: string[]) => Promise<void>;

    // Bootstrap
    saveProductsBulk: (products: LocalProduct[]) => Promise<void>;
    saveCategoriesBulk: (categories: LocalCategory[]) => Promise<void>;
    saveSettingsBulk: (settings: LocalSettings[]) => Promise<void>;
}

// ----------------------------------------------------------------------
// 1. Electron Service (Desktop)
// ----------------------------------------------------------------------
const electronService: POSDataService = {
    getProducts: async () => {
        return await (window as any).electron.getProducts();
    },
    getCategories: async () => {
        return await (window as any).electron.getCategories();
    },
    getSettings: async () => {
        return await (window as any).electron.getSettings() || [];
    },
    saveOrder: async (order) => {
        return await (window as any).electron.saveOrder(order);
    },
    getPendingOrders: async () => {
        const res = await (window as any).electron.getPendingOrders();
        return res ? res.pending : [];
    },
    markOrdersSynced: async (ids) => {
        await (window as any).electron.markOrdersSynced(ids);
    },
    saveProductsBulk: async (products) => {
        await (window as any).electron.saveProductsBulk(products);
    },
    saveCategoriesBulk: async (categories) => {
        await (window as any).electron.saveCategoriesBulk(categories);
    },
    saveSettingsBulk: async (settings) => {
        await (window as any).electron.saveSettingsBulk(settings);
    }
};

// ----------------------------------------------------------------------
// 2. Dexie Service (Web)
// ----------------------------------------------------------------------
const dexieService: POSDataService = {
    getProducts: async () => {
        return await db.products.orderBy('sortOrder').toArray();
    },
    getCategories: async () => {
        return await db.categories.orderBy('sortOrder').toArray();
    },
    getSettings: async () => {
        return await db.settings.toArray();
    },
    saveOrder: async (order) => {
        try {
            await db.orders.put(order);
            return { success: true, id: order.id };
        } catch (e) {
            console.error(e);
            return { success: false, id: order.id, error: String(e) };
        }
    },
    getPendingOrders: async () => {
        return await db.orders.where('status').equals('PENDING_SYNC').toArray();
    },
    markOrdersSynced: async (ids) => {
        await db.transaction('rw', db.orders, async () => {
            // In Dexie we usually update one by one or bulkUpdate if available but simple loop is fine
            for (const id of ids) {
                await db.orders.update(id, { status: 'SYNCED', syncedAt: Date.now() });
            }
        });
    },
    saveProductsBulk: async (products) => {
        await db.transaction('rw', db.products, async () => {
            await db.products.clear();
            await db.products.bulkPut(products);
        });
    },
    saveCategoriesBulk: async (categories) => {
        await db.transaction('rw', db.categories, async () => {
            await db.categories.clear();
            await db.categories.bulkPut(categories);
        });
    },
    saveSettingsBulk: async (settings) => {
        await db.transaction('rw', db.settings, async () => {
            await db.settings.clear();
            await db.settings.bulkPut(settings);
        });
    }
};

// ----------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------
export function getPOSService(): POSDataService {
    if (typeof window !== 'undefined' && 'electron' in window) {
        console.log("Using Electron POS Service")
        return electronService;
    }
    console.log("Using Dexie POS Service")
    return dexieService;
}

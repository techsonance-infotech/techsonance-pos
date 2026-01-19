import { db, LocalOrder, LocalProduct, LocalCategory, LocalSettings, LocalTable } from '@/lib/db';

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

    // Orders (Offline Cache)
    getRecentOrders: () => Promise<LocalOrder[]>;
    getHeldOrders: () => Promise<LocalOrder[]>;
    getOrder: (id: string) => Promise<LocalOrder | undefined>;
    saveOrdersBulk: (orders: LocalOrder[]) => Promise<void>;

    // Tables (Offline Cache)
    getTables: () => Promise<LocalTable[]>;
    saveTablesBulk: (tables: LocalTable[]) => Promise<void>;
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
    },
    getRecentOrders: async () => {
        // Placeholder for electron
        return [];
    },
    getHeldOrders: async () => {
        // Placeholder for electron
        return [];
    },
    getOrder: async (id) => {
        // Placeholder for electron
        return undefined;
    },
    saveOrdersBulk: async (orders) => {
        // Placeholder for electron
    },
    getTables: async () => {
        // Placeholder for electron
        return [];
    },
    saveTablesBulk: async (tables) => {
        // Placeholder for electron
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
    },

    // New: Get Recent Orders (Cached/Offline) - COMPLETED orders
    getRecentOrders: async () => {
        // Return COMPLETED orders (either synced or originalStatus === COMPLETED)
        return await db.orders
            .filter(o => o.originalStatus === 'COMPLETED' || o.status === 'SYNCED')
            .reverse()
            .limit(50)
            .toArray();
    },

    // New: Get Held Orders (Cached/Offline) - HELD orders
    getHeldOrders: async () => {
        // Return HELD orders that are either pending sync or already synced but still HELD
        return await db.orders
            .filter(o => o.originalStatus === 'HELD')
            .reverse()
            .toArray();
    },

    // New: Get Single Order (for Resume)
    getOrder: async (id: string) => {
        return await db.orders.get(id);
    },

    // New: Bulk save orders from server (for caching)
    saveOrdersBulk: async (orders) => {
        await db.transaction('rw', db.orders, async () => {
            // Don't clear - we may have pending orders. Just update/add.
            await db.orders.bulkPut(orders);
        });
    },

    // New: Get Tables
    getTables: async () => {
        return await db.posTables.toArray();
    },

    // New: Bulk save tables from server
    saveTablesBulk: async (tables) => {
        await db.transaction('rw', db.posTables, async () => {
            await db.posTables.clear();
            await db.posTables.bulkPut(tables);
        });
    }
};

// ----------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------
export function getPOSService(): POSDataService {
    // We now share the same logic for Web and Deskop (Postgres + Dexie Offline Support)
    if (typeof window !== 'undefined' && 'electron' in window) {
        console.log("Using Electron POS Service")
        return electronService;
    }
    console.log("Using Dexie POS Service (Universal)")
    return dexieService;
}

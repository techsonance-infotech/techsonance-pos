
import Dexie, { Table } from 'dexie';

// Define interfaces for local data
export interface LocalOrder {
    id: string; // UUID
    kotNo: string;
    items: any[];
    totalAmount: number;
    paymentMode: string;
    customerName?: string;
    customerMobile?: string;
    tableId?: string;
    tableName?: string;
    createdAt: number; // Timestamp
    status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
    syncedAt?: number;
    error?: string; // For failed sync attempts
}

export interface LocalProduct {
    id: string;
    name: string;
    price: number;
    categoryId: string;
    description?: string;
    image?: string;
    isAvailable: boolean;
    sortOrder: number;
    addons?: any[];
}

export interface LocalCategory {
    id: string;
    name: string;
    sortOrder: number;
    image?: string;
}

export interface LocalSettings {
    key: string;
    value: any;
}

export class POSDatabase extends Dexie {
    orders!: Table<LocalOrder>;
    products!: Table<LocalProduct>;
    categories!: Table<LocalCategory>;
    settings!: Table<LocalSettings>;

    constructor() {
        super('TechSonancePOS');

        // Schema versioning - v2: Added sortOrder index to products
        this.version(2).stores({
            orders: 'id, status, createdAt, customerMobile', // Indexes
            products: 'id, categoryId, name, sortOrder',
            categories: 'id, sortOrder',
            settings: 'key'
        });
    }
}

export const db = new POSDatabase();

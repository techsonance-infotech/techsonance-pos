
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
    status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED' | 'CANCELLED';
    originalStatus: 'HELD' | 'COMPLETED' | 'CANCELLED'; // The actual order status to use when syncing
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

export interface LocalTable {
    id: string;
    name: string;
    capacity?: number;
    status: string; // 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
    orderId?: string;
    heldOrderId?: string;
    heldOrderCreatedAt?: string;
}

export class POSDatabase extends Dexie {
    orders!: Table<LocalOrder>;
    products!: Table<LocalProduct>;
    categories!: Table<LocalCategory>;
    settings!: Table<LocalSettings>;
    posTables!: Table<LocalTable>; // Renamed to avoid conflict with Dexie.tables

    constructor() {
        super('SyncServePOS');

        // Schema versioning - v3: Added tables
        this.version(3).stores({
            orders: 'id, status, originalStatus, createdAt, customerMobile', // Added originalStatus index
            products: 'id, categoryId, name, sortOrder',
            categories: 'id, sortOrder',
            settings: 'key',
            posTables: 'id, status' // Renamed table
        });
    }
}

export const db = new POSDatabase();

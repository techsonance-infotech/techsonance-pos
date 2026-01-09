const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'pos.db');
const db = new Database(dbPath);

// Run database migrations
function runMigrations() {
    console.log('Running database migrations...');

    try {
        // Check if taxAmount column exists in orders table
        const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
        const hasTaxAmount = tableInfo.some((col: any) => col.name === 'taxAmount');
        const hasDiscountAmount = tableInfo.some((col: any) => col.name === 'discountAmount');

        // Migration 1: Add taxAmount column if it doesn't exist
        if (!hasTaxAmount) {
            console.log('Adding taxAmount column to orders table...');
            db.exec('ALTER TABLE orders ADD COLUMN taxAmount REAL DEFAULT 0');
            console.log('✓ taxAmount column added');
        }

        // Migration 2: Add discountAmount column if it doesn't exist
        if (!hasDiscountAmount) {
            console.log('Adding discountAmount column to orders table...');
            db.exec('ALTER TABLE orders ADD COLUMN discountAmount REAL DEFAULT 0');
            console.log('✓ discountAmount column added');
        }

        if (hasTaxAmount && hasDiscountAmount) {
            console.log('✓ Database schema is up to date');
        }
    } catch (error) {
        console.error('Migration error:', error);
        // Don't throw - allow app to continue even if migration fails
    }
}

// Initialize Schema
export function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            image TEXT,
            sortOrder INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            image TEXT,
            categoryId TEXT,
            sortOrder INTEGER DEFAULT 0,
            addons TEXT, -- JSON
            FOREIGN KEY(categoryId) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            kotNo TEXT,
            customerName TEXT,
            customerMobile TEXT,
            tableId TEXT,
            tableName TEXT,
            status TEXT,
            paymentMode TEXT,
            totalAmount REAL NOT NULL,
            taxAmount REAL DEFAULT 0,
            discountAmount REAL DEFAULT 0,
            items TEXT NOT NULL, -- JSON
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);
    console.log("Database Initialized at " + dbPath);

    // Run migrations after initialization
    runMigrations();
}

// Data Access Object
export const dbAsync = {
    // Products & Categories
    getProducts: () => {
        const stmt = db.prepare('SELECT * FROM products ORDER BY sortOrder ASC');
        return stmt.all().map((p: any) => ({ ...p, addons: p.addons ? JSON.parse(p.addons) : [] }));
    },

    getCategories: () => {
        const stmt = db.prepare('SELECT * FROM categories ORDER BY sortOrder ASC');
        return stmt.all();
    },

    saveProductsBulk: (products: any[]) => {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO products (id, name, price, description, image, categoryId, sortOrder, addons)
            VALUES (@id, @name, @price, @description, @image, @categoryId, @sortOrder, @addons)
        `);
        const insertMany = db.transaction((probjs: any[]) => {
            for (const p of probjs) insert.run({ ...p, addons: JSON.stringify(p.addons || []) });
        });
        insertMany(products);
    },

    saveCategoriesBulk: (categories: any[]) => {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO categories (id, name, image, sortOrder)
            VALUES (@id, @name, @image, @sortOrder)
        `);
        const insertMany = db.transaction((cats: any[]) => {
            for (const c of cats) insert.run(c);
        });
        insertMany(categories);
    },

    // Settings
    getSettings: () => {
        const stmt = db.prepare('SELECT * FROM settings');
        return stmt.all();
    },

    saveSettingsBulk: (settings: any[]) => {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (@key, @value)
        `);
        const insertMany = db.transaction((sets: any[]) => {
            for (const s of sets) insert.run(s);
        });
        insertMany(settings);
    },

    // Orders
    saveOrder: (order: any) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO orders (id, kotNo, customerName, customerMobile, tableId, tableName, status, paymentMode, totalAmount, taxAmount, discountAmount, items, createdAt, synced)
            VALUES (@id, @kotNo, @customerName, @customerMobile, @tableId, @tableName, @status, @paymentMode, @totalAmount, @taxAmount, @discountAmount, @items, @createdAt, 0)
        `);

        const info = stmt.run({
            ...order,
            taxAmount: order.taxAmount || 0,
            discountAmount: order.discountAmount || 0,
            items: JSON.stringify(order.items),
            createdAt: order.createdAt || new Date().toISOString()
        });
        return { success: true, changes: info.changes };
    },

    getPendingOrders: () => {
        const stmt = db.prepare("SELECT * FROM orders WHERE synced = 0");
        return stmt.all().map((o: any) => ({ ...o, items: JSON.parse(o.items) }));
    },

    markOrderSynced: (id: string) => {
        const stmt = db.prepare("UPDATE orders SET synced = 1 WHERE id = ?");
        stmt.run(id);
    }
};

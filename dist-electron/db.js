"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbAsync = void 0;
exports.initDB = initDB;
const Database = require('better-sqlite3');
const path = require('path');
// Lazy initialization - db will be created only when initDB is called
let db = null;
let dbPath = '';
// Run database migrations
function runMigrations() {
    if (!db)
        return;
    console.log('Running database migrations...');
    try {
        // Check if taxAmount column exists in orders table
        const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
        const hasTaxAmount = tableInfo.some((col) => col.name === 'taxAmount');
        const hasDiscountAmount = tableInfo.some((col) => col.name === 'discountAmount');
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
    }
    catch (error) {
        console.error('Migration error:', error);
        // Don't throw - allow app to continue even if migration fails
    }
}
// Initialize Schema - call this only from within Electron app context
function initDB() {
    // Lazy import app to avoid issues when module is loaded outside Electron
    const { app } = require('electron');
    if (!db) {
        dbPath = path.join(app.getPath('userData'), 'pos.db');
        console.log('Initializing better-sqlite3 database at:', dbPath);
        db = new Database(dbPath);
    }
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

        CREATE TABLE IF NOT EXISTS tables (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            capacity INTEGER DEFAULT 4,
            status TEXT DEFAULT 'AVAILABLE',
            storeId TEXT,
            sortOrder INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            module TEXT NOT NULL,
            details TEXT,
            userId TEXT,
            ipAddress TEXT,
            userAgent TEXT,
            isSynced INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log("Database Initialized at " + dbPath);
    // Run migrations after initialization
    runMigrations();
}
// Helper to ensure db is initialized before use
function ensureDB() {
    if (!db) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return db;
}
// Data Access Object
exports.dbAsync = {
    // Products & Categories
    getProducts: () => {
        const stmt = ensureDB().prepare('SELECT * FROM products ORDER BY sortOrder ASC');
        return stmt.all().map((p) => ({ ...p, addons: p.addons ? JSON.parse(p.addons) : [] }));
    },
    getCategories: () => {
        const stmt = ensureDB().prepare('SELECT * FROM categories ORDER BY sortOrder ASC');
        return stmt.all();
    },
    saveProductsBulk: (products) => {
        const insert = ensureDB().prepare(`
            INSERT OR REPLACE INTO products (id, name, price, description, image, categoryId, sortOrder, addons)
            VALUES (@id, @name, @price, @description, @image, @categoryId, @sortOrder, @addons)
        `);
        const insertMany = ensureDB().transaction((probjs) => {
            for (const p of probjs) {
                insert.run({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    description: p.description || null,
                    image: p.image || null,
                    categoryId: p.categoryId || null,
                    sortOrder: p.sortOrder || 0,
                    addons: JSON.stringify(p.addons || [])
                });
            }
        });
        insertMany(products);
    },
    saveCategoriesBulk: (categories) => {
        const insert = ensureDB().prepare(`
            INSERT OR REPLACE INTO categories (id, name, image, sortOrder)
            VALUES (@id, @name, @image, @sortOrder)
        `);
        const insertMany = ensureDB().transaction((cats) => {
            for (const c of cats)
                insert.run(c);
        });
        insertMany(categories);
    },
    // Settings
    getSettings: () => {
        const stmt = ensureDB().prepare('SELECT * FROM settings');
        return stmt.all();
    },
    saveSettingsBulk: (settings) => {
        const insert = ensureDB().prepare(`
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (@key, @value)
        `);
        const insertMany = ensureDB().transaction((sets) => {
            for (const s of sets) {
                insert.run({
                    key: s.key,
                    value: (typeof s.value === 'string' ? s.value : JSON.stringify(s.value)) || null
                });
            }
        });
        insertMany(settings);
    },
    // Orders
    saveOrder: (order) => {
        const stmt = ensureDB().prepare(`
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
        const stmt = ensureDB().prepare("SELECT * FROM orders WHERE synced = 0");
        return stmt.all().map((o) => ({ ...o, items: JSON.parse(o.items) }));
    },
    markOrderSynced: (id) => {
        const stmt = ensureDB().prepare("UPDATE orders SET synced = 1 WHERE id = ?");
        stmt.run(id);
    },
    // Tables
    getTables: () => {
        const stmt = ensureDB().prepare('SELECT * FROM tables ORDER BY sortOrder ASC');
        return stmt.all();
    },
    saveTablesBulk: (tables) => {
        const insert = ensureDB().prepare(`
            INSERT OR REPLACE INTO tables (id, name, capacity, status, storeId, sortOrder)
            VALUES (@id, @name, @capacity, @status, @storeId, @sortOrder)
        `);
        const insertMany = ensureDB().transaction((tbls) => {
            for (const t of tbls)
                insert.run(t);
        });
        insertMany(tables);
    },
    // Activity Logs (Local storage - no MongoDB needed for desktop)
    saveActivityLog: (log) => {
        const stmt = ensureDB().prepare(`
            INSERT INTO activity_logs (id, action, module, details, userId, ipAddress, userAgent, isSynced, createdAt)
            VALUES (@id, @action, @module, @details, @userId, @ipAddress, @userAgent, 0, @createdAt)
        `);
        const info = stmt.run({
            id: log.id || require('crypto').randomUUID(),
            action: log.action,
            module: log.module,
            details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
            userId: log.userId || null,
            ipAddress: log.ipAddress || 'local',
            userAgent: log.userAgent || 'Electron',
            createdAt: log.createdAt || new Date().toISOString()
        });
        return { success: true, changes: info.changes };
    },
    getActivityLogs: (limit = 100) => {
        const stmt = ensureDB().prepare('SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ?');
        return stmt.all(limit);
    },
    getUnsyncedLogs: () => {
        const stmt = ensureDB().prepare('SELECT * FROM activity_logs WHERE isSynced = 0');
        return stmt.all();
    },
    markLogsSynced: (ids) => {
        const stmt = ensureDB().prepare('UPDATE activity_logs SET isSynced = 1 WHERE id = ?');
        for (const id of ids) {
            stmt.run(id);
        }
    }
};

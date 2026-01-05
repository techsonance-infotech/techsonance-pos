import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDB, dbAsync } from './db';

// Determine env
const isDev = !app.isPackaged;
const PORT = 3000;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // security
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
    });

    if (isDev) {
        mainWindow.loadURL(`http://localhost:${PORT}`);
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Initialize DB
    initDB();
    console.log("Electron App Ready & DB Initialized");

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('db-get-products', async () => {
    try {
        return dbAsync.getProducts();
    } catch (e) {
        console.error("IPC Error: db-get-products", e);
        return [];
    }
});

ipcMain.handle('db-get-categories', async () => {
    try {
        return dbAsync.getCategories();
    } catch (e) {
        console.error("IPC Error: db-get-categories", e);
        return [];
    }
});

ipcMain.handle('db-save-order', async (event: any, order: any) => {
    try {
        const result = dbAsync.saveOrder(order);
        return { id: order.id, ...result };
    } catch (e) {
        console.error("IPC Error: db-save-order", e);
        return { success: false, error: String(e) };
    }
});

ipcMain.handle('sync-orders', async () => {
    try {
        const pending = dbAsync.getPendingOrders();
        // The actual upload happens in Renderer (easier for Auth/Cookies)
        // or here if we pass tokens. 
        // For this plan: We return the pending items to renderer, renderer uploads, then renderer calls "markSynced".
        return { pending };
    } catch (e) {
        console.error("IPC Error: sync-orders", e);
        return { pending: [] };
    }
});

ipcMain.handle('db-mark-synced', async (evt: any, ids: string[]) => {
    for (const id of ids) {
        dbAsync.markOrderSynced(id);
    }
    return true;
});

ipcMain.handle('db-save-products-bulk', async (evt: any, products: any[]) => {
    dbAsync.saveProductsBulk(products);
    return true;
});

ipcMain.handle('db-save-categories-bulk', async (evt: any, categories: any[]) => {
    dbAsync.saveCategoriesBulk(categories);
    return true;
});

ipcMain.handle('db-save-settings-bulk', async (evt: any, settings: any[]) => {
    dbAsync.saveSettingsBulk(settings);
    return true;
});

ipcMain.handle('db-get-settings', async () => {
    try {
        return dbAsync.getSettings();
    } catch (e) {
        console.error("IPC Error: db-get-settings", e);
        return [];
    }
});

ipcMain.handle('get-machine-id', () => {
    // simplified machine id
    return 'DESKTOP-POS-01';
});

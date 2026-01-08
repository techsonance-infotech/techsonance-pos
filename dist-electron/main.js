const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDB, dbAsync } = require('./db');
const { spawn } = require('child_process');
// Determine env
const isDev = !app.isPackaged;
const PORT = 3000;
let mainWindow = null;
let nextServerProcess = null;
function startNextServer() {
    return new Promise((resolve, reject) => {
        if (isDev) {
            // In dev mode, assume Next.js is already running
            resolve();
            return;
        }
        console.log('Starting Next.js production server...');
        // Get the path to the Next.js app
        const appPath = path.join(__dirname, '..');
        // Start Next.js using npx
        nextServerProcess = spawn('npx', ['next', 'start', '-p', PORT.toString()], {
            cwd: appPath,
            shell: true,
            stdio: 'pipe'
        });
        nextServerProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Next.js]', output);
            if (output.includes('Ready') || output.includes('started')) {
                resolve();
            }
        });
        nextServerProcess.stderr.on('data', (data) => {
            console.error('[Next.js Error]', data.toString());
        });
        nextServerProcess.on('error', (err) => {
            console.error('Failed to start Next.js server:', err);
            reject(err);
        });
        // Timeout fallback - resolve after 10 seconds even if no "Ready" message
        setTimeout(() => {
            console.log('Next.js server startup timeout, proceeding anyway...');
            resolve();
        }, 10000);
    });
}
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
    // Always load from localhost - Next.js server handles both dev and prod
    mainWindow.loadURL(`http://localhost:${PORT}`);
    // Open DevTools in dev mode
    if (isDev) {
        // mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
app.whenReady().then(async () => {
    // Initialize DB
    initDB();
    console.log("Electron App Ready & DB Initialized");
    // Start Next.js server (only in production)
    try {
        await startNextServer();
    }
    catch (err) {
        console.error('Failed to start Next.js server:', err);
    }
    // Wait a bit for server to be fully ready
    if (!isDev) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on('window-all-closed', () => {
    // Kill Next.js server on quit
    if (nextServerProcess) {
        nextServerProcess.kill();
    }
    if (process.platform !== 'darwin')
        app.quit();
});
app.on('before-quit', () => {
    // Kill Next.js server
    if (nextServerProcess) {
        nextServerProcess.kill();
    }
});
// --- IPC Handlers ---
ipcMain.handle('db-get-products', async () => {
    try {
        return dbAsync.getProducts();
    }
    catch (e) {
        console.error("IPC Error: db-get-products", e);
        return [];
    }
});
ipcMain.handle('db-get-categories', async () => {
    try {
        return dbAsync.getCategories();
    }
    catch (e) {
        console.error("IPC Error: db-get-categories", e);
        return [];
    }
});
ipcMain.handle('db-save-order', async (event, order) => {
    try {
        const result = dbAsync.saveOrder(order);
        return { id: order.id, ...result };
    }
    catch (e) {
        console.error("IPC Error: db-save-order", e);
        return { success: false, error: String(e) };
    }
});
ipcMain.handle('sync-orders', async () => {
    try {
        const pending = dbAsync.getPendingOrders();
        return { pending };
    }
    catch (e) {
        console.error("IPC Error: sync-orders", e);
        return { pending: [] };
    }
});
ipcMain.handle('db-mark-synced', async (evt, ids) => {
    for (const id of ids) {
        dbAsync.markOrderSynced(id);
    }
    return true;
});
ipcMain.handle('db-save-products-bulk', async (evt, products) => {
    dbAsync.saveProductsBulk(products);
    return true;
});
ipcMain.handle('db-save-categories-bulk', async (evt, categories) => {
    dbAsync.saveCategoriesBulk(categories);
    return true;
});
ipcMain.handle('db-save-settings-bulk', async (evt, settings) => {
    dbAsync.saveSettingsBulk(settings);
    return true;
});
ipcMain.handle('db-get-settings', async () => {
    try {
        return dbAsync.getSettings();
    }
    catch (e) {
        console.error("IPC Error: db-get-settings", e);
        return [];
    }
});
ipcMain.handle('get-machine-id', () => {
    return 'DESKTOP-POS-01';
});

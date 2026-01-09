const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDB, dbAsync } = require('./db');
const { fork } = require('child_process');
// Determine env
const forceProd = (process.env.FORCE_PROD || '').trim() === 'true';
const isDev = !app.isPackaged && !forceProd;
const PORT = 3000;
console.log('Environment Debug:', {
    FORCE_PROD: process.env.FORCE_PROD,
    forceProdParsed: forceProd,
    isPackaged: app.isPackaged,
    isDev
});
let mainWindow = null;
let nextServerProcess = null;
// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}
else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    function startNextServer() {
        return new Promise((resolve, reject) => {
            if (isDev) {
                resolve();
                return;
            }
            console.log('Starting Next.js standalone server...');
            // Path to the standalone server.js
            const serverPath = app.isPackaged
                ? path.join(process.resourcesPath, 'standalone', 'server.js')
                : path.join(__dirname, '../.next/standalone/server.js');
            console.log('Server path:', serverPath);
            const nodePath = process.execPath; // Use electron's node or system node? 
            // Electron's node might not work well for full server. 
            // Best practice is bundling a node executable or using 'fork' if compatible.
            // For simplicity, let's try 'fork' which uses Electron's Node capability.
            // Or if we assume user has Node (bad assumption).
            // A better approach for standalone: simply fork the process.
            // Use fork instead of spawn. 
            // fork() uses the V8 instance of the parent process (Electron's Node) 
            // which effectively behaves like running 'node server.js'
            nextServerProcess = fork(serverPath, [], {
                env: { ...process.env, PORT: PORT.toString(), HOSTNAME: 'localhost' },
                stdio: 'pipe'
            });
            nextServerProcess.stdout.on('data', (data) => {
                console.log('[Next.js]', data.toString());
                if (data.toString().includes('Listening') || data.toString().includes('Ready')) {
                    resolve();
                }
            });
            nextServerProcess.stderr.on('data', (data) => {
                console.error('[Next.js Error]', data.toString());
            });
            // Resolve after timeout just in case "Listening" isn't caught
            setTimeout(resolve, 5000);
        });
    }
    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
            },
            autoHideMenuBar: true,
        });
        const loadURL = () => {
            mainWindow.loadURL(`http://localhost:${PORT}`).catch((err) => {
                console.log(`Server not ready, retrying... (${err.code})`);
                setTimeout(loadURL, 1000);
            });
        };
        // In both dev and prod, we load from localhost now (since we run a local server)
        loadURL();
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
        console.log("Electron App Ready");
        try {
            await startNextServer();
        }
        catch (e) {
            console.error("Failed to start server", e);
        }
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
    });
    app.on('window-all-closed', () => {
        if (nextServerProcess)
            nextServerProcess.kill();
        if (process.platform !== 'darwin')
            app.quit();
    });
    app.on('before-quit', () => {
        if (nextServerProcess)
            nextServerProcess.kill();
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
    // Silent Printing Handler
    ipcMain.handle('print-receipt', async (event, htmlContent) => {
        try {
            const printWindow = new BrowserWindow({
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });
            await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 500));
            // Print silently
            printWindow.webContents.print({
                silent: true,
                printBackground: false,
                deviceName: '' // Uses default printer
            }, (success, errorType) => {
                if (!success)
                    console.error("Print failed:", errorType);
                printWindow.close();
            });
            return { success: true };
        }
        catch (e) {
            console.error("Print Error:", e);
            return { success: false, error: String(e) };
        }
    });
    ipcMain.handle('get-machine-id', () => {
        return 'DESKTOP-POS-01';
    });
} // End Single Instance Lock

// Guard: Exit early if not running in Electron context
// This prevents errors when the file is loaded during compilation checks
const electron = require('electron');
if (!electron || !electron.app) {
    console.log('Not running in Electron context, skipping main process initialization');
    module.exports = {};
}
else {
    const { app, BrowserWindow, ipcMain } = electron;
    // IMPORTANT: Always set the app name to match the 'productName' in package.json
    // and the hardcoded path in scripts/init-electron-db.js
    // This ensures userData path is consistent: ~/Library/Application Support/SyncServe POS
    app.setName('SyncServe POS');
    const path = require('path');
    const { fork } = require('child_process');
    // These will be initialized when app is ready
    let mainWindow = null;
    let nextServerProcess = null;
    let isDev = false;
    let sqliteDbPath = '';
    const PORT = 3000;
    // Logging setup
    const fs = require('fs');
    const os = require('os');
    const logPath = path.join(os.homedir(), 'desktop-debug.log');
    function logToFile(message, data) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
        try {
            fs.appendFileSync(logPath, logLine);
            // Also log to console for dev
            console.log(message, data || '');
        }
        catch (e) {
            console.error('Failed to write to log file', e);
        }
    }
    // Global Error Handlers
    process.on('uncaughtException', (error) => {
        logToFile('CRITICAL: Uncaught Exception:', {
            message: error.message,
            stack: error.stack
        });
    });
    process.on('unhandledRejection', (reason) => {
        logToFile('CRITICAL: Unhandled Rejection:', {
            reason: reason?.message || reason,
            stack: reason?.stack
        });
    });
    logToFile('--- App Starting ---');
    // Determine env - must be done after app is available
    function initializeEnvironment() {
        const forceProd = (process.env.FORCE_PROD || '').trim() === 'true';
        isDev = !app.isPackaged && !forceProd;
        // Set SQLite database path for ALL modes (dev and prod)
        const userDataPath = app.getPath('userData');
        sqliteDbPath = `file:${path.join(userDataPath, 'pos.db')}`;
        // Override environment variables to force SQLite mode
        process.env.DATABASE_URL = sqliteDbPath;
        process.env.SQLITE_DATABASE_URL = sqliteDbPath;
        process.env.IS_ELECTRON = 'true';
        // IMPORTANT: Fix PATH for production to find node/npm if needed (rarely needed for standalone but good safety)
        if (app.isPackaged) {
            try {
                // Dynamically import or require depending on context (Electron is node-like CJS here usually)
                const fixPath = require('fix-path');
                // Check if it's a function or has a default property (ESM interop)
                if (typeof fixPath === 'function') {
                    fixPath();
                }
                else if (fixPath && typeof fixPath.default === 'function') {
                    fixPath.default();
                }
                else {
                    logToFile('WARNING: fix-path module loaded but export structure is unexpected', typeof fixPath);
                }
            }
            catch (e) {
                // Swallow error to prevent crash - app can likely function without this in most cases
                logToFile('WARNING: Failed to run fix-path', e);
            }
        }
        logToFile('Environment Debug:', {
            FORCE_PROD: process.env.FORCE_PROD,
            forceProdParsed: forceProd,
            isPackaged: app.isPackaged,
            isDev,
            userDataPath,
            DATABASE_URL: sqliteDbPath,
            resourcePath: process.resourcesPath,
            appPath: app.getAppPath()
        });
    }
    function startNextServer() {
        return new Promise((resolve, reject) => {
            if (isDev) {
                resolve();
                return;
            }
            logToFile('Starting Next.js standalone server...');
            // Correctly resolve paths for packaged vs development
            const resourcesPath = process.resourcesPath;
            const serverPath = app.isPackaged
                ? path.join(resourcesPath, 'standalone', 'server.js')
                : path.join(__dirname, '../.next/standalone/server.js');
            const serverCwd = app.isPackaged
                ? path.join(resourcesPath, 'standalone')
                : path.join(__dirname, '../.next/standalone');
            logToFile('Server Config:', {
                serverPath,
                serverCwd
            });
            // Verify server.js exists
            const fs = require('fs');
            if (!fs.existsSync(serverPath)) {
                logToFile('ERROR: Server file not found at ' + serverPath);
                reject(new Error(`Server not found at ${serverPath}`));
                return;
            }
            // Load .env file from standalone folder
            const envPath = path.join(serverCwd, '.env');
            let envVars = {};
            if (fs.existsSync(envPath)) {
                logToFile('Loading .env from:', envPath);
                try {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    envContent.split('\n').forEach((line) => {
                        const trimmed = line.trim();
                        // Skip comments and empty lines
                        if (!trimmed || trimmed.startsWith('#'))
                            return;
                        const [key, ...valueParts] = trimmed.split('=');
                        if (key && valueParts.length > 0) {
                            let value = valueParts.join('=');
                            // Remove quotes if present
                            if ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }
                            envVars[key.trim()] = value;
                        }
                    });
                    logToFile('Loaded env vars keys:', Object.keys(envVars));
                }
                catch (e) {
                    logToFile('Error loading .env:', e.message);
                }
            }
            else {
                logToFile('.env file not found at:', envPath);
            }
            // IMPORTANT: Override DATABASE_URL with the correct absolute path
            logToFile('Using SQLite DB Path:', sqliteDbPath);
            // Log Environment variables being passed to server
            logToFile('Spawning server process with DATABASE_URL:', sqliteDbPath);
            nextServerProcess = fork(serverPath, [], {
                cwd: serverCwd,
                env: {
                    ...process.env,
                    ...envVars,
                    PORT: PORT.toString(),
                    HOSTNAME: 'localhost',
                    // Override DATABASE_URL with the correct absolute path
                    DATABASE_URL: sqliteDbPath,
                    SQLITE_DATABASE_URL: sqliteDbPath,
                    // Mark as desktop mode
                    IS_ELECTRON: 'true'
                },
                stdio: 'pipe'
            });
            let serverStarted = false;
            nextServerProcess.stdout.on('data', (data) => {
                const output = data.toString();
                // logToFile('[Next.js Output]:', output); // Too verbose?
                if (output.includes('Error') || output.includes('error')) {
                    logToFile('[Next.js ERROR LOG]:', output);
                }
                if (!serverStarted && (output.includes('Listening') || output.includes('Ready') || output.includes('started server') || output.includes('localhost:3000'))) {
                    serverStarted = true;
                    logToFile('Next.js server detected as ready');
                    resolve();
                }
            });
            nextServerProcess.stderr.on('data', (data) => {
                logToFile('[Next.js STDERR]:', data.toString());
            });
            nextServerProcess.on('error', (err) => {
                logToFile('Failed to spawn Next.js server:', err);
                if (!serverStarted) {
                    reject(err);
                }
            });
            nextServerProcess.on('exit', (code) => {
                console.log('Next.js server exited with code:', code);
                if (!serverStarted && code !== 0) {
                    reject(new Error(`Server exited with code ${code}`));
                }
            });
            // Fallback: resolve after timeout if server starts but detection fails
            setTimeout(() => {
                if (!serverStarted) {
                    console.warn('Server detection timeout, attempting connection anyway...');
                    serverStarted = true;
                    resolve();
                }
            }, 15000);
        });
    }
    async function createWindow() {
        const url = isDev ? `http://localhost:${PORT}` : `http://localhost:${PORT}`;
        // Wait for server to be accessible with retries
        const maxRetries = 30;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const http = require('http');
                await new Promise((resolve, reject) => {
                    const req = http.get(url, (res) => {
                        if (res.statusCode === 200 || res.statusCode === 304) {
                            resolve();
                        }
                        else {
                            reject(new Error(`Status: ${res.statusCode}`));
                        }
                    });
                    req.on('error', reject);
                    req.setTimeout(2000, () => {
                        req.destroy();
                        reject(new Error('Timeout'));
                    });
                });
                break;
            }
            catch (e) {
                console.log(`Waiting for server... (${i + 1}/${maxRetries}): ${e.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            title: 'SyncServe POS',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        mainWindow.loadURL(url);
        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }
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
        app.whenReady().then(async () => {
            // Initialize environment (sets DATABASE_URL, etc.)
            initializeEnvironment();
            // Ensure DB exists (Copy from template if missing)
            try {
                const fs = require('fs');
                const userDataPath = app.getPath('userData');
                const dbPath = path.join(userDataPath, 'pos.db');
                if (!fs.existsSync(dbPath)) {
                    logToFile('Database file not found. Attempting to copy template...');
                    // Look for template.db in resources
                    // In dev: resources/template.db relative to root? No, dev we use dev.db or just let it be empty?
                    // In prod: process.resourcesPath/template.db
                    let templatePath = '';
                    if (app.isPackaged) {
                        templatePath = path.join(process.resourcesPath, 'template.db');
                    }
                    else {
                        templatePath = path.join(__dirname, '../resources/template.db');
                    }
                    logToFile('Looking for template at:', templatePath);
                    if (fs.existsSync(templatePath)) {
                        fs.copyFileSync(templatePath, dbPath);
                        logToFile('SUCCESS: Copied template.db to pos.db');
                    }
                    else {
                        logToFile('WARNING: Template DB not found. App will start with empty DB (Tables might be missing).');
                    }
                }
                else {
                    logToFile('Database exists at:', dbPath);
                }
            }
            catch (e) {
                logToFile('CRITICAL ERROR: Failed to copy database template', e.message);
            }
            // Initialize DB (lazy load to avoid issues before app is ready)
            const { initDB, dbAsync } = require('./db');
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
            // Register IPC handlers
            registerIPCHandlers(dbAsync);
        });
        app.on('window-all-closed', () => {
            if (nextServerProcess) {
                nextServerProcess.kill();
            }
            if (process.platform !== 'darwin')
                app.quit();
        });
    }
    function registerIPCHandlers(dbAsync) {
        // Data Access Handlers
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
        ipcMain.handle('db-save-order', async (evt, order) => {
            try {
                return dbAsync.saveOrder(order);
            }
            catch (e) {
                console.error("IPC Error: db-save-order", e);
                return { success: false, error: String(e) };
            }
        });
        ipcMain.handle('db-save-products-bulk', async (evt, products) => {
            try {
                dbAsync.saveProductsBulk(products);
                return { success: true };
            }
            catch (e) {
                console.error("IPC Error: db-save-products-bulk", e);
                return { success: false, error: String(e) };
            }
        });
        ipcMain.handle('db-save-categories-bulk', async (evt, categories) => {
            try {
                dbAsync.saveCategoriesBulk(categories);
                return { success: true };
            }
            catch (e) {
                console.error("IPC Error: db-save-categories-bulk", e);
                return { success: false, error: String(e) };
            }
        });
        ipcMain.handle('db-save-settings-bulk', async (evt, settings) => {
            try {
                dbAsync.saveSettingsBulk(settings);
                return { success: true };
            }
            catch (e) {
                console.error("IPC Error: db-save-settings-bulk", e);
                return { success: false, error: String(e) };
            }
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
        ipcMain.handle('db-get-tables', async () => {
            try {
                return dbAsync.getTables();
            }
            catch (e) {
                console.error("IPC Error: db-get-tables", e);
                return [];
            }
        });
        ipcMain.handle('db-save-tables-bulk', async (evt, tables) => {
            try {
                dbAsync.saveTablesBulk(tables);
                return { success: true };
            }
            catch (e) {
                console.error("IPC Error: db-save-tables-bulk", e);
                return { success: false, error: String(e) };
            }
        });
        // Activity Logs IPC Handlers
        ipcMain.handle('db-save-activity-log', async (evt, log) => {
            try {
                return dbAsync.saveActivityLog(log);
            }
            catch (e) {
                console.error("IPC Error: db-save-activity-log", e);
                return { success: false, error: String(e) };
            }
        });
        ipcMain.handle('db-get-activity-logs', async (evt, limit = 100) => {
            try {
                return dbAsync.getActivityLogs(limit);
            }
            catch (e) {
                console.error("IPC Error: db-get-activity-logs", e);
                return [];
            }
        });
        ipcMain.handle('db-get-unsynced-logs', async () => {
            try {
                return dbAsync.getUnsyncedLogs();
            }
            catch (e) {
                console.error("IPC Error: db-get-unsynced-logs", e);
                return [];
            }
        });
        ipcMain.handle('db-mark-logs-synced', async (evt, ids) => {
            try {
                dbAsync.markLogsSynced(ids);
                return { success: true };
            }
            catch (e) {
                console.error("IPC Error: db-mark-logs-synced", e);
                return { success: false, error: String(e) };
            }
        });
        // Sync Orders Handlers
        ipcMain.handle('sync-orders', async () => {
            try {
                return dbAsync.getPendingOrders();
            }
            catch (e) {
                console.error("IPC Error: sync-orders", e);
                return [];
            }
        });
        ipcMain.handle('db-mark-synced', async (evt, ids) => {
            try {
                for (const id of ids) {
                    dbAsync.markOrderSynced(id);
                }
                return { success: true };
            }
            catch (e) {
                console.error("IPC Error: db-mark-synced", e);
                return { success: false, error: String(e) };
            }
        });
        ipcMain.handle('get-printers', async () => {
            try {
                if (mainWindow) {
                    return await mainWindow.webContents.getPrintersAsync();
                }
                return [];
            }
            catch (e) {
                console.error("IPC Error: get-printers", e);
                return [];
            }
        });
        // Silent Printing Handler
        ipcMain.handle('print-receipt', async (event, htmlContent, options = {}) => {
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
                // Print silently (wrapped in Promise)
                return await new Promise((resolve) => {
                    const printOptions = {
                        silent: true,
                        printBackground: false,
                        deviceName: options.printerName || ''
                    };
                    // Add margin settings if provided
                    if (options.margins) {
                        printOptions.margins = options.margins;
                    }
                    printWindow.webContents.print(printOptions, (success, errorType) => {
                        if (!success) {
                            console.error("Print failed:", errorType);
                            printWindow.close();
                            resolve({ success: false, error: errorType });
                        }
                        else {
                            printWindow.close();
                            resolve({ success: true });
                        }
                    });
                });
            }
            catch (e) {
                console.error("Print Error:", e);
                return { success: false, error: String(e) };
            }
        });
        ipcMain.handle('get-machine-id', () => {
            return 'DESKTOP-POS-01';
        });
    }
} // End of Electron context guard

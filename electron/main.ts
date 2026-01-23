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

let mainWindow: any = null;
let nextServerProcess: any = null;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    function startNextServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (isDev) {
                resolve();
                return;
            }

            console.log('Starting Next.js standalone server...');

            // Correctly resolve paths for packaged vs development
            const resourcesPath = (process as any).resourcesPath;
            const serverPath = app.isPackaged
                ? path.join(resourcesPath, 'standalone', 'server.js')
                : path.join(__dirname, '../.next/standalone/server.js');

            const serverCwd = app.isPackaged
                ? path.join(resourcesPath, 'standalone')
                : path.join(__dirname, '../.next/standalone');

            console.log('Server path:', serverPath);
            console.log('Server CWD:', serverCwd);

            // Verify server.js exists
            const fs = require('fs');
            if (!fs.existsSync(serverPath)) {
                console.error('Server file not found:', serverPath);
                reject(new Error(`Server not found at ${serverPath}`));
                return;
            }

            // Load .env file from standalone folder
            const envPath = path.join(serverCwd, '.env');
            let envVars: Record<string, string> = {};
            if (fs.existsSync(envPath)) {
                console.log('Loading .env from:', envPath);
                const envContent = fs.readFileSync(envPath, 'utf8');
                envContent.split('\n').forEach((line: string) => {
                    const trimmed = line.trim();
                    // Skip comments and empty lines
                    if (!trimmed || trimmed.startsWith('#')) return;
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
                console.log('Loaded env vars:', Object.keys(envVars));
            } else {
                console.warn('.env file not found at:', envPath);
            }

            const { spawn } = require('child_process');
            // Use spawn with node executable for better cross-platform support
            // In packaged Electron, process.execPath points to the Electron binary
            // We need to use the bundled Node or fork approach
            nextServerProcess = fork(serverPath, [], {
                cwd: serverCwd,
                env: { ...process.env, ...envVars, PORT: PORT.toString(), HOSTNAME: 'localhost' },
                stdio: 'pipe'
            });

            let serverStarted = false;

            nextServerProcess.stdout.on('data', (data: any) => {
                const output = data.toString();
                console.log('[Next.js]', output);
                if (!serverStarted && (output.includes('Listening') || output.includes('Ready') || output.includes('started server') || output.includes('localhost:3000'))) {
                    serverStarted = true;
                    console.log('Next.js server detected as ready');
                    resolve();
                }
            });

            nextServerProcess.stderr.on('data', (data: any) => {
                console.error('[Next.js Error]', data.toString());
            });

            nextServerProcess.on('error', (err: any) => {
                console.error('Failed to start Next.js server:', err);
                if (!serverStarted) {
                    reject(err);
                }
            });

            nextServerProcess.on('exit', (code: number) => {
                console.log('Next.js server exited with code:', code);
                if (!serverStarted && code !== 0) {
                    reject(new Error(`Server exited with code ${code}`));
                }
            });

            // Fallback: resolve after timeout if server starts but detection fails
            setTimeout(() => {
                if (!serverStarted) {
                    console.warn('Server ready detection timed out, continuing anyway...');
                    serverStarted = true;
                    resolve();
                }
            }, 8000);
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

        let retries = 0;
        const maxRetries = 30; // 30 seconds max wait

        const loadURL = () => {
            mainWindow.loadURL(`http://localhost:${PORT}`).catch((err: any) => {
                retries++;
                if (retries < maxRetries) {
                    console.log(`Server not ready (attempt ${retries}/${maxRetries}), retrying... (${err.code})`);
                    setTimeout(loadURL, 1000);
                } else {
                    console.error('Failed to connect to server after max retries');
                    // Show error page instead of hanging
                    mainWindow.loadURL(`data:text/html,<html><body style="font-family: sans-serif; padding: 40px; text-align: center;"><h1>Failed to start application server</h1><p>Please restart the application.</p><button onclick="location.reload()">Retry</button></body></html>`);
                }
            });
        };

        // In both dev and prod, we load from localhost now (since we run a local server)
        loadURL();

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
        } catch (e) {
            console.error("Failed to start server", e);
        }

        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (nextServerProcess) nextServerProcess.kill();
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('before-quit', () => {
        if (nextServerProcess) nextServerProcess.kill();
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

    ipcMain.handle('db-get-tables', async () => {
        try {
            return dbAsync.getTables();
        } catch (e) {
            console.error("IPC Error: db-get-tables", e);
            return [];
        }
    });

    ipcMain.handle('get-printers', async () => {
        try {
            if (mainWindow) {
                return await mainWindow.webContents.getPrintersAsync();
            }
            return [];
        } catch (e) {
            console.error("IPC Error: get-printers", e);
            return [];
        }
    });

    // Silent Printing Handler
    ipcMain.handle('print-receipt', async (event, htmlContent, options: { printerName?: string; margins?: any } = {}) => {
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
            const printOptions: any = {
                silent: true,
                printBackground: false,
                deviceName: options.printerName || ''
            };

            // Add margin settings if provided
            if (options.margins) {
                printOptions.margins = options.margins;
            }

            printWindow.webContents.print(printOptions, (success, errorType) => {
                if (!success) console.error("Print failed:", errorType);
                printWindow.close();
            });

            return { success: true };
        } catch (e) {
            console.error("Print Error:", e);
            return { success: false, error: String(e) };
        }
    });

    ipcMain.handle('get-machine-id', () => {
        return 'DESKTOP-POS-01';
    });
} // End Single Instance Lock

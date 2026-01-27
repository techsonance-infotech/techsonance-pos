const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // POS Data API
    getProducts: () => ipcRenderer.invoke('db-get-products'),
    getCategories: () => ipcRenderer.invoke('db-get-categories'),
    saveOrder: (order: any) => ipcRenderer.invoke('db-save-order', order),

    // Bulk Data (Bootstrap)
    saveProductsBulk: (products: any[]) => ipcRenderer.invoke('db-save-products-bulk', products),
    saveCategoriesBulk: (categories: any[]) => ipcRenderer.invoke('db-save-categories-bulk', categories),
    saveSettingsBulk: (settings: any[]) => ipcRenderer.invoke('db-save-settings-bulk', settings),
    getSettings: () => ipcRenderer.invoke('db-get-settings'),

    // Tables
    getTables: () => ipcRenderer.invoke('db-get-tables'),
    saveTablesBulk: (tables: any[]) => ipcRenderer.invoke('db-save-tables-bulk', tables),

    // Activity Logs (Local SQLite storage for desktop)
    saveActivityLog: (log: any) => ipcRenderer.invoke('db-save-activity-log', log),
    getActivityLogs: (limit?: number) => ipcRenderer.invoke('db-get-activity-logs', limit),
    getUnsyncedLogs: () => ipcRenderer.invoke('db-get-unsynced-logs'),
    markLogsSynced: (ids: string[]) => ipcRenderer.invoke('db-mark-logs-synced', ids),

    // Sync API
    getPendingOrders: () => ipcRenderer.invoke('sync-orders'),
    markOrdersSynced: (ids: string[]) => ipcRenderer.invoke('db-mark-synced', ids),

    // System API
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    printReceipt: (html: string, options?: any) => ipcRenderer.invoke('print-receipt', html, options),
    isDesktop: true
});

declare global {
    interface Window {
        electron?: {
            isDesktop: boolean;
            getPrinters: () => Promise<any[]>;
            printReceipt: (html: string, options?: any) => Promise<{ success: boolean; error?: string }>;
            // Activity Logs
            saveActivityLog: (log: any) => Promise<any>;
            getActivityLogs: (limit?: number) => Promise<any[]>;
            getUnsyncedLogs: () => Promise<any[]>;
            markLogsSynced: (ids: string[]) => Promise<any>;
            // Tables
            getTables: () => Promise<any[]>;
            saveTablesBulk: (tables: any[]) => Promise<any>;
        }
    }
}

export { };

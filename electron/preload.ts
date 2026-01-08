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

    // Sync API
    getPendingOrders: () => ipcRenderer.invoke('sync-orders'),
    markOrdersSynced: (ids: string[]) => ipcRenderer.invoke('db-mark-synced', ids),

    // System API
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    isDesktop: true
});

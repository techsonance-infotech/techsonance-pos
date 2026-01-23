"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electron', {
    // POS Data API
    getProducts: () => ipcRenderer.invoke('db-get-products'),
    getCategories: () => ipcRenderer.invoke('db-get-categories'),
    saveOrder: (order) => ipcRenderer.invoke('db-save-order', order),
    // Bulk Data (Bootstrap)
    saveProductsBulk: (products) => ipcRenderer.invoke('db-save-products-bulk', products),
    saveCategoriesBulk: (categories) => ipcRenderer.invoke('db-save-categories-bulk', categories),
    saveSettingsBulk: (settings) => ipcRenderer.invoke('db-save-settings-bulk', settings),
    getSettings: () => ipcRenderer.invoke('db-get-settings'),
    getTables: () => ipcRenderer.invoke('db-get-tables'),
    // Sync API
    getPendingOrders: () => ipcRenderer.invoke('sync-orders'),
    markOrdersSynced: (ids) => ipcRenderer.invoke('db-mark-synced', ids),
    // System API
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    printReceipt: (html, options) => ipcRenderer.invoke('print-receipt', html, options),
    isDesktop: true
});

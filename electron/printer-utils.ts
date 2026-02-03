/**
 * Printer Utilities for Electron POS Application
 * Provides robust silent printing with thermal printer support
 */

// Thermal printer keyword patterns for auto-detection
const THERMAL_PRINTER_KEYWORDS = [
    'EPSON',
    'TM-T',
    'THERMAL',
    'POS',
    'BIXOLON',
    'STAR',
    'TSP',
    'CITIZEN',
    'CT-S',
    'SRP',
    'RECEIPT'
];

// Page sizes in microns (Electron uses microns for print options)
const PAGE_SIZES = {
    '58': { width: 58000, height: 200000 },  // 58mm thermal
    '80': { width: 80000, height: 200000 },  // 80mm thermal
};

export interface PrinterInfo {
    name: string;
    displayName: string;
    description: string;
    status: number;
    isDefault: boolean;
}

export interface PrintOptions {
    printerName?: string;
    paperWidth?: string | number;
    margins?: {
        marginType?: string;
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
    copies?: number;
}

export interface PrintResult {
    success: boolean;
    error?: string;
    printerUsed?: string;
    retried?: boolean;
}

/**
 * Logging utility - writes to desktop-debug.log
 */
function createLogger(logToFile: (message: string, data?: any) => void) {
    return {
        print: (message: string, data?: any) => {
            logToFile(`[PRINT] ${message}`, data);
        }
    };
}

/**
 * List all available printers with detailed logging
 */
export async function listPrinters(
    win: any,
    logToFile: (message: string, data?: any) => void
): Promise<PrinterInfo[]> {
    const logger = createLogger(logToFile);
    const os = require('os');

    try {
        logger.print(`OS: ${os.platform()} (${os.release()})`);

        if (!win || !win.webContents) {
            logger.print('ERROR: No valid window for printer detection');
            return [];
        }

        const printers = await win.webContents.getPrintersAsync();

        logger.print(`Found ${printers.length} printers`);

        // Log each printer's details
        printers.forEach((printer: PrinterInfo) => {
            logger.print(`Printer: ${printer.name}`, {
                status: printer.status,
                isDefault: printer.isDefault,
                description: printer.description || 'N/A'
            });
        });

        return printers;
    } catch (error: any) {
        logger.print('ERROR: Failed to list printers', { error: error.message });
        return [];
    }
}

/**
 * Smart thermal printer selection with priority-based matching
 * Priority: 1. Configured name → 2. Thermal keywords → 3. Default printer
 */
export function selectThermalPrinter(
    printers: PrinterInfo[],
    configuredName: string | undefined,
    logToFile: (message: string, data?: any) => void
): PrinterInfo | null {
    const logger = createLogger(logToFile);

    if (!printers || printers.length === 0) {
        logger.print('WARNING: No printers available for selection');
        return null;
    }

    // Priority 1: Match exact configured name
    if (configuredName) {
        const exactMatch = printers.find(p => p.name === configuredName);
        if (exactMatch) {
            logger.print(`Using configured printer: ${exactMatch.name}`);
            return exactMatch;
        }
        logger.print(`WARNING: Configured printer "${configuredName}" not found`);
    }

    // Priority 2: Match thermal printer keywords
    const thermalMatch = printers.find(printer => {
        const nameUpper = printer.name.toUpperCase();
        return THERMAL_PRINTER_KEYWORDS.some(keyword => nameUpper.includes(keyword));
    });

    if (thermalMatch) {
        const matchedKeyword = THERMAL_PRINTER_KEYWORDS.find(
            k => thermalMatch.name.toUpperCase().includes(k)
        );
        logger.print(`Using thermal printer: ${thermalMatch.name} (matched keyword: ${matchedKeyword})`);
        return thermalMatch;
    }

    // Priority 3: Fall back to default printer
    const defaultPrinter = printers.find(p => p.isDefault);
    if (defaultPrinter) {
        logger.print(`Using default printer: ${defaultPrinter.name} (no thermal printer found)`);
        return defaultPrinter;
    }

    // Last resort: use first available printer
    logger.print(`Using first available printer: ${printers[0].name} (no default set)`);
    return printers[0];
}

/**
 * Get page size configuration for thermal printers
 */
export function getPageSize(paperWidth: string | number = '80'): { width: number; height: number } {
    const width = String(paperWidth);
    return PAGE_SIZES[width as keyof typeof PAGE_SIZES] || PAGE_SIZES['80'];
}

/**
 * Interpret printer status code
 */
export function getPrinterStatusText(status: number): string {
    // Common status codes (may vary by platform)
    const statusMap: Record<number, string> = {
        0: 'Ready',
        1: 'Paused',
        2: 'Error',
        3: 'Pending Deletion',
        4: 'Paper Jam',
        5: 'Paper Out',
        6: 'Manual Feed',
        7: 'Paper Problem',
        8: 'Offline',
        9: 'IO Active',
        10: 'Busy',
        11: 'Printing',
        12: 'Output Bin Full',
        13: 'Not Available',
        14: 'Waiting',
        15: 'Processing',
        16: 'Initializing',
        17: 'Warming Up',
        18: 'Toner Low',
        19: 'No Toner',
        20: 'Page Punt',
        21: 'User Intervention',
        22: 'Out of Memory',
        23: 'Door Open',
        24: 'Server Unknown',
        25: 'Power Save',
    };
    return statusMap[status] || `Unknown (${status})`;
}

/**
 * Silent print with retry logic
 */
export async function silentPrint(
    BrowserWindow: any,
    htmlContent: string,
    options: PrintOptions,
    logToFile: (message: string, data?: any) => void
): Promise<PrintResult> {
    const logger = createLogger(logToFile);
    const pageSize = getPageSize(options.paperWidth);

    const printOptions: any = {
        silent: true,
        printBackground: true,
        deviceName: options.printerName || '',
        pageSize: pageSize,
        margins: options.margins || { marginType: 'none' },
        copies: options.copies || 1
    };

    logger.print('Attempting silent print', {
        printer: printOptions.deviceName || '(default)',
        pageSize: `${pageSize.width / 1000}mm x auto`,
        silent: true
    });

    // Create hidden print window
    const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    try {
        // Load HTML content
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        // Wait for content to render
        await new Promise(resolve => setTimeout(resolve, 500));

        // Attempt print
        const result = await attemptPrint(printWindow, printOptions, logger);

        if (result.success) {
            logger.print('Silent print success', { printer: printOptions.deviceName });
            printWindow.close();
            return { success: true, printerUsed: printOptions.deviceName };
        }

        // First attempt failed - retry once
        logger.print('Print failed, retrying...', { error: result.error });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const retryResult = await attemptPrint(printWindow, printOptions, logger);

        if (retryResult.success) {
            logger.print('Retry print success', { printer: printOptions.deviceName });
            printWindow.close();
            return { success: true, printerUsed: printOptions.deviceName, retried: true };
        }

        // Retry failed - try with dialog as last resort
        logger.print('Retry failed, using fallback (silent=false)', { error: retryResult.error });
        const fallbackOptions = { ...printOptions, silent: false };
        const fallbackResult = await attemptPrint(printWindow, fallbackOptions, logger);

        printWindow.close();

        if (fallbackResult.success) {
            logger.print('Fallback print success (with dialog)');
            return { success: true, printerUsed: printOptions.deviceName, retried: true };
        }

        return {
            success: false,
            error: fallbackResult.error || 'Print failed after retries',
            printerUsed: printOptions.deviceName
        };

    } catch (error: any) {
        logger.print('Print exception', { error: error.message, stack: error.stack });
        try {
            printWindow.close();
        } catch (e) { /* ignore */ }

        return { success: false, error: error.message };
    }
}

/**
 * Internal: Attempt a single print operation
 */
function attemptPrint(
    printWindow: any,
    printOptions: any,
    logger: ReturnType<typeof createLogger>
): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
        printWindow.webContents.print(printOptions, (success: boolean, errorType: string) => {
            if (success) {
                resolve({ success: true });
            } else {
                logger.print('Print attempt failed', { errorType });
                resolve({ success: false, error: errorType || 'Unknown print error' });
            }
        });
    });
}

/**
 * Test print function for printer verification
 */
export async function testPrint(
    BrowserWindow: any,
    printerName: string,
    paperWidth: string,
    logToFile: (message: string, data?: any) => void
): Promise<PrintResult> {
    const logger = createLogger(logToFile);
    logger.print('Starting test print', { printer: printerName, width: paperWidth });

    const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    margin: 0;
                    padding: 10px;
                    width: ${paperWidth}mm;
                }
                .header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
                .line { border-top: 1px dashed #000; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; margin: 5px 0; }
                .center { text-align: center; }
                .footer { margin-top: 15px; text-align: center; font-size: 10px; }
            </style>
        </head>
        <body>
            <div class="header">*** TEST RECEIPT ***</div>
            <div class="line"></div>
            <div class="center">SyncServe POS</div>
            <div class="center">Printer Test</div>
            <div class="line"></div>
            <div class="row"><span>Printer:</span><span>${printerName}</span></div>
            <div class="row"><span>Paper Width:</span><span>${paperWidth}mm</span></div>
            <div class="row"><span>Time:</span><span>${new Date().toLocaleTimeString()}</span></div>
            <div class="row"><span>Date:</span><span>${new Date().toLocaleDateString()}</span></div>
            <div class="line"></div>
            <div class="center">✓ Printer is working correctly</div>
            <div class="footer">--- End of Test ---</div>
        </body>
        </html>
    `;

    return silentPrint(BrowserWindow, testHtml, {
        printerName,
        paperWidth
    }, logToFile);
}

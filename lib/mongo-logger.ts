import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_LOG_URI;
const options = {};

// Check if we're in PostgreSQL (web) mode - only then connect to MongoDB
const dbUrl = process.env.DATABASE_URL || '';
const isWebMode = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

// Extract database name from URI or use default
const getDbName = (connectionUri: string): string => {
    try {
        const url = new URL(connectionUri);
        const pathDb = url.pathname.replace('/', '');
        return pathDb || 'syncserve_audit';
    } catch {
        return 'syncserve_audit';
    }
};

const dbName = uri ? getDbName(uri) : 'syncserve_audit';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Only initialize MongoDB connection in web/PostgreSQL mode
if (uri && isWebMode) {
    console.log(`[MongoDB] Web mode detected - connecting to database: ${dbName}`);

    if (process.env.NODE_ENV === 'development') {
        // In development mode, use a global variable so that the value
        // is preserved across module reloads caused by HMR (Hot Module Replacement).
        let globalWithMongo = global as typeof globalThis & {
            _mongoClientPromise?: Promise<MongoClient>;
        };

        if (!globalWithMongo._mongoClientPromise) {
            client = new MongoClient(uri, options);
            globalWithMongo._mongoClientPromise = client.connect();
        }
        clientPromise = globalWithMongo._mongoClientPromise;
    } else {
        // In production mode, it's best to not use a global variable.
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    }
} else if (!isWebMode) {
    console.log('[MongoDB] Desktop/SQLite mode detected - using local logging only (no cloud sync)');
} else {
    console.warn('[MongoDB] MONGODB_LOG_URI not configured - cloud logging disabled');
}

export async function pushLogToCloud(logEntry: any) {
    if (!clientPromise) return false; // No Cloud Configured or Desktop mode

    try {
        const client = await clientPromise;
        // Explicitly use the database name extracted from URI
        const db = client.db(dbName);
        console.log(`[MongoDB] Pushing log to ${dbName}.audit_logs:`, logEntry.action);
        await db.collection('audit_logs').insertOne({
            ...logEntry,
            syncedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error("[MongoDB] Cloud log push failed:", error);
        return false;
    }
}

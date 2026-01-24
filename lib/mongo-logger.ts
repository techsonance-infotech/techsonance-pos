import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_LOG_URI;
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
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
}

export async function pushLogToCloud(logEntry: any) {
    if (!clientPromise) return; // No Cloud Configured

    try {
        const client = await clientPromise;
        // Use the DB from URI if present, or fallback to 'pos_logs'
        // client.db() with no args uses the one in connection string
        const db = client.db();
        await db.collection('audit_logs').insertOne({
            ...logEntry,
            syncedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error("Cloud log push failed:", error);
        return false;
    }
}


import { NextResponse } from "next/server";
import { getUserProfile } from "@/app/actions/user";
import { prisma } from "@/lib/prisma"; // Direct prisma usage for bulk might be better/faster
import { LocalOrder } from "@/lib/db"; // Use the interface for type checking if possible, or just copy

export async function POST(request: Request) {
    try {
        const user = await getUserProfile();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        console.log("📥 Sync API Received Body:", JSON.stringify(body, null, 2)); // Debug Log
        const { orders } = body as { orders: any[] }; // strict typing tricky across boundaries

        if (!Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        const results = [];

        // Process sequentially to avoid race conditions on inventory/stock if any
        for (const order of orders) {
            try {
                // Check if order already exists (Idempotency)
                const existing = await prisma.order.findUnique({
                    where: { id: order.id } // Assuming UUID is preserved
                });

                if (existing) {
                    results.push({ id: order.id, status: 'ALREADY_EXISTS' });
                    continue;
                }

                // Transform LocalOrder to Prisma Order Payload
                // This mimics saveOrder logic but for bulk
                const { items, ...orderData } = order;

                // Calculate tax/totals again or trust client? 
                // Trusting client for offline consistency, but verifying stock could be needed.
                // For now, valid sync simply persists what was done offline.

                const savedOrder = await prisma.order.create({
                    data: {
                        id: order.id,
                        storeId: user.defaultStoreId!,
                        kotNo: order.kotNo,
                        customerName: order.customerName,
                        customerMobile: order.customerMobile,
                        tableId: order.tableId,
                        tableName: order.tableName,
                        status: order.originalStatus || 'COMPLETED', // Use original status, fallback to COMPLETED for legacy
                        paymentMode: order.paymentMode,
                        totalAmount: order.totalAmount,
                        discountAmount: 0, // Default
                        userId: user.id, // Assign to syncing user
                        createdAt: new Date(order.createdAt), // IMPORTANT: Use original timestamp
                        items: order.items // JSON Field
                    }
                });

                results.push({ id: order.id, status: 'SYNCED' });

            } catch (err) {
                console.error(`Failed to sync order ${order.id}:`, err);
                // Log the exact payload that failed
                console.error(`Failed Payload:`, JSON.stringify(order, null, 2));
                results.push({ id: order.id, status: 'FAILED', error: String(err) });
            }
        }

        const syncedIds = results
            .filter(r => r.status === 'SYNCED' || r.status === 'ALREADY_EXISTS')
            .map(r => r.id)

        const failedIds = results
            .filter(r => r.status === 'FAILED')
            .map(r => r.id)

        return NextResponse.json({ success: true, results, syncedIds, failedIds });

    } catch (error) {
        console.error("Sync API Error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

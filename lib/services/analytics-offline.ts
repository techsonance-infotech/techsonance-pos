
import { db, LocalOrder } from '@/lib/db';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, subDays, format, getMonth, getYear } from 'date-fns';

export const OfflineAnalyticsService = {
    // Helper to get orders
    async getCompletedOrders(): Promise<LocalOrder[]> {
        // We consider orders that are either SYNCED (server confirmed) or COMPLETED (created offline but completed)
        // Original implementation in pos-service considers originalStatus === 'COMPLETED'
        return await db.orders
            .filter(o => o.originalStatus === 'COMPLETED' || o.status === 'SYNCED')
            .toArray();
    },

    // 1. Sales Overview
    async getSalesOverview() {
        const orders = await this.getCompletedOrders();
        const today = new Date();
        const startToday = startOfDay(today).getTime();
        const startWeek = startOfWeek(today).getTime();
        const startMonth = startOfMonth(today).getTime();

        // Use 7 days ago for trend
        const startTrend = subDays(today, 7).getTime();

        let todaySales = 0, todayCount = 0;
        let weekSales = 0, weekCount = 0;
        let monthSales = 0, monthCount = 0;
        const trendMap = new Map<string, number>();

        // Init trend map
        for (let i = 0; i < 7; i++) {
            const d = subDays(today, 6 - i);
            trendMap.set(format(d, 'MMM dd'), 0);
        }

        for (const o of orders) {
            const t = o.createdAt;
            const amt = o.totalAmount || 0;

            if (t >= startToday) {
                todaySales += amt;
                todayCount++;
            }
            if (t >= startWeek) {
                weekSales += amt;
                weekCount++;
            }
            if (t >= startMonth) {
                monthSales += amt;
                monthCount++;
            }

            // Trend logic
            if (t >= startTrend) {
                const dayKey = format(new Date(t), 'MMM dd');
                if (trendMap.has(dayKey)) {
                    trendMap.set(dayKey, (trendMap.get(dayKey) || 0) + amt);
                }
            }
        }

        return {
            today: { sales: todaySales, orders: todayCount },
            week: { sales: weekSales, orders: weekCount },
            month: { sales: monthSales, orders: monthCount },
            topCategory: 'N/A', // Hard to calc without full product/category linkage in simple order items
            trend: Array.from(trendMap.entries()).map(([date, sales]) => ({ date, sales }))
        };
    },

    // 2. Daily Report
    async getDailySalesReport(date: Date) {
        const orders = await this.getCompletedOrders();
        const start = startOfDay(date).getTime();
        const end = endOfDay(date).getTime();

        const dailyOrders = orders.filter(o => o.createdAt >= start && o.createdAt <= end);

        let totalSales = 0;
        const hourlyMap = new Map<number, { total: number, count: number }>();

        // Init hourly map - simpler to just do sparsely or fill 0-23
        // Server does sparse typically, but filling 0-23 is nicer for charts? 
        // Server implementation groups by extract hour.

        for (const o of dailyOrders) {
            totalSales += o.totalAmount || 0;
            const hour = new Date(o.createdAt).getHours();
            const existing = hourlyMap.get(hour) || { total: 0, count: 0 };
            existing.total += o.totalAmount || 0;
            existing.count++;
            hourlyMap.set(hour, existing);
        }

        const hourlyBreakdown = Array.from(hourlyMap.entries())
            .map(([hour, data]) => ({ hour, sales: data.total, orders: data.count }))
            .sort((a, b) => a.hour - b.hour);

        return {
            date: format(date, 'yyyy-MM-dd'),
            totalSales,
            orderCount: dailyOrders.length,
            averageOrderValue: dailyOrders.length > 0 ? totalSales / dailyOrders.length : 0,
            hourlyBreakdown,
            orders: dailyOrders.sort((a, b) => b.createdAt - a.createdAt).map(o => ({
                id: o.id,
                kotNo: o.kotNo,
                time: format(new Date(o.createdAt), 'HH:mm'),
                customer: o.customerName || 'Guest',
                items: Array.isArray(o.items) ? o.items.length : 0,
                total: o.totalAmount
            }))
        };
    },

    // 3. Category Report
    async getCategoryWiseReport(startDate: Date, endDate: Date) {
        // Offline orders store items as JSON without category ID usually, unless we enriched it.
        // app/actions/analytics.ts server-side returns "All Items" generalized report because of this same limitation in basic Order schema.
        // So we just mimic that behavior.

        const orders = await this.getCompletedOrders();
        const start = startOfDay(startDate).getTime();
        const end = endOfDay(endDate).getTime();

        const filtered = orders.filter(o => o.createdAt >= start && o.createdAt <= end);

        const totalRevenue = filtered.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalItems = filtered.reduce((sum, o) => sum + (Array.isArray(o.items) ? o.items.length : 0), 0);

        return {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            categories: [{
                id: '1',
                name: 'All Items',
                revenue: totalRevenue,
                quantity: totalItems,
                orders: filtered.length,
                percentage: 100
            }],
            totalRevenue
        };
    },

    // 4. Monthly Report
    async getMonthlySalesReport(year: number) {
        const orders = await this.getCompletedOrders();
        // Filter by year
        const filtered = orders.filter(o => new Date(o.createdAt).getFullYear() === year);

        const monthMap = new Map<number, { total: number, count: number }>();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (const o of filtered) {
            const month = new Date(o.createdAt).getMonth(); // 0-11
            const existing = monthMap.get(month) || { total: 0, count: 0 };
            existing.total += o.totalAmount || 0;
            existing.count++;
            monthMap.set(month, existing);
        }

        const months = monthNames.map((name, index) => {
            const data = monthMap.get(index);
            return {
                month: name,
                sales: data ? data.total : 0,
                orders: data ? data.count : 0
            };
        });

        const totalSales = months.reduce((sum, m) => sum + m.sales, 0);
        const bestMonth = months.reduce((best, curr) => curr.sales > best.sales ? curr : best, { month: '', sales: -1 });

        return {
            year,
            months,
            totalSales,
            bestMonth: bestMonth.month
        };
    },

    // 5. Date Range Report
    async getDateRangeReport(startDate: Date, endDate: Date) {
        const orders = await this.getCompletedOrders();
        const start = startOfDay(startDate).getTime();
        const end = endOfDay(endDate).getTime();

        const filtered = orders.filter(o => o.createdAt >= start && o.createdAt <= end);

        let totalSales = 0;
        const dailyMap = new Map<string, { total: number, count: number }>();

        for (const o of filtered) {
            totalSales += o.totalAmount || 0;
            const dayKey = format(new Date(o.createdAt), 'MMM dd');
            const existing = dailyMap.get(dayKey) || { total: 0, count: 0 };
            existing.total += o.totalAmount || 0;
            existing.count++;
            dailyMap.set(dayKey, existing);
        }

        const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
            date,
            sales: data.total,
            orders: data.count
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Approximate sort, better if we kept real date objects

        return {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            totalSales,
            orderCount: filtered.length,
            averageOrderValue: filtered.length > 0 ? totalSales / filtered.length : 0,
            dailyBreakdown,
            transactions: filtered.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map(t => ({
                id: t.id,
                date: format(new Date(t.createdAt), 'MMM dd, yyyy'),
                time: format(new Date(t.createdAt), 'HH:mm'),
                customer: t.customerName || 'Guest',
                items: Array.isArray(t.items) ? t.items.length : 0,
                total: t.totalAmount
            }))
        };
    },

    // 6. Top Items
    async getTopSellingItems(limit: number = 10, startDate?: Date, endDate?: Date) {
        const orders = await this.getCompletedOrders();
        const start = startDate ? startOfDay(startDate).getTime() : 0;
        const end = endDate ? endOfDay(endDate).getTime() : Number.MAX_SAFE_INTEGER;

        const filtered = orders.filter(o => o.createdAt >= start && o.createdAt <= end);

        const itemMap = new Map<string, { name: string, quantity: number, revenue: number, orders: Set<string> }>();

        for (const o of filtered) {
            if (Array.isArray(o.items)) {
                o.items.forEach((item: any) => {
                    const key = item.name;
                    const existing = itemMap.get(key) || { name: key, quantity: 0, revenue: 0, orders: new Set() };
                    existing.quantity += item.quantity || 1;
                    existing.revenue += (item.quantity || 1) * (item.price || item.unitPrice || 0);
                    existing.orders.add(o.id);
                    itemMap.set(key, existing);
                });
            }
        }

        const topItems = Array.from(itemMap.values())
            .map(item => ({
                id: item.name, // Use name as ID for aggregation
                name: item.name,
                category: 'General',
                quantitySold: item.quantity,
                revenue: item.revenue,
                orders: item.orders.size
            }))
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, limit);

        return {
            startDate: startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time',
            endDate: endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time',
            items: topItems.map((item, index) => ({
                rank: index + 1,
                ...item
            }))
        };
    },

    // 7. Payment Methods
    async getPaymentMethodAnalysis(startDate: Date, endDate: Date) {
        const orders = await this.getCompletedOrders();
        const start = startOfDay(startDate).getTime();
        const end = endOfDay(endDate).getTime();

        const filtered = orders.filter(o => o.createdAt >= start && o.createdAt <= end);

        // Group by paymentMode
        const methodMap = new Map<string, { total: number, count: number }>();
        let totalRevenue = 0;

        for (const o of filtered) {
            const mode = o.paymentMode || 'CASH';
            const existing = methodMap.get(mode) || { total: 0, count: 0 };
            existing.total += o.totalAmount || 0;
            existing.count++;
            methodMap.set(mode, existing);
            totalRevenue += o.totalAmount || 0;
        }

        const methods = Array.from(methodMap.entries()).map(([method, data]) => ({
            method,
            revenue: data.total,
            transactions: data.count,
            percentage: totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0
        }));

        return {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            methods,
            totalRevenue
        };
    },

    // 8. Profit & Loss
    async getProfitLossReport(month: number, year: number) {
        const orders = await this.getCompletedOrders();

        // This Month
        const start = new Date(year, month - 1, 1).getTime();
        const end = endOfMonth(new Date(year, month - 1, 1)).getTime();

        const currentOrders = orders.filter(o => o.createdAt >= start && o.createdAt <= end);
        const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Previous Month
        const prevDate = subDays(new Date(year, month - 1, 1), 1); // Go back one day from start of this month to get end of prev
        const prevMonthVal = prevDate.getMonth();
        const prevYearVal = prevDate.getFullYear();

        const prevStart = new Date(prevYearVal, prevMonthVal, 1).getTime();
        const prevEnd = endOfMonth(new Date(prevYearVal, prevMonthVal, 1)).getTime();

        const prevOrders = orders.filter(o => o.createdAt >= prevStart && o.createdAt <= prevEnd);
        const previousRevenue = prevOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const growth = previousRevenue > 0
            ? ((currentRevenue - previousRevenue) / previousRevenue * 100)
            : 0;

        return {
            month: format(new Date(year, month - 1, 1), 'MMMM yyyy'),
            revenue: currentRevenue,
            orders: currentOrders.length,
            previousMonthRevenue: previousRevenue,
            growth,
            averageOrderValue: currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0
        };
    }
};

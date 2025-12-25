import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// import { prisma } from './lib/prisma' // Cannot use Prisma in Middleware yet on Vercel/Edge, but OK for local Node if careful
// NOTE: Prisma in middleware is tricky. We'll verify maintenance via a lightweight check or API call if needed, 
// For now, let's skip direct DB calls in middleware for Maintenance and rely on Layout check for robustness, 
// OR use an Edge-compatible fetch to an internal API.
// 
// Simplified approach: Middleware handles redirects, but data must come efficiently.
// For this environment (Node runtime), we might get away with it, but "prisma" is not edge-safe.
// 
// BETTER APPROACH for "Kill Switch":
// Check a simple cookie or header? No, needs to be server-side enforced.
// We will use a dedicated API endpoint `api/security/check` that the middleware calls? 
// No, internal fetches in middleware are anti-pattern.
// 
// HYBRID APPROACH:
// 1. IP Blocking: Can be hardcoded or cached.
// 2. Kill Switch: Enforced in `DashboardLayout` (Client/Server Comp) mostly.
// 
// However, the user asked for "Absolute Power". Middleware is best for IP blocking.
// Let's rely on `DashboardLayout` for the "App Disable" to avoid Middleware complexity with DB.
// Middleware will handle:
// - Redirection if matching specific patterns (like /admin for non-admins if we had auth in middleware)
// - Basic headers
// 
// WAIT, we can disable the middleware DB check and move "Kill Switch" logic to the Root Layout or Dashboard Layout?
// Yes, that's safer and avoids "Prisma in Edge" errors.

export function middleware(request: NextRequest) {
    // This is a placeholder for where we WOULD check IPs if we had an Edge DB (like Redis/Vercel KV).
    // checking a text file or env var is also possible.
    // For this specific codebase, we will enforce the Kill Switch in the Layouts for safety/simplicity 
    // unless we want to use an Edge-ready driver.

    return NextResponse.next()
}

// See "app/dashboard/layout.tsx" for the actual enforcement of Maintenance Mode.

export const config = {
    matcher: ['/dashboard/:path*'],
}

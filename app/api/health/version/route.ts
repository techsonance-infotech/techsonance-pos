import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent static caching of this route

export async function GET() {
    // In next.config.ts, we defined generateBuildId.
    // However, getting that specific ID at runtime can be tricky without exposing it.
    // A simpler approach for "runtime" versioning is to use an environment variable 
    // or a timestamp generated at build time if we were using a build script.

    // BUT, Next.js exposes `process.env.CONFIG_BUILD_ID` in some setups, or we can just 
    // rely on the fact that a new deployment will have a new server start time if we track that.

    // Better approach: We will return a unique ID that supposedly changes on every build/deploy.
    // Since we don't have a reliable "Build ID" env var by default in all hosting,
    // we can use a simpler proxy: The time the server started (for long-running processes) 
    // OR we can try to read the buildId file if it exists.

    // For this environment (dev/build), let's simply return a timestamp that was 
    // generated when this module was *loaded* (which happens on server start/deploy).

    return NextResponse.json({
        version: process.env.NEXT_BUILD_ID || globalThis.__NEXT_BUILD_ID || 'dev-' + Date.now()
    });
}

// Ensure the module-level variable is set once per server start
if (!globalThis.__NEXT_BUILD_ID) {
    globalThis.__NEXT_BUILD_ID = `build-${Date.now()}`;
}

declare global {
    var __NEXT_BUILD_ID: string;
}

import { z } from 'zod';

/**
 * Environment Configuration Schema
 * 
 * Defines the shape of our configuration and validates it at runtime.
 * This ensures the application never starts with missing required variables.
 */
const envSchema = z.object({
    // Core Environment Setting
    APP_ENV: z.enum(['local', 'dev', 'qa', 'prod']).default('local'),

    // Database Connection
    // Can be undefined in some build steps, but required for runtime
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    // Optional: Add other service keys here (e.g. STRIPE_KEY, AWS_REGION)
    // NEXT_PUBLIC_... variables are handled by Next.js build time inliner, 
    // but server-side vars should be validated here.
});

/**
 * Load and validate configuration
 * 
 * In 'local' mode, this relies on scripts/launch.js having already injected
 * secrets into process.env from config/secrets.local.json.
 * 
 * In 'dev'/'qa'/'prod', this relies on the hosting platform injecting them.
 */
const processEnv = {
    APP_ENV: process.env.APP_ENV,
    DATABASE_URL: process.env.DATABASE_URL
};

// We use safeParse to allow for better error reporting or partial loading if needed
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
    console.error('❌ Invalid Environment Configuration:');
    console.error(parsed.error.flatten().fieldErrors);

    // Only throw if strictly required. For build steps, sometimes we might want to be lenient
    // dependening on specific needs, but generally fail-fast is safer.
    if (process.env.NODE_ENV !== 'test') {
        throw new Error("Invalid Environment Configuration");
    }
}

export const config = parsed.success ? parsed.data : (processEnv as z.infer<typeof envSchema>); // Fallback for types if needed, though invalid

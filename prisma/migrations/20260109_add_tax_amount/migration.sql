-- Add taxAmount column to Order table
-- This migration adds the taxAmount field that was added to the Prisma schema
-- but never migrated to production databases

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Update existing orders to have taxAmount = 0 (already handled by DEFAULT)
-- No additional data migration needed since default value is appropriate

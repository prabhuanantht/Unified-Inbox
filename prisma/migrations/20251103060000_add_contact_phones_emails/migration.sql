-- Add missing array columns to align with prisma schema
-- Use empty array defaults to satisfy NOT NULL constraint on existing rows

ALTER TABLE "Contact"
  ADD COLUMN "phones" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "emails" TEXT[] NOT NULL DEFAULT '{}';



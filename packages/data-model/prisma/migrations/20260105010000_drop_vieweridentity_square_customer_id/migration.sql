-- Remove deprecated global Square customer id. Customer mappings are now owner-scoped via ViewerSquareCustomer.

DROP INDEX IF EXISTS "ViewerIdentity_squareCustomerId_idx";
ALTER TABLE "ViewerIdentity" DROP COLUMN IF EXISTS "squareCustomerId";



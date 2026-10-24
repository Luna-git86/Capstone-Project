/*
  Warnings:

  - The values [URGENT] on the enum `Urgency` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Urgency_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "Ticket" ALTER COLUMN "urgensi" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "urgensi" TYPE "Urgency_new" USING ("urgensi"::text::"Urgency_new");
ALTER TYPE "Urgency" RENAME TO "Urgency_old";
ALTER TYPE "Urgency_new" RENAME TO "Urgency";
DROP TYPE "Urgency_old";
ALTER TABLE "Ticket" ALTER COLUMN "urgensi" SET DEFAULT 'LOW';
COMMIT;

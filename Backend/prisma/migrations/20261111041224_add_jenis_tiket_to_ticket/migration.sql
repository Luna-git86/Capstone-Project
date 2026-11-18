/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Divisi` table. All the data in the column will be lost.
  - The `status` column on the `DokumenSop` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `attempts` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `NotificationLog` table. All the data in the column will be lost.
  - The `status` column on the `NotificationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Made the column `divisiId` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('TICKET_CREATED', 'STATUS_CHANGED', 'DEADLINE_REMINDER', 'DEADLINE_OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "DokumenSop" DROP CONSTRAINT "DokumenSop_pengajuId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_divisiId_fkey";

-- DropIndex
DROP INDEX "NotificationLog_status_createdAt_idx";

-- DropIndex
DROP INDEX "NotificationLog_ticketId_type_idx";

-- DropIndex
DROP INDEX "TelegramLinkToken_userId_expiresAt_idx";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "details" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Divisi" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "DokumenSop" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'AKTIF',
ALTER COLUMN "revisi" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationLog" DROP COLUMN "attempts",
DROP COLUMN "type",
ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'TELEGRAM',
ADD COLUMN     "eventType" "NotificationEventType" NOT NULL DEFAULT 'STATUS_CHANGED',
DROP COLUMN "status",
ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
ALTER COLUMN "telegramChatId" DROP NOT NULL,
ALTER COLUMN "dedupeKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "fotoInstruksi" TEXT,
ADD COLUMN     "jenisTiket" TEXT NOT NULL DEFAULT 'LAPORAN',
ALTER COLUMN "divisiId" SET NOT NULL,
ALTER COLUMN "prioritas" SET DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "updatedAt";

-- DropEnum
DROP TYPE "StatusSop";

-- CreateIndex
CREATE INDEX "NotificationLog_ticketId_idx" ON "NotificationLog"("ticketId");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientId_idx" ON "NotificationLog"("recipientId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_eventType_idx" ON "NotificationLog"("eventType");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_userId_idx" ON "TelegramLinkToken"("userId");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_divisiId_fkey" FOREIGN KEY ("divisiId") REFERENCES "Divisi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenSop" ADD CONSTRAINT "DokumenSop_pengajuId_fkey" FOREIGN KEY ("pengajuId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - The primary key for the `Ticket` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `alasanPerpanjangan` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `fotoUrl` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `isMintaPerpanjangan` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `kategori` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `targetSelesai` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `urgensi` on the `Ticket` table. All the data in the column will be lost.
  - The `id` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `pelaksanaId` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `namaLengkap` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nomorWhatsApp` on the `User` table. All the data in the column will be lost.
  - The `id` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `divisiId` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AuditTrail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Division` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SopDocument` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[noHp]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[telegramChatId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `pembuatId` on the `Ticket` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `nama` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noHp` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Prioritas" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "StatusTiket" AS ENUM ('MENUNGGU_TRIASE', 'DIPROSES', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusSop" AS ENUM ('MENUNGGU_VALIDASI', 'DISAHKAN', 'DIREVISI');

-- DropForeignKey
ALTER TABLE "AuditTrail" DROP CONSTRAINT "AuditTrail_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "AuditTrail" DROP CONSTRAINT "AuditTrail_userId_fkey";

-- DropForeignKey
ALTER TABLE "SopDocument" DROP CONSTRAINT "SopDocument_diunggahOleh_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pelaksanaId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pembuatId_fkey";

-- AlterTable
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pkey",
DROP COLUMN "alasanPerpanjangan",
DROP COLUMN "fotoUrl",
DROP COLUMN "isMintaPerpanjangan",
DROP COLUMN "kategori",
DROP COLUMN "targetSelesai",
DROP COLUMN "urgensi",
ADD COLUMN     "catatanRevisi" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "divisiId" INTEGER,
ADD COLUMN     "prioritas" "Prioritas" NOT NULL DEFAULT 'LOW',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "StatusTiket" NOT NULL DEFAULT 'MENUNGGU_TRIASE',
DROP COLUMN "pembuatId",
ADD COLUMN     "pembuatId" INTEGER NOT NULL,
DROP COLUMN "pelaksanaId",
ADD COLUMN     "pelaksanaId" INTEGER,
ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "namaLengkap",
DROP COLUMN "nomorWhatsApp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nama" TEXT NOT NULL,
ADD COLUMN     "noHp" TEXT NOT NULL,
ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
DROP COLUMN "divisiId",
ADD COLUMN     "divisiId" INTEGER,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "AuditTrail";

-- DropTable
DROP TABLE "Division";

-- DropTable
DROP TABLE "SopDocument";

-- DropEnum
DROP TYPE "TicketStatus";

-- DropEnum
DROP TYPE "Urgency";

-- CreateTable
CREATE TABLE "Divisi" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Divisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumenSop" (
    "id" SERIAL NOT NULL,
    "nomorSop" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "fileUrl" TEXT,
    "status" "StatusSop" NOT NULL DEFAULT 'MENUNGGU_VALIDASI',
    "divisiId" INTEGER,
    "pengajuId" INTEGER NOT NULL,
    "disahkanPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DokumenSop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Divisi_nama_key" ON "Divisi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "DokumenSop_nomorSop_key" ON "DokumenSop"("nomorSop");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_dedupeKey_key" ON "NotificationLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_ticketId_type_idx" ON "NotificationLog"("ticketId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_noHp_key" ON "User"("noHp");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_divisiId_fkey" FOREIGN KEY ("divisiId") REFERENCES "Divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_pembuatId_fkey" FOREIGN KEY ("pembuatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_pelaksanaId_fkey" FOREIGN KEY ("pelaksanaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_divisiId_fkey" FOREIGN KEY ("divisiId") REFERENCES "Divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenSop" ADD CONSTRAINT "DokumenSop_divisiId_fkey" FOREIGN KEY ("divisiId") REFERENCES "Divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenSop" ADD CONSTRAINT "DokumenSop_pengajuId_fkey" FOREIGN KEY ("pengajuId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

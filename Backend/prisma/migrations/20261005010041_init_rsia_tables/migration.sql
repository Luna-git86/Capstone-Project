-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "alasanPerpanjangan" TEXT,
ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "isMintaPerpanjangan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kategori" TEXT,
ADD COLUMN     "targetSelesai" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nomorWhatsApp" TEXT;

-- AddForeignKey
ALTER TABLE "SopDocument" ADD CONSTRAINT "SopDocument_diunggahOleh_fkey" FOREIGN KEY ("diunggahOleh") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

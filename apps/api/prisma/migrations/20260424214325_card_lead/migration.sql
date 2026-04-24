-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'CARD_LEAD_CHANGED';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "leadId" TEXT;

-- Backfill: todo card existente ganha o createdBy como líder inicial
UPDATE "Card" SET "leadId" = "createdById" WHERE "leadId" IS NULL;

-- CreateIndex (acelera "meus cards como líder")
CREATE INDEX "Card_leadId_idx" ON "Card"("leadId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

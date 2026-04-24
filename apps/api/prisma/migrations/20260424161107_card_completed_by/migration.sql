-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'CARD_COMPLETED';
ALTER TYPE "ActivityType" ADD VALUE 'CARD_UNCOMPLETED';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "completedById" TEXT;

-- CreateIndex
CREATE INDEX "Card_boardId_completedAt_idx" ON "Card"("boardId", "completedAt");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

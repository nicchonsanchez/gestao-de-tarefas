-- Adiciona List.organizationId denormalizado (defense-in-depth multi-tenant).
-- Estratégia em 3 passos pra suportar tabelas com dados existentes:
--   1. Adiciona coluna NULLable
--   2. Backfill a partir do board.organizationId
--   3. Promove a NOT NULL e cria FK + index

-- 1. Adiciona coluna nullable
ALTER TABLE "List" ADD COLUMN "organizationId" TEXT;

-- 2. Backfill: organizationId = Board.organizationId via JOIN
UPDATE "List" l
SET "organizationId" = b."organizationId"
FROM "Board" b
WHERE l."boardId" = b."id";

-- 3. Promove a NOT NULL agora que todos têm valor
ALTER TABLE "List" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "List_organizationId_idx" ON "List"("organizationId");

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

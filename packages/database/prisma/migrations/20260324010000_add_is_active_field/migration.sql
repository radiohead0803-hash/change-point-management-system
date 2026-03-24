-- AlterTable
ALTER TABLE "change_classes" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "change_categories" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "change_items" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

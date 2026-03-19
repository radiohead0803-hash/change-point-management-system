-- Make basic info fields optional (nullable)
ALTER TABLE "change_events" ALTER COLUMN "customer" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "project" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "productLine" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "partNumber" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "factory" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "productionLine" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "department" DROP NOT NULL;

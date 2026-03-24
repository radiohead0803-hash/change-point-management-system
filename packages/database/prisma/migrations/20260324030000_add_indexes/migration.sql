-- CreateIndex
CREATE INDEX "idx_change_events_deleted_status" ON "change_events"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "idx_change_events_deleted_company" ON "change_events"("deletedAt", "companyId");

-- CreateIndex
CREATE INDEX "idx_change_events_deleted_created_by" ON "change_events"("deletedAt", "createdById");

-- CreateIndex
CREATE INDEX "idx_change_events_deleted_occurred" ON "change_events"("deletedAt", "occurredDate");

-- CreateIndex
CREATE INDEX "idx_change_events_receipt_month" ON "change_events"("receiptMonth");

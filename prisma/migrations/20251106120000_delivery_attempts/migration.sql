-- AlterTable
ALTER TABLE "webhook_deliveries" ADD COLUMN "response_status" INTEGER,
ADD COLUMN "response_body" TEXT,
ADD COLUMN "error_message" TEXT,
ADD COLUMN "delivered_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "request_timestamp" TIMESTAMP(3) NOT NULL,
    "response_timestamp" TIMESTAMP(3),
    "response_status" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_deliveries_organization_id_status_created_at_idx" ON "webhook_deliveries"("organization_id", "status", "created_at" ASC);

-- CreateIndex
CREATE INDEX "delivery_attempts_delivery_id_attempt_number_idx" ON "delivery_attempts"("delivery_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "webhook_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

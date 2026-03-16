-- AlterTable
ALTER TABLE "swap_requests" ADD COLUMN "manager_rejected_by" TEXT,
ADD COLUMN "manager_rejected_at" TIMESTAMP(3);

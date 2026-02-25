/*
  Warnings:

  - The primary key for the `change_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "rollback_snapshots" DROP CONSTRAINT "rollback_snapshots_change_request_id_fkey";

-- AlterTable
ALTER TABLE "change_requests" DROP CONSTRAINT "change_requests_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "confirmed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "executed_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rollback_snapshots" ALTER COLUMN "change_request_id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "rollback_snapshots" ADD CONSTRAINT "rollback_snapshots_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "audit_logs_request_idx" RENAME TO "audit_logs_request_id_idx";

-- RenameIndex
ALTER INDEX "audit_logs_target_idx" RENAME TO "audit_logs_target_type_target_id_idx";

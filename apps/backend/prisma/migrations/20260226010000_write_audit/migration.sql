ALTER TABLE "audit_logs"
  ADD COLUMN "target_type" TEXT NULL,
  ADD COLUMN "target_id" TEXT NULL,
  ADD COLUMN "status" TEXT NULL,
  ADD COLUMN "request_id" TEXT NULL,
  ADD COLUMN "before" JSONB NULL,
  ADD COLUMN "after" JSONB NULL,
  ADD COLUMN "diff" JSONB NULL,
  ADD COLUMN "error" TEXT NULL;

CREATE INDEX "audit_logs_target_idx" ON "audit_logs" ("target_type", "target_id");
CREATE INDEX "audit_logs_request_idx" ON "audit_logs" ("request_id");

CREATE TABLE "change_requests" (
  "id" UUID PRIMARY KEY,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "created_by_id" BIGINT NULL,
  "confirmed_by_id" BIGINT NULL,
  "expires_at" TIMESTAMPTZ NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "confirmed_at" TIMESTAMPTZ NULL,
  "executed_at" TIMESTAMPTZ NULL,
  CONSTRAINT "change_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "change_requests_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "change_requests_status_idx" ON "change_requests" ("status");

CREATE TABLE "rollback_snapshots" (
  "id" BIGSERIAL PRIMARY KEY,
  "change_request_id" UUID NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rollback_snapshots_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "change_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "rollback_snapshots_change_request_id_idx" ON "rollback_snapshots" ("change_request_id");

CREATE TABLE "sync_state" (
  "id" TEXT PRIMARY KEY,
  "last_run_at" TIMESTAMPTZ NULL,
  "last_success_at" TIMESTAMPTZ NULL,
  "last_error" TEXT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "customer_status_status_idx" ON "customer_status" ("status");
CREATE INDEX "customer_status_last_seen_idx" ON "customer_status" ("last_seen");

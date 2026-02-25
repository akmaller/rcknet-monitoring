CREATE TABLE "customer_status_events" (
  "id" BIGSERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "status" "ConnectionStatus" NOT NULL,
  "active_ip" TEXT NULL,
  "profile" TEXT NULL,
  "comment" TEXT NULL,
  "event_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "customer_status_events_username_idx" ON "customer_status_events" ("username");
CREATE INDEX "customer_status_events_event_at_idx" ON "customer_status_events" ("event_at");

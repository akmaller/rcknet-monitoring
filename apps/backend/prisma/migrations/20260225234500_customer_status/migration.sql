CREATE TYPE "ConnectionStatus" AS ENUM ('online', 'offline');

CREATE TABLE "customer_status" (
  "id" BIGSERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "status" "ConnectionStatus" NOT NULL,
  "active_ip" TEXT NULL,
  "uptime" TEXT NULL,
  "profile" TEXT NULL,
  "comment" TEXT NULL,
  "last_seen" TIMESTAMPTZ NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

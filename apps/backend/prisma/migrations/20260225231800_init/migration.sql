CREATE TYPE "Role" AS ENUM ('admin', 'operator', 'viewer');

CREATE TABLE "users" (
  "id" BIGSERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ NULL,
  "twofa_enabled" BOOLEAN NOT NULL DEFAULT false,
  "twofa_secret" TEXT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "refresh_sessions" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ NULL,
  "replaced_by_id" BIGINT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "refresh_sessions_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions" ("user_id");

CREATE TABLE "audit_logs" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NULL,
  "action" TEXT NOT NULL,
  "ip" TEXT NULL,
  "user_agent" TEXT NULL,
  "meta" JSONB NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" ("user_id");

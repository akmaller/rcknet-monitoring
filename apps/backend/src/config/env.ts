import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
};

const toTrustProxy = (value: string | undefined): boolean | number | string => {
  if (value === undefined) return false;
  const lowered = value.toLowerCase();
  if (lowered === 'true') return 1;
  if (lowered === 'false') return false;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isNaN(parsed)) return parsed;
  return value;
};

const listFromEnv = (value: string | undefined) =>
  value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  REQUEST_BODY_LIMIT: z.string().default('100kb'),
  REQUEST_TIMEOUT_MS: z.string().optional(),
  SERVE_FRONTEND: z.string().optional(),
  FRONTEND_DIST_PATH: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  CORS_METHODS: z.string().optional(),
  CORS_ALLOWED_HEADERS: z.string().optional(),
  SESSION_NAME: z.string().default('rcknet.sid'),
  SESSION_SECRET: z.string().min(16),
  SESSION_TTL_MINUTES: z.string().optional(),
  SESSION_COOKIE_SECURE: z.string().optional(),
  SESSION_COOKIE_SAMESITE: z.string().optional(),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  SESSION_COOKIE_PATH: z.string().optional(),
  CSRF_COOKIE_NAME: z.string().default('_csrf'),
  CSRF_HEADER_NAME: z.string().default('X-CSRF-Token'),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  RATE_LIMIT_LOGIN_MAX: z.string().optional(),
  SLOWDOWN_WINDOW_MS: z.string().optional(),
  SLOWDOWN_DELAY_AFTER: z.string().optional(),
  SLOWDOWN_DELAY_MS: z.string().optional(),
  AUTH_MAX_FAILED_ATTEMPTS: z.string().optional(),
  AUTH_LOCKOUT_MINUTES: z.string().optional(),
  MT_HOST: z.string().optional(),
  MT_PORT: z.string().optional(),
  MT_USER: z.string().optional(),
  MT_PASS: z.string().optional(),
  MT_TIMEOUT_MS: z.string().optional(),
  MT_RETRY_COUNT: z.string().optional(),
  MT_RETRY_DELAY_MS: z.string().optional(),
  MT_FETCH_SECRETS: z.string().optional(),
  SYNC_CRON: z.string().optional(),
  SYNC_LOCK_ID: z.string().optional(),
  HISTORY_ENABLED: z.string().optional(),
  HISTORY_RETENTION_DAYS: z.string().optional()
});

const parsed = envSchema.parse(process.env);

const env = {
  nodeEnv: parsed.NODE_ENV,
  port: toNumber(parsed.PORT, 4000),
  trustProxy: toTrustProxy(parsed.TRUST_PROXY),
  databaseUrl: parsed.DATABASE_URL,
  dbPoolMax: toNumber(parsed.DB_POOL_MAX, 10),
  logLevel: parsed.LOG_LEVEL,
  requestBodyLimit: parsed.REQUEST_BODY_LIMIT,
  requestTimeoutMs: toNumber(parsed.REQUEST_TIMEOUT_MS, 10000),
  serveFrontend: toBool(parsed.SERVE_FRONTEND, false),
  frontendDistPath: parsed.FRONTEND_DIST_PATH || '../../frontend/dist',
  cors: {
    origins: listFromEnv(parsed.CORS_ORIGINS),
    methods: listFromEnv(parsed.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE'),
    allowedHeaders: listFromEnv(parsed.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-CSRF-Token')
  },
  session: {
    name: parsed.SESSION_NAME,
    secret: parsed.SESSION_SECRET,
    ttlMinutes: toNumber(parsed.SESSION_TTL_MINUTES, 60),
    cookieSecure: toBool(parsed.SESSION_COOKIE_SECURE, false),
    cookieSameSite: parsed.SESSION_COOKIE_SAMESITE || 'Strict',
    cookieDomain: parsed.SESSION_COOKIE_DOMAIN || undefined,
    cookiePath: parsed.SESSION_COOKIE_PATH || '/'
  },
  csrf: {
    cookieName: parsed.CSRF_COOKIE_NAME,
    headerName: parsed.CSRF_HEADER_NAME
  },
  rateLimit: {
    windowMs: toNumber(parsed.RATE_LIMIT_WINDOW_MS, 60000),
    max: toNumber(parsed.RATE_LIMIT_MAX, 300),
    loginMax: toNumber(parsed.RATE_LIMIT_LOGIN_MAX, 10),
    slowdownWindowMs: toNumber(parsed.SLOWDOWN_WINDOW_MS, 60000),
    slowdownDelayAfter: toNumber(parsed.SLOWDOWN_DELAY_AFTER, 50),
    slowdownDelayMs: toNumber(parsed.SLOWDOWN_DELAY_MS, 500)
  },
  auth: {
    maxFailedAttempts: toNumber(parsed.AUTH_MAX_FAILED_ATTEMPTS, 5),
    lockoutMinutes: toNumber(parsed.AUTH_LOCKOUT_MINUTES, 15)
  },
  mikrotik: {
    host: parsed.MT_HOST || '10.200.200.1',
    port: toNumber(parsed.MT_PORT, 8728),
    user: parsed.MT_USER || 'admin',
    password: parsed.MT_PASS || '',
    timeout: toNumber(parsed.MT_TIMEOUT_MS, 5000),
    retryCount: toNumber(parsed.MT_RETRY_COUNT, 2),
    retryDelayMs: toNumber(parsed.MT_RETRY_DELAY_MS, 500),
    fetchSecrets: toBool(parsed.MT_FETCH_SECRETS, true)
  },
  syncCron: parsed.SYNC_CRON || '*/30 * * * * *',
  syncLockId: toNumber(parsed.SYNC_LOCK_ID, 83017),
  historyEnabled: toBool(parsed.HISTORY_ENABLED, true),
  historyRetentionDays: toNumber(parsed.HISTORY_RETENTION_DAYS, 90)
};

export default env;

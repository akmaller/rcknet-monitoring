import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import csrf from 'csurf';
import pinoHttp from 'pino-http';
import { Pool } from 'pg';
import path from 'path';
import env from './config/env';
import logger from './utils/logger';
import { globalLimiter, globalSlowDown } from './middleware/rateLimit';
import { requestId } from './middleware/requestId';
import { requestTimeout } from './middleware/timeout';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import customersRoutes from './routes/customers.routes';
import syncRoutes from './routes/sync.routes';
import historyRoutes from './routes/history.routes';
import pppSecretsRoutes from './routes/pppSecrets.routes';
import pppProfilesRoutes from './routes/pppProfiles.routes';
import changeRequestsRoutes from './routes/changeRequests.routes';
import pppoeUsersRoutes from './routes/pppoeUsers.routes';
import pppoeProfilesRoutes from './routes/pppoeProfiles.routes';
import auditRoutes from './routes/audit.routes';

const app = express();

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

app.use(requestId);
app.use(
  pinoHttp({
    level: env.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.newPassword',
        'req.body.oldPassword'
      ],
      remove: true
    },
    customProps: (req) => ({ requestId: req.id })
  })
);
app.use(requestTimeout);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' }
  })
);
app.use(hpp());
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.cors.origins.length === 0 || env.cors.origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: env.cors.methods,
  allowedHeaders: env.cors.allowedHeaders
};
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: env.requestBodyLimit }));

const PgSession = connectPgSimple(session);
const sessionPool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax
});

app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: 'sessions',
      createTableIfMissing: true
    }),
    name: env.session.name,
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.session.cookieSecure || env.nodeEnv === 'production',
      sameSite: env.session.cookieSameSite as 'lax' | 'strict' | 'none',
      domain: env.session.cookieDomain,
      path: env.session.cookiePath,
      maxAge: env.session.ttlMinutes * 60 * 1000
    }
  })
);

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

const csrfProtection = csrf({
  value: (req) => req.headers[env.csrf.headerName.toLowerCase()] as string
});
app.use(csrfProtection as unknown as express.RequestHandler);

app.use(globalLimiter);
app.use(globalSlowDown);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', cors(corsOptions));
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api', historyRoutes);
app.use('/api/ppp/secrets', pppSecretsRoutes);
app.use('/api/ppp/profiles', pppProfilesRoutes);
app.use('/api/change-requests', changeRequestsRoutes);
app.use('/api/pppoe/users', pppoeUsersRoutes);
app.use('/api/pppoe/profiles', pppoeProfilesRoutes);
app.use('/api/audit', auditRoutes);

if (env.serveFrontend) {
  const distPath = path.resolve(__dirname, env.frontendDistPath);
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

export default app;

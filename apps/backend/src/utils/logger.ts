import pino from 'pino';
import env from '../config/env';

const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.password',
      'req.body.newPassword',
      'req.body.oldPassword',
      'req.body.MT_PASS'
    ],
    remove: true
  }
});

export const auditLogger = logger.child({ type: 'audit' });

export default logger;

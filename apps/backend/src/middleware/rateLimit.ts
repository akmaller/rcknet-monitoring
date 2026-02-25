import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import env from '../config/env';

export const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false
});

export const globalSlowDown = slowDown({
  windowMs: env.rateLimit.slowdownWindowMs,
  delayAfter: env.rateLimit.slowdownDelayAfter,
  delayMs: () => env.rateLimit.slowdownDelayMs
});

export const loginLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false
});

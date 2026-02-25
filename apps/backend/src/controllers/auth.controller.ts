import { Request, Response, NextFunction } from 'express';
import { loginUser } from '../services/auth.service';
import { auditLog } from '../services/audit.service';
import env from '../config/env';

const regenerateSession = (req: Request) =>
  new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

const destroySession = (req: Request) =>
  new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const result = await loginUser(username, password);

    if (!result.ok || !result.user) {
      await auditLog({
        action: 'auth.login.failure',
        userId: null,
        req,
        meta: { username, reason: result.reason }
      });

      if (result.reason === 'locked') {
        return res.status(423).json({ error: 'Account locked' });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.user;
    await regenerateSession(req);
    req.session.user = user;

    await auditLog({
      action: 'auth.login.success',
      userId: user.id,
      req
    });

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.user?.id || null;
    await destroySession(req);

    await auditLog({
      action: 'auth.logout',
      userId,
      req
    });

    res.clearCookie(env.session.name, { path: env.session.cookiePath });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

export const me = async (req: Request, res: Response) => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({ user });
};

export const csrfToken = (req: Request, res: Response) => {
  const token = req.csrfToken();
  req.session.csrfIssuedAt = Date.now();
  req.session.save(() => {
    res.json({ csrfToken: token });
  });
};

import prisma from '../db/prisma';
import env from '../config/env';
import { verifyPassword } from '../utils/password';

export const loginUser = async (username: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.isActive) {
    return { ok: false, reason: 'invalid' as const };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked' as const, lockedUntil: user.lockedUntil };
  }
  if (user.lockedUntil && user.lockedUntil <= new Date() && user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const nextAttempts = user.failedLoginAttempts + 1;
    const lockUntil =
      nextAttempts >= env.auth.maxFailedAttempts
        ? new Date(Date.now() + env.auth.lockoutMinutes * 60 * 1000)
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: nextAttempts,
        lockedUntil: lockUntil || undefined
      }
    });

    return { ok: false, reason: 'invalid' as const };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  return {
    ok: true as const,
    user: {
      id: user.id.toString(),
      username: user.username,
      role: user.role
    }
  };
};

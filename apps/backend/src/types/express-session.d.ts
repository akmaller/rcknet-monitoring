import 'express-session';
import { Role } from '@prisma/client';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      role: Role;
    };
  }
}

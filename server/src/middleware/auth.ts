// Two "guards" that run BEFORE a route handler:
//   requireAuth        → "you must be logged in"
//   requireRole('x')   → "...and you must have role x"
//
// Usage in a route file:
//   router.get('/secret', requireAuth, requireRole('admin'), handler)
//
// Doc §16: role-based access and least privilege. The server is the real
// security boundary. Hiding a button in React protects nothing.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import type { UserWithProfile } from '../lib/serialize';

// Teach TypeScript that after requireAuth, `req.user` exists.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserWithProfile;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Please log in.');

  let userId: string;
  try {
    const payload = jwt.verify(header.slice('Bearer '.length), config.jwtSecret);
    userId = String(payload.sub);
  } catch {
    throw new HttpError(401, 'Session expired. Please log in again.');
  }

  // We re-load the user from the database on EVERY request instead of
  // trusting the token's contents. That way, the moment an admin suspends
  // someone, their very next request is refused (a token alone can't be "undone").
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { landlordProfile: true },
  });
  if (!user) throw new HttpError(401, 'Session expired. Please log in again.');
  // 403 (not 401) so the browser shows our message instead of "session expired".
  if (user.status !== 'active') throw new HttpError(403, 'This account has been suspended. Contact support.');

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to do that.');
    }
    next();
  };
}

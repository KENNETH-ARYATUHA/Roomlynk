// The ONE place where every error becomes a JSON response.
// Express recognises an error handler by its 4 parameters (err, req, res, next).
// It must be registered LAST in app.ts.

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Bad input (e.g. phone number in the wrong format) → 400 with a friendly message.
  if (err instanceof ZodError) {
    return res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid request.' });
  }
  // Errors we threw on purpose.
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  // Anything else is a bug. Log it for us, but never show internals to the user.
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
}

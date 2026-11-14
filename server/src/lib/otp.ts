// Helpers for one-time passwords (OTP).
// We never store the code itself, only a keyed hash (HMAC) of it.
// If someone steals the database, they still can't read live codes.

import { createHmac, randomInt } from 'node:crypto';
import { config } from '../config';

/** A random 6-digit code. randomInt is cryptographically secure (Math.random is NOT). */
export function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

/** Hash = HMAC(secret, phone + code). Including the phone ties the hash to one number. */
export function hashOtp(phone: string, code: string): string {
  return createHmac('sha256', config.jwtSecret).update(`${phone}:${code}`).digest('hex');
}

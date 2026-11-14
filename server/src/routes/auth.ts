// AUTHENTICATION — phone number + one-time code (OTP). No passwords.
//
//   POST /api/auth/request-otp   { phone }                → sends a code
//   POST /api/auth/verify-otp    { phone, code, ... }     → logs in OR registers, returns { user, token }
//   GET  /api/auth/me                                     → who am I? (fresh from the database)
//
// Registration and login share verify-otp: if the phone already has an
// account we log in, otherwise we create one (that's why the extra
// registration fields are optional in the schema below).

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import { generateOtp, hashOtp } from '../lib/otp';
import { recordAudit } from '../lib/audit';
import { toPublicUser } from '../lib/serialize';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const OTP_LIFETIME_MS = 5 * 60 * 1000; // a code works for 5 minutes
const OTP_RESEND_GAP_MS = 30 * 1000; // can't spam new codes faster than 30s
const OTP_MAX_ATTEMPTS = 5; // then the code is locked

// zod = a validator. We describe the shape we ACCEPT; anything else is rejected
// before our code runs. Never trust data coming from a browser.
const phoneSchema = z.string().regex(/^0\d{9}$/, 'Enter a valid Ugandan phone number, e.g. 0749537430');

// ── Step 1: ask for a code ─────────────────────────────────────────────
authRouter.post('/request-otp', async (req, res) => {
  const { phone } = z.object({ phone: phoneSchema }).parse(req.body);

  const recent = await prisma.otpCode.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - OTP_RESEND_GAP_MS) } },
  });
  if (recent) throw new HttpError(429, 'Please wait 30 seconds before asking for another code.');

  const code = generateOtp();
  await prisma.otpCode.deleteMany({ where: { phone } }); // only the newest code is valid
  await prisma.otpCode.create({
    data: { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_LIFETIME_MS) },
  });

  // TODO(later): send `code` by SMS through a provider (e.g. Africa's Talking).
  // Until then, in development we print it here AND return it so you can test.
  if (!config.isProduction) console.log(`[DEV ONLY] OTP for ${phone}: ${code}`);

  res.json({ sent: true, ...(config.isProduction ? {} : { devCode: code }) });
});

// ── Step 2: prove you own the phone → log in or register ───────────────
const verifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
  // Everything below is only needed when creating a NEW account:
  fullName: z.string().trim().min(2, 'Full name is required.').optional(),
  role: z.enum(['student', 'landlord']).optional(), // people can never self-register as admin/agent!
  email: z.union([z.email('That email address looks wrong.'), z.literal('')]).optional(),
  hostel: z
    .object({
      name: z.string().trim().min(2, 'Hostel name is required.'),
      district: z.string().trim().min(2, 'District is required.'),
      area: z.string().trim().min(2, 'Town / area is required.'),
      address: z.string().trim().optional(),
    })
    .optional(),
});

authRouter.post('/verify-otp', async (req, res) => {
  const input = verifySchema.parse(req.body);

  // 1) Check the code.
  const otp = await prisma.otpCode.findFirst({ where: { phone: input.phone }, orderBy: { createdAt: 'desc' } });
  if (!otp || otp.expiresAt < new Date()) throw new HttpError(400, 'That code has expired. Request a new one.');
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Request a new code.');
  if (otp.codeHash !== hashOtp(input.phone, input.code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, 'Incorrect code.');
  }
  await prisma.otpCode.deleteMany({ where: { phone: input.phone } }); // a code works only once

  // 2) Existing account → log in. New account → register.
  let user = await prisma.user.findUnique({ where: { phone: input.phone }, include: { landlordProfile: true } });

  if (user) {
    if (user.status !== 'active') throw new HttpError(403, 'This account has been suspended. Contact support.');
  } else {
    if (!input.fullName) throw new HttpError(404, 'No account found for this number. Please register first.');
    const role = input.role ?? 'student';
    if (role === 'landlord' && !input.hostel) throw new HttpError(400, 'Hostel name and location are required for landlords.');

    // Only landlords get a profile. It starts as "pending_review" (the default in the
    // schema): hidden from students until an admin approves it (doc §3.1).
    // Passing `undefined` to Prisma simply means "don't create one".
    const landlordProfile =
      role === 'landlord' && input.hostel
        ? {
            create: {
              hostelName: input.hostel.name,
              district: input.hostel.district,
              area: input.hostel.area,
              address: input.hostel.address || null,
            },
          }
        : undefined;

    user = await prisma.user.create({
      data: {
        phone: input.phone,
        fullName: input.fullName,
        email: input.email || null,
        role,
        phoneVerifiedAt: new Date(),
        landlordProfile,
      },
      include: { landlordProfile: true },
    });

    if (user.landlordProfile) {
      await recordAudit({ actorId: user.id, action: 'landlord.register', entityType: 'LandlordProfile', entityId: user.landlordProfile.id });
    }
  }

  // 3) Hand back a signed token. The browser sends it in the Authorization header from now on.
  const token = jwt.sign({ role: user.role }, config.jwtSecret, { subject: user.id, expiresIn: '7d' });
  res.json({ user: toPublicUser(user), token });
});

// ── Who am I? ──────────────────────────────────────────────────────────
// The frontend calls this when the app opens, so a landlord whose account was
// approved while they were away sees the new status without logging in again.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json(toPublicUser(req.user!));
});

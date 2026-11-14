// ADMIN-ONLY endpoints: the landlord review queue (doc §3.1 and §9.1).
//
//   GET  /api/admin/landlords?status=pending_review   → the queue
//   GET  /api/admin/landlords/:id                     → one registration + duplicate warnings
//   POST /api/admin/landlords/:id/decision            → approve / reject / request_changes / suspend / reinstate
//   GET  /api/admin/audit                             → recent audit events

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import { recordAudit } from '../lib/audit';
import { requireAuth, requireRole } from '../middleware/auth';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

const STATUSES = ['pending_review', 'approved', 'changes_required', 'rejected', 'suspended'] as const;

// A "state machine": for each decision, which statuses it may start from,
// where it ends up, and whether a written reason is compulsory (doc §3.1:
// "recording a reason for the decision"). Writing the rules as DATA instead of
// scattered if-statements makes them easy to read and change.
const TRANSITIONS = {
  approve: { from: ['pending_review'], to: 'approved', needsReason: false },
  reject: { from: ['pending_review'], to: 'rejected', needsReason: true },
  request_changes: { from: ['pending_review'], to: 'changes_required', needsReason: true },
  suspend: { from: ['approved'], to: 'suspended', needsReason: true },
  reinstate: { from: ['suspended'], to: 'approved', needsReason: true },
} as const;

type Decision = keyof typeof TRANSITIONS;

function toAdminView(p: {
  id: string; hostelName: string; district: string; area: string; address: string | null;
  accountStatus: string; reviewReason: string | null; submittedAt: Date; reviewedAt: Date | null;
  user: { fullName: string; phone: string; phoneVerifiedAt: Date | null };
}) {
  return {
    id: p.id,
    hostelName: p.hostelName,
    district: p.district,
    area: p.area,
    address: p.address,
    accountStatus: p.accountStatus,
    reviewReason: p.reviewReason,
    submittedAt: p.submittedAt.toISOString(),
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
    landlordName: p.user.fullName,
    phone: p.user.phone,
    phoneVerified: p.user.phoneVerifiedAt !== null,
  };
}

adminRouter.get('/landlords', async (req, res) => {
  const { status } = z.object({ status: z.enum(STATUSES).optional() }).parse(req.query);

  const rows = await prisma.landlordProfile.findMany({
    where: status ? { accountStatus: status } : {},
    include: { user: true },
    orderBy: { submittedAt: 'asc' }, // oldest first = fair queue
  });
  res.json(rows.map(toAdminView));
});

adminRouter.get('/landlords/:id', async (req, res) => {
  const profile = await prisma.landlordProfile.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!profile) throw new HttpError(404, 'Landlord registration not found.');

  // Doc §3.1: admin checks "duplicate accounts/hostels". Find other registrations
  // in the same area whose hostel name matches ignoring capital letters/spaces.
  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const sameArea = await prisma.landlordProfile.findMany({
    where: { area: profile.area, id: { not: profile.id } },
    include: { user: true },
  });
  const possibleDuplicates = sameArea
    .filter((o) => normalise(o.hostelName) === normalise(profile.hostelName))
    .map(toAdminView);

  res.json({ ...toAdminView(profile), possibleDuplicates });
});

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_changes', 'suspend', 'reinstate']),
  reason: z.string().trim().max(500).optional(),
});

adminRouter.post('/landlords/:id/decision', async (req, res) => {
  const { decision, reason } = decisionSchema.parse(req.body);
  const rule = TRANSITIONS[decision as Decision];

  const profile = await prisma.landlordProfile.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!profile) throw new HttpError(404, 'Landlord registration not found.');

  // Doc §16: "prevent a landlord or inspecting agent from approving their own account".
  if (profile.userId === req.user!.id) throw new HttpError(403, 'You cannot review your own account.');

  if (!(rule.from as readonly string[]).includes(profile.accountStatus)) {
    throw new HttpError(409, `Cannot ${decision.replace('_', ' ')} an account that is "${profile.accountStatus}".`);
  }
  if (rule.needsReason && !reason) throw new HttpError(400, 'A reason is required for this decision.');

  const updated = await prisma.landlordProfile.update({
    where: { id: profile.id },
    data: {
      accountStatus: rule.to,
      reviewReason: reason || null,
      reviewedById: req.user!.id,
      reviewedAt: new Date(),
    },
    include: { user: true },
  });

  await recordAudit({
    actorId: req.user!.id,
    action: `landlord.${decision}`,
    entityType: 'LandlordProfile',
    entityId: profile.id,
    reason,
  });

  res.json(toAdminView(updated));
});

adminRouter.get('/audit', async (_req, res) => {
  const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

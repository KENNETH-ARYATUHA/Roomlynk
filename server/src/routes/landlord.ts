//   PATCH /api/landlord/profile      → fix registration details and resubmit for review
//   /api/landlord/properties/...     → manage my properties (approved landlords only)
//
// (Rooms and camera evidence are added in later tasks.)

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import { recordAudit } from '../lib/audit';
import { toPublicUser } from '../lib/serialize';
import { requireAuth, requireRole, requireApprovedLandlord } from '../middleware/auth';

import { propertiesRouter } from './properties';
export const landlordRouter = Router();

// Every route in this file needs a logged-in landlord.
landlordRouter.use(requireAuth, requireRole('landlord'));

// Properties need an APPROVED account. (The /profile route below stays open to every
// landlord, because a rejected landlord must still be able to fix and resubmit.)
landlordRouter.use('/properties', requireApprovedLandlord, propertiesRouter);

const profileSchema = z.object({
  hostelName: z.string().trim().min(2, 'Hostel name is required.'),
  district: z.string().trim().min(2, 'District is required.'),
  area: z.string().trim().min(2, 'Town / area is required.'),
  address: z.string().trim().optional(),
});

// Doc §3.1: "If a landlord account is rejected or requires changes ... the landlord
// can correct and resubmit the registration."
landlordRouter.patch('/profile', async (req, res) => {
  const profile = req.user!.landlordProfile;
  if (!profile) throw new HttpError(404, 'No landlord profile found.');

  // Only certain states allow editing. An APPROVED landlord can't silently
  // rename their hostel; a SUSPENDED one must go through support.
  const editable = ['pending_review', 'changes_required', 'rejected'];
  if (!editable.includes(profile.accountStatus)) {
    throw new HttpError(409, 'Your account details cannot be edited in its current status.');
  }

  const data = profileSchema.parse(req.body);

  await prisma.landlordProfile.update({
    where: { id: profile.id },
    data: {
      hostelName: data.hostelName,
      district: data.district,
      area: data.area,
      address: data.address || null,
      accountStatus: 'pending_review', // back in the admin's queue
      reviewReason: null,
      submittedAt: new Date(),
    },
  });
  await recordAudit({ actorId: req.user!.id, action: 'landlord.resubmit', entityType: 'LandlordProfile', entityId: profile.id });

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, include: { landlordProfile: true } });
  res.json(toPublicUser(fresh));
});

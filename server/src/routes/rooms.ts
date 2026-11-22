// PUBLIC room search for students.
//
//   GET /api/rooms?area=&roomType=&minPrice=&maxPrice=&query=
//   GET /api/rooms/:id
//
// * THE MOST IMPORTANT RULE IN THIS FILE (doc section 16) *
// "Hiding an unapproved hostel in the user interface is not sufficient: rooms
//  belonging to pending, rejected or suspended landlord accounts must not be
//  retrievable through public APIs, direct links or map/search results."
//
// So the rule lives HERE, in the query, and every public endpoint reuses it.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import { toPublicRoom } from '../lib/serialize';
import { ROOM_TYPES, FACILITIES, BILLING_PERIODS, ROOM_STATUSES } from '../lib/roomOptions';

export const roomsRouter = Router();

// A room is publicly visible only if:
//   - the landlord clicked "publish"          (listingStatus = published)
//   - the landlord's account is approved      (accountStatus = approved)
//   - the user behind it isn't banned         (user.status = active)
//   - the room hasn't been removed            (deletedAt is empty)
// There is deliberately NO per-room admin approval (doc section 3.1).
const publiclyVisible = {
  listingStatus: 'published',
  deletedAt: null,
  property: { landlordProfile: { accountStatus: 'approved', user: { status: 'active' } } },
} as const;

const searchSchema = z.object({
  area: z.string().optional(),
  roomType: z.string().optional(),
  query: z.string().trim().optional(),
  minPrice: z.coerce.number().int().positive().optional(), // coerce: query strings arrive as text
  maxPrice: z.coerce.number().int().positive().optional(),
});

roomsRouter.get('/', async (req, res) => {
  const f = searchSchema.parse(req.query);

  const rooms = await prisma.room.findMany({
    where: {
      ...publiclyVisible,
      status: 'available', // doc section 5.2: occupied/reserved/maintenance rooms must not appear as available
      ...(f.roomType ? { roomType: f.roomType } : {}),
      ...((f.minPrice || f.maxPrice) ? { price: { ...(f.minPrice ? { gte: f.minPrice } : {}), ...(f.maxPrice ? { lte: f.maxPrice } : {}) } } : {}),
      property: {
        ...publiclyVisible.property,
        ...(f.area ? { area: f.area } : {}),
        // mode: 'insensitive' = ignore capital letters. SQLite did this by itself; PostgreSQL does not,
        // so without it a search for "rwamukundi" would not find "Rwamukundi Heights".
        ...(f.query ? { name: { contains: f.query, mode: 'insensitive' as const } } : {}),
      },
    },
    include: { property: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(rooms.map(toPublicRoom));
});

// The allowed choices for room types, facilities and so on. The landlord's room form and the
// student's filters both read this, so the lists live in ONE place (server/src/lib/roomOptions.ts).
// IMPORTANT: this must stay ABOVE '/:id', otherwise "options" would be treated as a room id.
roomsRouter.get('/options', (_req, res) => {
  res.json({
    roomTypes: ROOM_TYPES,
    facilities: FACILITIES,
    billingPeriods: BILLING_PERIODS,
    roomStatuses: ROOM_STATUSES,
  });
});

roomsRouter.get('/:id', async (req, res) => {
  // Same visibility rule, but we allow non-"available" rooms so a student with
  // an old link sees "no longer available" rather than a confusing 404.
  const room = await prisma.room.findFirst({
    where: { id: req.params.id, ...publiclyVisible },
    include: { property: true },
  });
  if (!room) throw new HttpError(404, 'Room not found.');
  res.json(toPublicRoom(room));
});
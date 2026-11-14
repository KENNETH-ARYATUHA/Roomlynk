// PUBLIC room search for students.
//
//   GET /api/rooms?area=&roomType=&minPrice=&maxPrice=&query=
//   GET /api/rooms/:id
//
// ★ THE MOST IMPORTANT RULE IN THIS FILE (doc §16) ★
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

export const roomsRouter = Router();

// A room is publicly visible only if:
//   • the landlord clicked "publish"          (listingStatus = published)
//   • the landlord's account is approved      (accountStatus = approved)
//   • the user behind it isn't banned         (user.status = active)
// There is deliberately NO per-room admin approval (doc §3.1).
const publiclyVisible = {
  listingStatus: 'published',
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
      status: 'available', // doc §5.2: occupied/reserved/maintenance rooms must not appear as available
      ...(f.roomType ? { roomType: f.roomType } : {}),
      ...((f.minPrice || f.maxPrice) ? { price: { ...(f.minPrice ? { gte: f.minPrice } : {}), ...(f.maxPrice ? { lte: f.maxPrice } : {}) } } : {}),
      property: {
        ...publiclyVisible.property,
        ...(f.area ? { area: f.area } : {}),
        ...(f.query ? { name: { contains: f.query } } : {}),
      },
    },
    include: { property: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(rooms.map(toPublicRoom));
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

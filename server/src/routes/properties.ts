// LANDLORD PROPERTIES (hostels).  CLAUDE.md section 6: "A property belongs to a landlord.
// A property can contain multiple rooms."
//
//   GET   /api/landlord/properties        → my properties (with a room count)
//   POST  /api/landlord/properties        → add a property
//   GET   /api/landlord/properties/:id    → one of my properties
//   PATCH /api/landlord/properties/:id    → edit one of my properties
//
// This router is mounted in routes/landlord.ts AFTER three guards, so by the time a
// request reaches the code below we already know: the user is logged in, is a
// landlord, and their account is approved.

import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Property } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import { recordAudit } from '../lib/audit';

export const propertiesRouter = Router();

// What we accept from the browser. Optional fields can be left out.
const propertySchema = z.object({
  name: z.string('Property name is required.').trim().min(2, 'Property name is required.').max(120),
  district: z.string('District is required.').trim().min(2, 'District is required.').max(80),
  area: z.string('Town / area is required.').trim().min(2, 'Town / area is required.').max(80),
  address: z.string().trim().max(200).optional(),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90.').max(90, 'Latitude must be between -90 and 90.').nullable().optional(),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180.').max(180, 'Longitude must be between -180 and 180.').nullable().optional(),
});

// For editing, every field becomes optional (send only what changed), but an empty edit is pointless.
const updateSchema = propertySchema.partial().refine((d) => Object.keys(d).length > 0, 'Nothing to update.');

// The guards guarantee this exists. The "!" tells TypeScript "trust me".
function myLandlordProfileId(req: Request): string {
  return req.user!.landlordProfile!.id;
}

// How a property is sent to the browser (a Property row plus how many rooms it has).
type PropertyWithCount = Property & { _count: { rooms: number } };

function toJson(p: PropertyWithCount) {
  return {
    id: p.id,
    name: p.name,
    district: p.district,
    area: p.area,
    address: p.address,
    latitude: p.latitude,
    longitude: p.longitude,
    roomCount: p._count.rooms,
    createdAt: p.createdAt.toISOString(),
  };
}

const withRoomCount = { _count: { select: { rooms: true } } } as const;

// "Kikungiri  LODGE" and "kikungiri lodge" count as the same name.
const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Find a property ONLY if it belongs to the logged-in landlord.
// If it exists but belongs to someone else, we answer "not found", exactly as if
// it didn't exist, so a landlord can't even discover which IDs exist (doc section 16).
async function findMine(req: Request) {
  const property = await prisma.property.findFirst({
    where: { id: req.params.id as string, landlordProfileId: myLandlordProfileId(req) },
    include: withRoomCount,
  });
  if (!property) throw new HttpError(404, 'Property not found.');
  return property;
}

async function assertNameIsFree(req: Request, name: string, exceptId?: string) {
  const mine = await prisma.property.findMany({ where: { landlordProfileId: myLandlordProfileId(req) } });
  const clash = mine.some((p) => p.id !== exceptId && normalise(p.name) === normalise(name));
  if (clash) throw new HttpError(409, 'You already have a property with that name.');
}

propertiesRouter.get('/', async (req, res) => {
  const properties = await prisma.property.findMany({
    where: { landlordProfileId: myLandlordProfileId(req) },
    include: withRoomCount,
    orderBy: { createdAt: 'asc' },
  });
  res.json(properties.map(toJson));
});

propertiesRouter.post('/', async (req, res) => {
  const data = propertySchema.parse(req.body); // throws a friendly 400 if anything is wrong
  await assertNameIsFree(req, data.name);

  const property = await prisma.property.create({
    data: {
      landlordProfileId: myLandlordProfileId(req),
      name: data.name,
      district: data.district,
      area: data.area,
      address: data.address || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    },
    include: withRoomCount,
  });

  await recordAudit({ actorId: req.user!.id, action: 'property.create', entityType: 'Property', entityId: property.id });
  res.status(201).json(toJson(property));
});

propertiesRouter.get('/:id', async (req, res) => {
  res.json(toJson(await findMine(req)));
});

propertiesRouter.patch('/:id', async (req, res) => {
  const existing = await findMine(req); // 404 if it isn't mine
  const data = updateSchema.parse(req.body);
  if (data.name !== undefined) await assertNameIsFree(req, data.name, existing.id);

  const property = await prisma.property.update({
    where: { id: existing.id },
    // In Prisma, `undefined` means "leave this field alone", so only what was sent changes.
    data: {
      name: data.name,
      district: data.district,
      area: data.area,
      address: data.address === undefined ? undefined : data.address || null,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    include: withRoomCount,
  });

  await recordAudit({ actorId: req.user!.id, action: 'property.update', entityType: 'Property', entityId: property.id });
  res.json(toJson(property));
});
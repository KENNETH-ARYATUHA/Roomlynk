// LANDLORD ROOMS.  CLAUDE.md section 5A: a landlord can add rooms, update them, mark them
// occupied or reserved, and remove them. Section 6: every room has its OWN price and status.
//
//   GET    /api/landlord/rooms                 -> my rooms (optional ?propertyId= to narrow to one property)
//   POST   /api/landlord/rooms                 -> add a room to one of my properties
//   GET    /api/landlord/rooms/:id             -> one of my rooms
//   PATCH  /api/landlord/rooms/:id             -> edit details, change status, publish or hide
//   DELETE /api/landlord/rooms/:id             -> remove a room (soft delete: the record is kept)
//
// This router is mounted in routes/landlord.ts behind three guards (logged in, landlord,
// APPROVED account). Every route below also checks that the room belongs to the
// logged-in landlord, because a guard can't know which rows belong to whom.

import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Property, Room } from '@prisma/client';
import { prisma } from '../db';
import { HttpError } from '../lib/errors';
import { recordAudit } from '../lib/audit';
import { ROOM_TYPES, FACILITIES, BILLING_PERIODS, ROOM_STATUSES, LANDLORD_LISTING_STATUSES } from '../lib/roomOptions';

export const landlordRoomsRouter = Router();

// ---------------------------------------------------------------------------
// What we accept from the browser
// ---------------------------------------------------------------------------
const createSchema = z.object({
  propertyId: z.string('Choose a property.').min(1, 'Choose a property.'),
  label: z.string('Room label is required.').trim().min(1, 'Room label is required.').max(20, 'Room label must be 20 characters or fewer.'),
  roomType: z.enum(ROOM_TYPES, { error: 'Choose a valid room type.' }),
  capacity: z.number('Capacity must be a whole number.').int('Capacity must be a whole number.').min(1, 'Capacity must be at least 1.').max(20, 'Capacity must be 20 or fewer.').optional(),
  price: z.number('Price is required.').int('Price must be a whole number of UGX.').min(1, 'Price must be greater than zero.').max(50_000_000, 'Price is too high.'),
  billingPeriod: z.enum(BILLING_PERIODS, { error: 'Billing period must be month or semester.' }).optional(),
  deposit: z.number('Deposit must be a number.').int('Deposit must be a whole number of UGX.').min(0, 'Deposit cannot be negative.').max(50_000_000, 'Deposit is too high.').optional(),
  otherCharges: z.string().trim().max(200, 'Other charges must be 200 characters or fewer.').optional(),
  // Only values from the fixed checklist are accepted (see lib/roomOptions.ts).
  facilities: z.array(z.enum(FACILITIES, { error: 'Unknown facility.' })).max(FACILITIES.length).optional(),
  houseRules: z.string().trim().max(1000, 'House rules must be 1000 characters or fewer.').optional(),
  description: z.string('Description is required.').trim().min(10, 'Describe the room in at least 10 characters.').max(2000, 'Description must be 2000 characters or fewer.'),
});

// Editing: every field optional (send only what changed). A room can never be moved to another
// property, so `propertyId` is left out; if a browser sends it anyway, zod silently drops it.
// `status` and `listingStatus` are only editable here, never when creating a room.
const updateSchema = createSchema
  .omit({ propertyId: true })
  .partial()
  .extend({
    status: z.enum(ROOM_STATUSES, { error: 'Unknown room status.' }).optional(),
    // A landlord may only choose draft / published / hidden. "suspended" is for administrators.
    listingStatus: z.enum(LANDLORD_LISTING_STATUSES, { error: 'Visibility must be draft, published or hidden.' }).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Nothing to update.');

const listQuerySchema = z.object({ propertyId: z.string().min(1).optional() });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const myLandlordProfileId = (req: Request): string => req.user!.landlordProfile!.id; // guards guarantee it

type RoomWithProperty = Room & { property: Property };

// Facilities are stored as JSON text in SQLite; read them back defensively.
function parseFacilities(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// How a room is sent to the LANDLORD (more than a student sees: visibility and timestamps).
function toLandlordRoom(r: RoomWithProperty) {
  return {
    id: r.id,
    propertyId: r.propertyId,
    propertyName: r.property.name,
    label: r.label,
    roomType: r.roomType,
    capacity: r.capacity,
    price: r.price,
    billingPeriod: r.billingPeriod,
    deposit: r.deposit,
    otherCharges: r.otherCharges,
    facilities: parseFacilities(r.facilities),
    houseRules: r.houseRules,
    description: r.description,
    status: r.status,
    listingStatus: r.listingStatus,
    photos: [] as string[], // filled in by the camera task later
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// "A1" and "a1 " count as the same label.
const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const unique = <T>(items: T[]): T[] => [...new Set(items)];

// A property, but ONLY if it belongs to the logged-in landlord. Someone else's property
// gets the same "not found" as one that doesn't exist, so IDs can't be probed.
async function findMyProperty(req: Request, propertyId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, landlordProfileId: myLandlordProfileId(req) } });
  if (!property) throw new HttpError(404, 'Property not found.');
  return property;
}

// A room, but ONLY if it belongs to the logged-in landlord (the ownership check goes through
// the room's property) and has not been removed.
async function findMyRoom(req: Request) {
  const room = await prisma.room.findFirst({
    where: { id: req.params.id as string, deletedAt: null, property: { landlordProfileId: myLandlordProfileId(req) } },
    include: { property: true },
  });
  if (!room) throw new HttpError(404, 'Room not found.');
  return room;
}

async function assertLabelFree(propertyId: string, label: string, exceptRoomId?: string) {
  const rooms = await prisma.room.findMany({ where: { propertyId, deletedAt: null } });
  if (rooms.some((r) => r.id !== exceptRoomId && normalise(r.label) === normalise(label))) {
    throw new HttpError(409, 'This property already has a room with that label.');
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
landlordRoomsRouter.get('/', async (req, res) => {
  const { propertyId } = listQuerySchema.parse(req.query);
  if (propertyId) await findMyProperty(req, propertyId); // 404 if that property isn't mine

  const rooms = await prisma.room.findMany({
    where: {
      deletedAt: null,
      property: { landlordProfileId: myLandlordProfileId(req) },
      ...(propertyId ? { propertyId } : {}),
    },
    include: { property: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(rooms.map(toLandlordRoom));
});

landlordRoomsRouter.post('/', async (req, res) => {
  const d = createSchema.parse(req.body);
  await findMyProperty(req, d.propertyId);
  await assertLabelFree(d.propertyId, d.label);

  const room = await prisma.room.create({
    data: {
      propertyId: d.propertyId,
      label: d.label,
      roomType: d.roomType,
      capacity: d.capacity ?? 1,
      price: d.price,
      billingPeriod: d.billingPeriod ?? 'month',
      deposit: d.deposit ?? 0,
      otherCharges: d.otherCharges || null,
      facilities: JSON.stringify(unique(d.facilities ?? [])),
      houseRules: d.houseRules || null,
      description: d.description,
      // A new room is ALWAYS a draft and available. The landlord publishes it when ready (CLAUDE.md 5A).
      // TODO(camera task): once in-app photos exist, publishing will require at least one photo.
      status: 'available',
      listingStatus: 'draft',
    },
    include: { property: true },
  });

  await recordAudit({ actorId: req.user!.id, action: 'room.create', entityType: 'Room', entityId: room.id });
  res.status(201).json(toLandlordRoom(room));
});

landlordRoomsRouter.get('/:id', async (req, res) => {
  res.json(toLandlordRoom(await findMyRoom(req)));
});

landlordRoomsRouter.patch('/:id', async (req, res) => {
  const room = await findMyRoom(req); // 404 if it isn't mine or was removed
  const d = updateSchema.parse(req.body);

  // An administrator suspended this room: the landlord can still fix its details,
  // but cannot make it visible again themselves.
  if (d.listingStatus !== undefined && room.listingStatus === 'suspended') {
    throw new HttpError(409, 'This room was suspended by an administrator, so its visibility cannot be changed. Contact support.');
  }
  if (d.label !== undefined) await assertLabelFree(room.propertyId, d.label, room.id);

  const updated = await prisma.room.update({
    where: { id: room.id },
    // In Prisma, `undefined` means "leave this field alone", so only what was sent changes.
    data: {
      label: d.label,
      roomType: d.roomType,
      capacity: d.capacity,
      price: d.price,
      billingPeriod: d.billingPeriod,
      deposit: d.deposit,
      otherCharges: d.otherCharges === undefined ? undefined : d.otherCharges || null,
      facilities: d.facilities === undefined ? undefined : JSON.stringify(unique(d.facilities)),
      houseRules: d.houseRules === undefined ? undefined : d.houseRules || null,
      description: d.description,
      status: d.status,
      listingStatus: d.listingStatus,
    },
    include: { property: true },
  });

  // Audit trail: status and visibility changes are recorded on their own, with "from -> to".
  const actorId = req.user!.id;
  if (d.status !== undefined && d.status !== room.status) {
    await recordAudit({ actorId, action: 'room.status_change', entityType: 'Room', entityId: room.id, reason: `${room.status} -> ${d.status}` });
  }
  if (d.listingStatus !== undefined && d.listingStatus !== room.listingStatus) {
    await recordAudit({ actorId, action: 'room.listing_change', entityType: 'Room', entityId: room.id, reason: `${room.listingStatus} -> ${d.listingStatus}` });
  }
  if (Object.keys(d).some((k) => k !== 'status' && k !== 'listingStatus')) {
    await recordAudit({ actorId, action: 'room.update', entityType: 'Room', entityId: room.id });
  }

  res.json(toLandlordRoom(updated));
});

// "Remove" never erases the record (CLAUDE.md: nothing is deleted; bookings and receipts must
// keep pointing at a real room). We stamp deletedAt, hide the room, and free up its label.
landlordRoomsRouter.delete('/:id', async (req, res) => {
  const room = await findMyRoom(req);

  // A room with a tenant (or a pending reservation) must not vanish by accident.
  if (room.status === 'reserved' || room.status === 'occupied') {
    throw new HttpError(409, 'Mark the room as available or unavailable before removing it.');
  }

  await prisma.room.update({
    where: { id: room.id },
    data: {
      deletedAt: new Date(),
      listingStatus: 'hidden',
      // The database insists that (property, label) is unique, even for removed rooms. Renaming the
      // removed room lets the landlord reuse the label (for example "A1") for a new room.
      label: `${room.label}~removed-${room.id.slice(-6)}`,
    },
  });

  await recordAudit({ actorId: req.user!.id, action: 'room.remove', entityType: 'Room', entityId: room.id, reason: room.label });
  res.json({ removed: true });
});
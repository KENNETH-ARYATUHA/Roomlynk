// "Serializing" = converting database rows into the exact JSON we want to
// send to the browser. Doing it in one place means we can never accidentally
// leak a field (like a landlord's phone number on a public room).

import type { User, LandlordProfile, Room, Property } from '@prisma/client';

export type UserWithProfile = User & { landlordProfile: LandlordProfile | null };
export type RoomWithProperty = Room & { property: Property };

export function toPublicUser(user: UserWithProfile) {
  const p = user.landlordProfile;
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    landlordProfile: p && {
      id: p.id,
      hostelName: p.hostelName,
      district: p.district,
      area: p.area,
      address: p.address,
      accountStatus: p.accountStatus,
      reviewReason: p.reviewReason,
      submittedAt: p.submittedAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
    },
  };
}

/** What a STUDENT is allowed to see about a room. Note: no landlord phone or ID. */
export function toPublicRoom(room: RoomWithProperty) {
  return {
    id: room.id,
    label: room.label,
    roomType: room.roomType,
    capacity: room.capacity,
    price: room.price,
    billingPeriod: room.billingPeriod,
    deposit: room.deposit,
    otherCharges: room.otherCharges,
    facilities: JSON.parse(room.facilities) as string[], // stored as JSON text
    houseRules: room.houseRules,
    description: room.description,
    status: room.status,
    photos: [] as string[], // Phase 2 adds in-app camera evidence
    latestInspectionAt: null as string | null, // Phase 4 adds inspections
    property: {
      id: room.property.id,
      name: room.property.name,
      district: room.property.district,
      area: room.property.area,
      address: room.property.address,
      latitude: room.property.latitude,
      longitude: room.property.longitude,
    },
  };
}

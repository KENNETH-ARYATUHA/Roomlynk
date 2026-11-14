// These types describe the JSON our API (the /server folder) sends back.
// Keeping them in ONE file means that if the server changes a field name,
// TypeScript shows red squiggles everywhere that needs updating —
// the build fails here instead of a student seeing a broken page.
//
// PHASE 1 changes vs the old file:
//   • 5 roles instead of 3 (doc §2)
//   • landlord accounts have an approval status (doc §3.3)
//   • a Room belongs to a Property and has its own price/status (doc §5.2)
//   • all subscription fields are gone: the business model is commission-based (doc §6.5)

export type UserRole = 'student' | 'landlord' | 'agent' | 'admin' | 'finance';

// The approval gate for landlords. Only "approved" can publish rooms.
export type LandlordAccountStatus =
  | 'pending_review'
  | 'approved'
  | 'changes_required'
  | 'rejected'
  | 'suspended';

export interface LandlordProfile {
  id: string;
  hostelName: string;
  district: string;
  area: string;
  address?: string | null;
  accountStatus: LandlordAccountStatus;
  reviewReason?: string | null; // why an admin rejected / asked for changes / suspended
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  email?: string | null;
  createdAt: string;
  landlordProfile?: LandlordProfile | null; // only present for landlords
}

// Doc §5.2 room statuses.
export type RoomStatus = 'available' | 'reserved' | 'occupied' | 'maintenance' | 'unavailable';

export interface Room {
  id: string;
  label: string; // "A3": unique inside its hostel
  roomType: string;
  capacity: number;
  price: number; // UGX per billingPeriod
  billingPeriod: string; // 'month' | 'semester'
  deposit: number;
  otherCharges?: string | null;
  facilities: string[];
  houseRules?: string | null;
  description: string;
  status: RoomStatus;
  photos: string[]; // filled in Phase 2 (in-app camera)
  latestInspectionAt: string | null; // filled in Phase 4 (inspections)
  property: {
    id: string;
    name: string;
    district: string;
    area: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface RoomSearchFilters {
  area?: string;
  roomType?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}

// ── Admin: landlord review queue ──
export interface AdminLandlord {
  id: string;
  hostelName: string;
  district: string;
  area: string;
  address?: string | null;
  accountStatus: LandlordAccountStatus;
  reviewReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  landlordName: string;
  phone: string;
  phoneVerified: boolean;
}

export interface AdminLandlordDetail extends AdminLandlord {
  possibleDuplicates: AdminLandlord[]; // same hostel name in the same area
}

export type AdminDecision = 'approve' | 'reject' | 'request_changes' | 'suspend' | 'reinstate';

export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
}

// Every API call returns this wrapper, so components check `.ok`
// instead of inspecting raw HTTP status codes everywhere.
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number; // HTTP status, e.g. 401. Lets us tell "logged out" apart from "server down"
}

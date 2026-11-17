// The allowed choices for rooms, in ONE place (CLAUDE.md rule 7: no duplicate configuration).
// The server uses these lists to validate input, and sends them to the website through
// GET /api/rooms/options so the forms and filters always match.
//
// `as const` makes TypeScript treat each list as fixed text values rather than any string,
// which lets zod (our validator) check input against exactly these values.

// Student housing only: Villa, Mansion, Penthouse and similar were removed from the choices.
export const ROOM_TYPES = ['Single', 'Double', 'Shared', 'Self-contained', 'Studio', 'Apartment'] as const;

// A fixed checklist (not free text) so the facility filter can match reliably:
// "wifi", "WiFi" and "Wi-Fi" must not become three different facilities.
export const FACILITIES = [
  'Water',
  'Electricity',
  'Wi-Fi',
  'Private bathroom',
  'Furnished',
  'Security',
  'Kitchen access',
  'Parking',
  'single bedroom',
  'double bedroom',
  'shared room',
  'self-contained',
  'studio',
  'apartment',
] as const;

export const BILLING_PERIODS = ['month', 'semester'] as const;

// CLAUDE.md section 6 (Available, Occupied, Maintenance, Unavailable) plus Reserved from section 5A.
export const ROOM_STATUSES = ['available', 'reserved', 'occupied', 'maintenance', 'unavailable'] as const;

// What a LANDLORD may set. A fourth value, 'suspended', exists in the database but only an
// administrator can set it (a later task).
export const LANDLORD_LISTING_STATUSES = ['draft', 'published', 'hidden'] as const;
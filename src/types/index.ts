// These mirror what your backend's Prisma models should look like.
// Keeping frontend types in lockstep with the backend is the actual payoff
// of a TypeScript-everywhere stack — a renamed field breaks the BUILD here,
// not a production booking flow.

export type UserRole = 'student' | 'landlord' | 'admin';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
 email?: string; // optional contact email, any provider — not restricted to university domains
  subscriptionActive: boolean;
  subscriptionExpiresAt?: string;
  createdAt: string;
}

export type RoomStatus = 'vacant' | 'booked';

export interface Room {
  id: string;
  landlordId: string;
  hostelName: string;
  area: string;
  roomType: string;
  price: number; // UGX per month
  description: string;
  photos: string[]; // Cloudinary URLs
  latitude: number;
  longitude: number;
  status: RoomStatus;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  roomId: string;
  studentId: string;
  landlordId: string;
  agreedPrice: number;
  status: BookingStatus;
  createdAt: string;
  room?: Pick<Room, 'hostelName' | 'area' | 'roomType'>;
}

export interface RoomSearchFilters {
  area?: string;
  roomType?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}

// Every API response is wrapped in this so components branch on `.ok`
// instead of inspecting raw HTTP status codes everywhere.
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
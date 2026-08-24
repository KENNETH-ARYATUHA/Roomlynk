
// Surfaces the 2-active-booking cap so a student understands why a third
// booking attempt fails, instead of it looking like a bug.

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/apiClient';
import type { Booking } from '@/types';

const ACTIVE_BOOKING_CAP = 2;

export function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      const result = await apiRequest<Booking[]>('/bookings/mine');
      if (result.ok && result.data) setBookings(result.data);
      setIsLoading(false);
    }
    fetchBookings();
  }, []);

  const activeCount = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length;

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="my-bookings">
      <h1>My Bookings</h1>
      <p className="my-bookings__cap-note">{activeCount} of {ACTIVE_BOOKING_CAP} active bookings used</p>

      {bookings.length === 0 && <p className="empty-state">No bookings yet — browse rooms to get started.</p>}

      <ul className="booking-list">
        {bookings.map((b) => (
          <li key={b.id} className={`booking-list__item booking-list__item--${b.status}`}>
            <strong>{b.room?.hostelName ?? 'Room'}</strong>
            <span>{b.room?.area}</span>
            <span>UGX {b.agreedPrice.toLocaleString()}</span>
            <span className="booking-list__status">{b.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Browsing this page is free; sending a booking request requires an active
// subscription. The UI reflects that directly instead of letting the click
// fail silently against the backend.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import type { Room } from '@/types';

export function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [shareVisit, setShareVisit] = useState(false);

  useEffect(() => {
    async function fetchRoom() {
      setIsLoading(true);
      const result = await apiRequest<Room>(`/rooms/${roomId}`);
      if (result.ok && result.data) setRoom(result.data);
      setIsLoading(false);
    }
    fetchRoom();
  }, [roomId]);

  async function handleBook() {
    if (!room) return;
    setIsBooking(true);
    setBookingMessage(null);

    // shareVisit tells the backend to trigger the automatic safety SMS to a
    // trusted contact before the student's visit.
    const result = await apiRequest(`/bookings`, {
      method: 'POST',
      body: { roomId: room.id, shareMyVisit: shareVisit },
    });

    setIsBooking(false);
    setBookingMessage(result.ok ? 'Booking request sent! The landlord will confirm shortly.' : result.error ?? 'Could not send booking request.');
  }

  if (isLoading) return <p>Loading…</p>;
  if (!room) return <p>Room not found — it may have just been booked by someone else.</p>;

  const canAct = user?.subscriptionActive; // gate only for messaging/booking, never for viewing

  return (
    <div className="room-detail">
      <div className="room-detail__gallery">
        {room.photos.map((url) => <img key={url} src={url} alt={room.hostelName} loading="lazy" />)}
      </div>

      <h1>{room.hostelName}</h1>
      <p>{room.area} · {room.roomType}</p>
      <p className="room-detail__price">UGX {room.price.toLocaleString()} / month</p>
      <p>{room.description}</p>

      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${room.latitude},${room.longitude}`}
        target="_blank"
        rel="noreferrer"
        className="room-detail__map-link"
      >
        Open location in Google Maps
      </a>

      {room.status === 'booked' ? (
        <p className="room-detail__unavailable">This room was just booked and is no longer available.</p>
      ) : !canAct ? (
        <div className="paywall-notice">
          <p>Subscribe (UGX 3,600/month) to message this landlord or book this room.</p>
          <Button onClick={() => (window.location.href = '/subscribe')}>Subscribe</Button>
        </div>
      ) : (
        <div className="room-detail__book">
          <label className="checkbox-row">
            <input type="checkbox" checked={shareVisit} onChange={(e) => setShareVisit(e.target.checked)} />
            Send my planned visit details to a trusted contact automatically
          </label>
          <Button onClick={handleBook} isLoading={isBooking}>Send Booking Request</Button>
          {bookingMessage && <p className="form-note">{bookingMessage}</p>}
        </div>
      )}
    </div>
  );
}
// One room, in full. Doc §5.1: students should see the room-specific price,
// billing period, deposit and other charges, facilities, rules and location,
// and be able to tell landlord-provided info apart from inspection-confirmed facts.
//
// Booking and enquiries arrive in Phase 3, so the action area is a placeholder.
// (The old subscription paywall is gone: the business model is commission.)

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/apiClient';
import type { Room } from '@/types';

export function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiRequest<Room>(`/rooms/${roomId}`).then((result) => {
      if (cancelled) return;
      setRoom(result.ok && result.data ? result.data : null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (isLoading) return <p>Loading…</p>;
  if (!room) return <p>Room not found. It may have been removed or is no longer listed.</p>;

  const { property } = room;

  return (
    <div className="room-detail">
      <div className="room-detail__gallery">
        {room.photos.length > 0 ? (
          room.photos.map((url) => <img key={url} src={url} alt={property.name} loading="lazy" />)
        ) : (
          <div className="room-card__no-photo">No in-app photos yet</div>
        )}
      </div>

      <h1>{property.name} · Room {room.label}</h1>
      <p>{property.area}, {property.district}{property.address ? ` · ${property.address}` : ''}</p>
      <p>{room.roomType} · sleeps {room.capacity}</p>

      <p className="room-detail__price">UGX {room.price.toLocaleString()} / {room.billingPeriod}</p>
      <ul className="detail-list">
        <li>Deposit: {room.deposit > 0 ? `UGX ${room.deposit.toLocaleString()}` : 'None'}</li>
        {room.otherCharges && <li>Other charges: {room.otherCharges}</li>}
        <li>Status: {room.status}</li>
      </ul>

      <h2>About this room</h2>
      <p>{room.description}</p>

      {room.facilities.length > 0 && (
        <>
          <h2>Facilities</h2>
          <ul className="chip-list">{room.facilities.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}

      {room.houseRules && (
        <>
          <h2>House rules</h2>
          <p>{room.houseRules}</p>
        </>
      )}

      {/* Doc §5.1: "Clearly distinguish landlord-provided information from facts confirmed during an inspection." */}
      <p className="trust-note">
        {room.latestInspectionAt
          ? `Inspected on ${new Date(room.latestInspectionAt).toLocaleDateString()}.`
          : 'Not yet inspected. Details above are provided by the landlord.'}
      </p>

      {property.latitude != null && property.longitude != null && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="room-detail__map-link"
        >
          Open location in Google Maps
        </a>
      )}

      <div className="paywall-notice">
        <p>Enquiries, viewing requests and booking are coming in the next release.</p>
      </div>
    </div>
  );
}

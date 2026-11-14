// The most repeated element in the app: one room in a grid.
// An optional `actions` slot lets the landlord screen add buttons later
// without duplicating this component.

import type { Room } from '@/types';
import type { ReactNode } from 'react';

interface RoomCardProps {
  room: Room;
  actions?: ReactNode;
}

const STATUS_LABEL: Record<Room['status'], string> = {
  available: 'Available',
  reserved: 'Reserved',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  unavailable: 'Unavailable',
};

export function RoomCard({ room, actions }: RoomCardProps) {
  return (
    <article className="room-card">
      <div className="room-card__photo-wrap">
        {room.photos[0] ? (
          <img src={room.photos[0]} alt={room.property.name} loading="lazy" />
        ) : (
          <div className="room-card__no-photo">No photo yet</div>
        )}
        <span className={`room-card__status room-card__status--${room.status}`}>{STATUS_LABEL[room.status]}</span>
      </div>
      <div className="room-card__body">
        <h3>{room.property.name} · {room.label}</h3>
        <p className="room-card__meta">{room.property.area} · {room.roomType}</p>
        {/* This price belongs to THIS room (doc §5.2: never one price for the whole hostel). */}
        <p className="room-card__price">UGX {room.price.toLocaleString()} / {room.billingPeriod}</p>
        {room.latestInspectionAt && <p className="room-card__inspected">✓ Inspected</p>}
        {actions && <div className="room-card__actions">{actions}</div>}
      </div>
    </article>
  );
}

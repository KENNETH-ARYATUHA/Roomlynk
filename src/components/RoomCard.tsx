
// The single most-repeated element in the app — used on both the student
// browse grid and the landlord "my listings" screen. An optional `actions`
// slot means it doesn't need to be duplicated with slightly different
// buttons in two places.

import type { Room } from '@/types';
import type { ReactNode } from 'react';

interface RoomCardProps {
  room: Room;
  actions?: ReactNode;
}

export function RoomCard({ room, actions }: RoomCardProps) {
  return (
    <article className="room-card">
      <div className="room-card__photo-wrap">
        {room.photos[0] ? (
          <img src={room.photos[0]} alt={room.hostelName} loading="lazy" />
        ) : (
          <div className="room-card__no-photo">No photo yet</div>
        )}
        <span className={`room-card__status room-card__status--${room.status}`}>
          {room.status === 'vacant' ? 'Vacant' : 'Booked'}
        </span>
      </div>
      <div className="room-card__body">
        <h3>{room.hostelName}</h3>
        <p className="room-card__meta">{room.area} · {room.roomType}</p>
        <p className="room-card__price">UGX {room.price.toLocaleString()} / month</p>
        {actions && <div className="room-card__actions">{actions}</div>}
      </div>
    </article>
  );
}
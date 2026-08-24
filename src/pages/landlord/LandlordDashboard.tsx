
// The free-cap enforcement lives visibly here: hitting 2 free rooms swaps
// the "Add Room" button for a "Subscribe" prompt. The vacant/booked toggle
// is the landlord's single most-used action, so it's inline on the card.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { RoomCard } from '@/components/RoomCard';
import { Button } from '@/components/ui/Button';
import type { Room } from '@/types';

const FREE_LISTING_CAP = 2;

export function LandlordDashboard() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMine() {
      const result = await apiRequest<Room[]>('/rooms/mine');
      if (result.ok && result.data) setRooms(result.data);
      setIsLoading(false);
    }
    fetchMine();
  }, []);

  async function toggleStatus(room: Room) {
    setTogglingId(room.id);
    const nextStatus = room.status === 'vacant' ? 'booked' : 'vacant';

    // We wait for the server response before updating state — a failed
    // toggle shouldn't silently show the wrong status to the landlord.
    const result = await apiRequest<Room>(`/rooms/${room.id}`, {
      method: 'PATCH',
      body: { status: nextStatus },
    });

    if (result.ok && result.data) {
      setRooms((prev) => prev.map((r) => (r.id === room.id ? result.data! : r)));
    }
    setTogglingId(null);
  }

  const atFreeCap = !user?.subscriptionActive && rooms.length >= FREE_LISTING_CAP;

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="landlord-dashboard">
      <div className="landlord-dashboard__header">
        <h1>My Listings</h1>
        {atFreeCap ? (
          <Link to="/subscribe"><Button>Subscribe to add more rooms</Button></Link>
        ) : (
          <Link to="/landlord/new"><Button>+ Add Room</Button></Link>
        )}
      </div>

      {!user?.subscriptionActive && (
        <p className="free-cap-note">{rooms.length} of {FREE_LISTING_CAP} free listings used</p>
      )}

      <div className="room-grid">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            actions={
              <Button variant="secondary" isLoading={togglingId === room.id} onClick={() => toggleStatus(room)}>
                Mark as {room.status === 'vacant' ? 'Booked' : 'Vacant'}
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}
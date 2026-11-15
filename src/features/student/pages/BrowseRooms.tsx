// Free, no subscription gate — filtering by area/type/price happens
// server-side via query params so the API can paginate later.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/services/apiClient';
import { RoomCard } from '@/features/student/components/RoomCard';
import type { Room, RoomSearchFilters } from '@/types';

const AREAS = ['Kikungiri', 'Nyabikoni', 'Kabale Town',  'Nyakiharo', 'Rwamukundi', 'Mwanjali', 'Kirigyime', 'Rutooma' ,'Makanga'];
const ROOM_TYPES = ['Single', 'Shared', 'Self-contained', 'Studio', 'double', 'Apartment', 'Hostel',  'Villa', 'Cottage', 'Bungalow', 'Mansion', 'Penthouse', 'Loft', 'Cabin', 'Chalet', 'Farmhouse', 'Ranch', 'Townhouse', 'Condominium', 'Duplex', 'Triplex'];

export function BrowseRooms() {
  const [filters, setFilters] = useState<RoomSearchFilters>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRooms() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.area) params.set('area', filters.area);
      if (filters.roomType) params.set('roomType', filters.roomType);
      if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
      if (filters.query) params.set('query', filters.query);

      const result = await apiRequest<Room[]>(`/rooms?${params.toString()}`);

      if (cancelled) return;
      if (result.ok && result.data) setRooms(result.data);
      else setError(result.error ?? 'Could not load rooms');
      setIsLoading(false);
    }

    fetchRooms();
    // Avoids a race where a slow earlier request overwrites a later filter change.
    return () => { cancelled = true; };
  }, [filters]);

  return (
    <div className="browse-page">
      <h1>Find a room</h1>

      <div className="filters">
        <input type="text" placeholder="Search hostel name…" value={filters.query ?? ''} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} />

        <select value={filters.area ?? ''} onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value || undefined }))}>
          <option value="">All areas</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filters.roomType ?? ''} onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value || undefined }))}>
          <option value="">All room types</option>
          {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <input type="number" placeholder="Max price (UGX)" value={filters.maxPrice ?? ''} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))} />
      </div>

      {isLoading && <p>Loading rooms…</p>}
      {error && <p className="form-error">{error}</p>}
      {!isLoading && !error && rooms.length === 0 && (
        <p className="empty-state">No vacant rooms match those filters yet. Try widening your search.</p>
      )}

      <div className="room-grid">
        {rooms.map((room) => (
          <Link key={room.id} to={`/browse/${room.id}`}>
            <RoomCard room={room} />
          </Link>
        ))}
      </div>
    </div>
  );
}

// Uploads photos straight to Cloudinary from the browser (backend never
// touches the binary data), captures GPS via the phone's own location API.

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const MAX_PHOTOS = 8;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await response.json();
  return data.secure_url as string;
}

export function ListingForm() {
  const navigate = useNavigate();

  const [hostelName, setHostelName] = useState('');
  const [area, setArea] = useState('');
  const [roomType, setRoomType] = useState('Single');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoFiles(Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS));
  }

  function captureGpsPin() {
    // Uses the phone's own GPS — no map picker UI needed for a landlord
    // standing in the actual room.
    if (!navigator.geolocation) {
      setError('GPS is not available on this device/browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not read your location. Enable location access and try again.')
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hostelName || !area || !price) { setError('Hostel name, area, and price are required.'); return; }
    if (!coords) { setError('Drop a GPS pin so students can find this room.'); return; }
    if (photoFiles.length === 0) { setError('Add at least one real photo of the room.'); return; }

    setIsSubmitting(true);

    try {
      // Uploading in parallel is much faster than sequential awaits when a
      // landlord picks 5-8 photos on a mobile connection.
      const photoUrls = await Promise.all(photoFiles.map(uploadToCloudinary));

      const result = await apiRequest('/rooms', {
        method: 'POST',
        body: { hostelName, area, roomType, price: Number(price), description, photos: photoUrls, latitude: coords.lat, longitude: coords.lng },
      });

      if (!result.ok) {
        setError(result.error ?? 'Could not create the listing.');
        setIsSubmitting(false);
        return;
      }

      navigate('/landlord');
    } catch {
      setError('Photo upload failed. Check your connection and try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="listing-form">
      <h1>Add a room</h1>
      <form onSubmit={handleSubmit}>
        <Input label="Hostel name" value={hostelName} onChange={(e) => setHostelName(e.target.value)} />
        <Input label="Area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Kikungiri" />

        <label className="field">
          <span className="field__label">Room type</span>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            <option>Single</option>
            <option>Shared</option>
            <option>Self-contained</option>
          </select>
        </label>

        <Input label="Price (UGX / month)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label className="field">
          <span className="field__label">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>

        <label className="field">
          <span className="field__label">Photos (up to {MAX_PHOTOS}, real photos only)</span>
          <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} />
          <p className="field__hint">{photoFiles.length} selected</p>
        </label>

        <Button type="button" variant="secondary" onClick={captureGpsPin}>
          {coords ? 'GPS pin captured ✓' : 'Drop GPS pin (use current location)'}
        </Button>

        {error && <p className="form-error">{error}</p>}
        <Button type="submit" isLoading={isSubmitting}>Publish Listing</Button>
      </form>
    </div>
  );
}
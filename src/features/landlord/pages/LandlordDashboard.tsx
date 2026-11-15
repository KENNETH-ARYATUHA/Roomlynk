// The landlord's home. What they see depends on their ACCOUNT STATUS
// (doc Â§3.3). This is the "approval gate" from the student's/landlord's side:
//
//   pending_review   â†’ "we're reviewing you" (nothing is public yet)
//   changes_required â†’ read the admin's reason, fix details, resubmit
//   rejected         â†’ same: reason + resubmit
//   approved         â†’ can manage rooms (Phase 2 adds the room tools)
//   suspended        â†’ blocked, contact support

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { apiRequest } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { LandlordProfile } from '@/types';

export function LandlordDashboard() {
  const { user, refreshUser } = useAuth();
  const profile = user?.landlordProfile;

  // Defensive: a user with role "landlord" should always have a profile.
  if (!user || !profile) return <p>Landlord profile not found. Please contact support.</p>;

  return (
    <div className="landlord-dashboard">
      <h1>{profile.hostelName}</h1>
      <p className="muted">{profile.area}, {profile.district}{profile.address ? ` Â· ${profile.address}` : ''}</p>

      {profile.accountStatus === 'pending_review' && (
        <div className="banner banner--info">
          <strong>Your registration is under review.</strong>
          <p>
            An administrator is checking your details. Your hostel and rooms are hidden from students until
            you are approved. This page updates when you check again.
          </p>
          <Button variant="secondary" onClick={refreshUser}>Check status again</Button>
        </div>
      )}

      {(profile.accountStatus === 'changes_required' || profile.accountStatus === 'rejected') && (
        <>
          <div className="banner banner--warn">
            <strong>
              {profile.accountStatus === 'changes_required' ? 'Changes are needed' : 'Your registration was not approved'}
            </strong>
            <p>Reason from the reviewer: {profile.reviewReason ?? 'No reason recorded.'}</p>
            <p>Correct your details below and resubmit for another review.</p>
          </div>
          <ResubmitForm profile={profile} onDone={refreshUser} />
        </>
      )}

      {profile.accountStatus === 'approved' && (
        <div className="banner banner--ok">
          <strong>Your account is approved âœ“</strong>
          <p>
            You can publish and manage rooms without any further approval. The room tools (with the in-app
            camera) arrive in the next release.
          </p>
        </div>
      )}

      {profile.accountStatus === 'suspended' && (
        <div className="banner banner--warn">
          <strong>Your account is suspended</strong>
          <p>Reason: {profile.reviewReason ?? 'No reason recorded.'}</p>
          <p>Your rooms are hidden from students. Please contact support to appeal.</p>
        </div>
      )}
    </div>
  );
}

// Lets a landlord fix their registration details after "changes required" / "rejected".
function ResubmitForm({ profile, onDone }: { profile: LandlordProfile; onDone: () => Promise<void> }) {
  // useState(initialValue): pre-fill the form with what they submitted before.
  const [hostelName, setHostelName] = useState(profile.hostelName);
  const [district, setDistrict] = useState(profile.district);
  const [area, setArea] = useState(profile.area);
  const [address, setAddress] = useState(profile.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await apiRequest('/landlord/profile', {
      method: 'PATCH',
      body: { hostelName, district, area, address },
    });

    setIsSubmitting(false);
    if (!result.ok) return setError(result.error ?? 'Could not resubmit.');
    await onDone(); // re-fetch the user â†’ status becomes "pending_review" and this form disappears
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Hostel name" value={hostelName} onChange={(e) => setHostelName(e.target.value)} />
      <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
      <Input label="Town / area" value={area} onChange={(e) => setArea(e.target.value)} />
      <Input label="Address or landmark (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
      <Button type="submit" isLoading={isSubmitting}>Resubmit for review</Button>
    </form>
  );
}


// Edits feature flags and subscription prices that the backend reads live —
// this is the piece that makes "no redeploy needed" real.

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';

interface FeatureFlags {
  landlordSubscriptionPriceUgx: number;
  studentSubscriptionPriceUgx: number;
  messagingEnabled: boolean;
  bookingEnabled: boolean;
}

interface AnalyticsSummary {
  activeUsers: number;
  totalListings: number;
  activeBookings: number;
  subscriptionConversions: number;
}

export function AdminDashboard() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const [flagsResult, analyticsResult] = await Promise.all([
        apiRequest<FeatureFlags>('/admin/feature-flags'),
        apiRequest<AnalyticsSummary>('/admin/analytics'),
      ]);
      if (flagsResult.ok && flagsResult.data) setFlags(flagsResult.data);
      if (analyticsResult.ok && analyticsResult.data) setAnalytics(analyticsResult.data);
    }
    fetchAll();
  }, []);

  async function saveFlags() {
    if (!flags) return;
    setIsSaving(true);
    setSaveMessage(null);

    const result = await apiRequest('/admin/feature-flags', { method: 'PATCH', body: flags });

    setIsSaving(false);
    setSaveMessage(result.ok ? 'Saved — live for all users now.' : result.error ?? 'Could not save.');
  }

  if (!flags || !analytics) return <p>Loading control panel…</p>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Control Panel</h1>

      <section className="admin-dashboard__analytics">
        <h2>Live usage</h2>
        <div className="stat-grid">
          <div className="stat-card"><span className="stat-card__value">{analytics.activeUsers}</span><span className="stat-card__label">Active users</span></div>
          <div className="stat-card"><span className="stat-card__value">{analytics.totalListings}</span><span className="stat-card__label">Total listings</span></div>
          <div className="stat-card"><span className="stat-card__value">{analytics.activeBookings}</span><span className="stat-card__label">Active bookings</span></div>
          <div className="stat-card"><span className="stat-card__value">{analytics.subscriptionConversions}</span><span className="stat-card__label">Subscription conversions</span></div>
        </div>
      </section>

      <section className="admin-dashboard__flags">
        <h2>Feature flags & pricing</h2>

        <label className="field">
          <span className="field__label">Landlord subscription price (UGX/month)</span>
          <input type="number" value={flags.landlordSubscriptionPriceUgx} onChange={(e) => setFlags({ ...flags, landlordSubscriptionPriceUgx: Number(e.target.value) })} />
        </label>

        <label className="field">
          <span className="field__label">Student subscription price (UGX/month)</span>
          <input type="number" value={flags.studentSubscriptionPriceUgx} onChange={(e) => setFlags({ ...flags, studentSubscriptionPriceUgx: Number(e.target.value) })} />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={flags.messagingEnabled} onChange={(e) => setFlags({ ...flags, messagingEnabled: e.target.checked })} />
          Messaging enabled platform-wide
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={flags.bookingEnabled} onChange={(e) => setFlags({ ...flags, bookingEnabled: e.target.checked })} />
          Booking enabled platform-wide
        </label>

        <Button onClick={saveFlags} isLoading={isSaving}>Save changes</Button>
        {saveMessage && <p className="form-note">{saveMessage}</p>}
      </section>
    </div>
  );
}
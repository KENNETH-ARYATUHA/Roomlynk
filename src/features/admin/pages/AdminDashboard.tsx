// ADMIN: landlord review queue (doc Â§3.1 and Â§9.1).
//
// Left: a list of registrations filtered by status. Right: the selected
// registration with duplicate warnings and the decision buttons.
// There is NO room-approval queue. Rooms publish instantly once the landlord
// account is approved (doc Â§3.1).

import { useEffect, useState } from 'react';
import { apiRequest } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import type { AdminDecision, AdminLandlord, AdminLandlordDetail, AuditEvent, LandlordAccountStatus } from '@/types';

const TABS: { status: LandlordAccountStatus; label: string }[] = [
  { status: 'pending_review', label: 'Pending' },
  { status: 'approved', label: 'Approved' },
  { status: 'changes_required', label: 'Changes needed' },
  { status: 'rejected', label: 'Rejected' },
  { status: 'suspended', label: 'Suspended' },
];

// Which decisions make sense for each status (mirrors TRANSITIONS in server/src/routes/admin.ts).
const ACTIONS: Record<LandlordAccountStatus, { decision: AdminDecision; label: string; variant: 'primary' | 'secondary' | 'danger'; needsReason: boolean }[]> = {
  pending_review: [
    { decision: 'approve', label: 'Approve', variant: 'primary', needsReason: false },
    { decision: 'request_changes', label: 'Request changes', variant: 'secondary', needsReason: true },
    { decision: 'reject', label: 'Reject', variant: 'danger', needsReason: true },
  ],
  approved: [{ decision: 'suspend', label: 'Suspend', variant: 'danger', needsReason: true }],
  suspended: [{ decision: 'reinstate', label: 'Reinstate', variant: 'primary', needsReason: true }],
  changes_required: [],
  rejected: [],
};

export function AdminDashboard() {
  const [tab, setTab] = useState<LandlordAccountStatus>('pending_review');
  const [list, setList] = useState<AdminLandlord[]>([]);
  const [selected, setSelected] = useState<AdminLandlordDetail | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bumping this number re-runs the effect below, which re-fetches the data.
  // (Simpler and lint-friendly compared with calling fetch functions by hand.)
  const [reloadKey, setReloadKey] = useState(0);

  // Load the queue for the selected tab + the audit log.
  // Runs on first render, whenever the tab changes, and whenever reloadKey changes.
  useEffect(() => {
    let cancelled = false; // ignore answers that arrive after we've moved on

    Promise.all([
      apiRequest<AdminLandlord[]>(`/admin/landlords?status=${tab}`),
      apiRequest<AuditEvent[]>('/admin/audit'),
    ]).then(([listResult, auditResult]) => {
      if (cancelled) return;
      if (listResult.ok && listResult.data) setList(listResult.data);
      if (auditResult.ok && auditResult.data) setAudit(auditResult.data);
    });

    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  async function open(id: string) {
    setMessage(null);
    setReason('');
    const result = await apiRequest<AdminLandlordDetail>(`/admin/landlords/${id}`);
    if (result.ok && result.data) setSelected(result.data);
  }

  async function decide(decision: AdminDecision, needsReason: boolean) {
    if (!selected) return;
    if (needsReason && !reason.trim()) return setMessage('Please write a reason. The landlord will see it.');

    setBusy(true);
    const result = await apiRequest(`/admin/landlords/${selected.id}/decision`, {
      method: 'POST',
      body: { decision, reason: reason.trim() || undefined },
    });
    setBusy(false);

    if (!result.ok) return setMessage(result.error ?? 'Could not save the decision.');
    setMessage('Decision saved.');
    setSelected(null);
    setReason('');
    setReloadKey((k) => k + 1); // refresh the queue and the audit log
  }

  return (
    <div className="admin-dashboard">
      <h1>Landlord reviews</h1>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.status} className={tab === t.status ? 'tabs__active' : ''} onClick={() => { setTab(t.status); setSelected(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="review-layout">
        <ul className="review-list">
          {list.length === 0 && <li className="empty-state">Nothing here.</li>}
          {list.map((l) => (
            <li key={l.id}>
              <button onClick={() => open(l.id)} className={selected?.id === l.id ? 'review-list__active' : ''}>
                <strong>{l.hostelName}</strong>
                <span>{l.landlordName} Â· {l.area}</span>
                <span className="muted">Submitted {new Date(l.submittedAt).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>

        <section className="review-detail">
          {!selected ? (
            <p className="muted">Select a registration to review it.</p>
          ) : (
            <>
              <h2>{selected.hostelName}</h2>
              <ul className="detail-list">
                <li>Landlord: {selected.landlordName}</li>
                <li>Phone: {selected.phone} {selected.phoneVerified ? '(verified âœ“)' : '(NOT verified)'}</li>
                <li>Location: {selected.area}, {selected.district}{selected.address ? ` Â· ${selected.address}` : ''}</li>
                <li>Status: {selected.accountStatus}</li>
                {selected.reviewReason && <li>Last reason: {selected.reviewReason}</li>}
              </ul>

              {selected.possibleDuplicates.length > 0 && (
                <div className="banner banner--warn">
                  <strong>Possible duplicate hostel</strong>
                  {selected.possibleDuplicates.map((d) => (
                    <p key={d.id}>{d.hostelName} in {d.area}, registered by {d.landlordName} ({d.phone})</p>
                  ))}
                </div>
              )}

              {ACTIONS[selected.accountStatus].length > 0 && (
                <>
                  <label className="field">
                    <span className="field__label">Reason (required to reject, request changes, suspend or reinstate)</span>
                    <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  <div className="button-row">
                    {ACTIONS[selected.accountStatus].map((a) => (
                      <Button key={a.decision} variant={a.variant} isLoading={busy} onClick={() => decide(a.decision, a.needsReason)}>
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {message && <p className="form-note">{message}</p>}
        </section>
      </div>

      <h2>Recent audit events</h2>
      <ul className="audit-list">
        {audit.map((e) => (
          <li key={e.id}>
            <code>{e.action}</code> Â· {new Date(e.createdAt).toLocaleString()}
            {e.reason && <span className="muted"> Â· â€œ{e.reason}â€</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

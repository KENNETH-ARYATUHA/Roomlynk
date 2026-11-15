// Step 2: type the 6-digit code. Used for BOTH registering and logging in:
// the server decides which one based on whether the phone already has an account.

import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type VerifyParams } from '@/app/providers/AuthProvider';
import { homePathFor } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Whatever Register.tsx / Login.tsx passed along with navigate(..., { state }).
interface LocationState {
  phone: string;
  fullName?: string;
  role?: VerifyParams['role'];
  email?: string;
  hostel?: VerifyParams['hostel'];
  devCode?: string;
}

export function VerifyOtp() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;

  // If someone opens /verify-otp directly (no state), send them back.
  // Redirects belong in an effect, not in the render body.
  useEffect(() => {
    if (!state?.phone) navigate('/login', { replace: true });
  }, [state, navigate]);

  if (!state?.phone) return null;
  const s = state; // a const keeps TypeScript's "it's not null" knowledge inside handleSubmit

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code sent to your phone');

    setIsSubmitting(true);
    const result = await verifyOtp({
      phone: s.phone,
      code,
      fullName: s.fullName,
      role: s.role,
      email: s.email,
      hostel: s.hostel,
    });
    setIsSubmitting(false);

    if (!result.ok || !result.user) return setError(result.error ?? 'Incorrect or expired code');

    // Land on the right home for this user's ROLE (the server told us what it is).
    navigate(homePathFor(result.user), { replace: true });
  }

  return (
    <div className="auth-page">
      <h1>Enter verification code</h1>
      <p className="auth-page__hint">We sent a 6-digit code to {s.phone}</p>

      {/* import.meta.env.DEV is true only under `npm run dev`; it's stripped out of production builds. */}
      {import.meta.env.DEV && s.devCode && (
        <p className="dev-hint">Dev mode: your code is <strong>{s.devCode}</strong> (real SMS comes later)</p>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Verification code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
        />
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" isLoading={isSubmitting}>Verify &amp; Continue</Button>
      </form>
    </div>
  );
}

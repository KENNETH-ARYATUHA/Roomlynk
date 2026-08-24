import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/types';

interface LocationState {
  phone: string;
  fullName: string;
  role: UserRole;
  email?: string;
}

export function VerifyOtp() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  // Redirect belongs in an effect, not directly in the render body --
  // calling navigate() while rendering can trigger "Cannot update a
  // component while rendering a different component" in Strict Mode.
  useEffect(() => {
    if (!state?.phone) {
      navigate('/register', { replace: true });
    }
  }, [state, navigate]);

  if (!state?.phone) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code sent to your phone');
      return;
    }

    setIsSubmitting(true);
    const result = await verifyOtp({
      phone: state!.phone,
      code,
      fullName: state!.fullName,
      role: state!.role,
      email: state!.email,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Incorrect or expired code');
      return;
    }

    navigate(state!.role === 'landlord' ? '/landlord' : '/browse', { replace: true });
  }

  return (
    <div className="auth-page">
      <h1>Enter verification code</h1>
      <p className="auth-page__hint">We sent a 6-digit code to {state.phone}</p>

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
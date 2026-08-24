// Step 1 of the OTP flow: collect details, request the code.
// Email is optional and open to any provider — a university-only requirement
// would exclude alumni landlords, transfer students, and anyone who hasn't
// activated their university account yet. Phone is the one thing everyone has.

import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/types';

export function Register() {
  const location = useLocation();
  // Welcome.tsx can pass an initial role via route state (e.g. clicking
  // "I'm a Landlord" there pre-selects the landlord tab here).
  const initialRole = (location.state as { role?: UserRole } | null)?.role ?? 'student';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestOtp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^0\d{9}$/.test(phone)) {
      setError('Enter a valid Ugandan phone number, e.g. 0749537430');
      return;
    }
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    // Email is optional. If they do enter one, just check it's a plausible
    // email — no domain restriction. This is the only validation on it.
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That email address doesn\'t look right — leave it blank if unsure');
      return;
    }

    setIsSubmitting(true);
    const result = await requestOtp(phone);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Could not send the code. Try again.');
      return;
    }

    navigate('/verify-otp', { state: { phone, fullName, role, email } });
  }

  return (
    <div className="auth-page">
      <h1>Create your account</h1>

      <div className="role-toggle">
        <button type="button" className={role === 'student' ? 'role-toggle__active' : ''} onClick={() => setRole('student')}>
          I'm a Student
        </button>
        <button type="button" className={role === 'landlord' ? 'role-toggle__active' : ''} onClick={() => setRole('landlord')}>
          I'm a Landlord
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Aryatuha Kenneth" />
        <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />

        {/* Optional and available to both roles now — a landlord may want
            email updates just as much as a student does. */}
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="any email works"
        />

        {error && <p className="form-error">{error}</p>}

        <Button type="submit" isLoading={isSubmitting}>Send verification code</Button>
      </form>
    </div>
  );
}
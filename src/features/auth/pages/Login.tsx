// LOGIN for people who already have an account: just a phone number.
// (Before Phase 1, "Log in" showed the full registration form, which asked
// returning users for their name again.)

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function Login() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestOtp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^0\d{9}$/.test(phone)) return setError('Enter a valid Ugandan phone number, e.g. 0749537430');

    setIsSubmitting(true);
    const result = await requestOtp(phone);
    setIsSubmitting(false);

    if (!result.ok) return setError(result.error ?? 'Could not send the code. Try again.');

    // No fullName/role here â†’ the server treats this as a LOGIN, not a sign-up.
    navigate('/verify-otp', { state: { phone, devCode: result.devCode } });
  }

  return (
    <div className="auth-page">
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" isLoading={isSubmitting}>Send verification code</Button>
      </form>
      <p className="auth-page__hint">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

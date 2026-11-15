// REGISTRATION: step 1 of 2 (step 2 is VerifyOtp.tsx).
//
// Doc §3: "A landlord creates an account using their full name, active phone
// number, hostel name and hostel location." So the form shows extra hostel
// fields when "I'm a Landlord" is selected. Landlord accounts then wait for
// administrator approval; student accounts work immediately.
//
// Nothing is saved yet at this step. We validate, ask the server to text a
// code, and pass everything to the next page through the router's `state`.

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type SignupRole = 'student' | 'landlord';

export function Register() {
  const location = useLocation();
  // Welcome.tsx can pre-select a role ("I'm a Landlord" button).
  const initialRole = (location.state as { role?: SignupRole } | null)?.role ?? 'student';

  const [role, setRole] = useState<SignupRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Landlord-only fields (doc §3.1: district, town/area, address or landmark):
  const [hostelName, setHostelName] = useState('');
  const [district, setDistrict] = useState('Kabale');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestOtp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setError(null);

    // Quick checks for fast feedback. The server re-checks everything,
    // because a browser can always be bypassed.
    if (!fullName.trim()) return setError('Full name is required.');
    if (!/^0\d{9}$/.test(phone)) return setError('Enter a valid Ugandan phone number, e.g. 0749537430');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("That email address doesn't look right. Leave it blank if unsure.");
    }
    if (role === 'landlord' && (!hostelName.trim() || !district.trim() || !area.trim())) {
      return setError('Hostel name, district and town/area are required for landlords.');
    }

    setIsSubmitting(true);
    const result = await requestOtp(phone);
    setIsSubmitting(false);

    if (!result.ok) return setError(result.error ?? 'Could not send the code. Try again.');

    navigate('/verify-otp', {
      state: {
        phone,
        fullName: fullName.trim(),
        role,
        email: email.trim(),
        hostel:
          role === 'landlord'
            ? { name: hostelName.trim(), district: district.trim(), area: area.trim(), address: address.trim() }
            : undefined,
        devCode: result.devCode, // only exists when the server runs in development
      },
    });
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
        <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="any email works" />

        {/* This whole block only exists in the page when role === 'landlord'. */}
        {role === 'landlord' && (
          <fieldset className="form-section">
            <legend>Your hostel</legend>
            <p className="field__hint">
              An administrator reviews every landlord before their hostel appears to students.
            </p>
            <Input label="Hostel name" value={hostelName} onChange={(e) => setHostelName(e.target.value)} />
            <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
            <Input label="Town / area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Kikungiri" />
            <Input label="Address or landmark (optional)" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Behind the market" />
          </fieldset>
        )}

        {error && <p className="form-error">{error}</p>}
        <Button type="submit" isLoading={isSubmitting}>Send verification code</Button>
      </form>

      <p className="auth-page__hint">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
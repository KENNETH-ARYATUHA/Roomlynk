// The actual entry point of the PWA — this is what a student or landlord
// sees the first time they open the installed app icon. It sells the two
// value props (free browsing for students, free first listings for
// landlords) and routes each into Register pre-selected to their role.

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { useEffect } from 'react';

export function Welcome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // If someone already has a session, skip the pitch and take them straight
  // to their dashboard the welcome screen is only for first-time/logged-out visits.
  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === 'landlord' ? '/landlord' : '/browse', { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || user) return null;

  return (
    <div className="welcome-page">
      <h1>Find a room. Fill a room. No middlemen.</h1>
      <p className="welcome-page__subtitle">
        Campus RoomLynk connects students and landlords directly: verified
        listings, real photos, no agent fees.
      </p>

      <div className="welcome-page__cards">
        <div className="welcome-card">
          <h2>I'm a Student</h2>
          <p>Browse vacant rooms near campus for free. Message and book once you're ready.</p>
          <Button onClick={() => navigate('/register', { state: { role: 'student' } })}>
            Find a Room
          </Button>
        </div>

        <div className="welcome-card">
          <h2>I'm a Landlord</h2>
          <p>List your first 2 rooms for free. Reach students directly, no agent cut.</p>
          <Button
            variant="secondary"
            onClick={() => navigate('/register', { state: { role: 'landlord' } })}
          >
            List a Room
          </Button>
        </div>
      </div>

      <p className="welcome-page__login-hint">
        Already have an account? <a onClick={() => navigate('/register')}>Log in</a>
      </p>
    </div>
  );
}
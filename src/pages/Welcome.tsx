// The first screen of the installed app. Tagline from the documentation:
// "Find. Verify. Pay. Stay."  Logged-in users skip straight to their home.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { homePathFor } from '@/lib/roles';
import { Button } from '@/components/ui/Button';

export function Welcome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate(homePathFor(user), { replace: true });
  }, [isLoading, user, navigate]);

  if (isLoading || user) return null;

  return (
    <div className="welcome-page">
      <h1>Find. Verify. Pay. Stay.</h1>
      <p className="welcome-page__subtitle">
        Campus RoomLynk connects students with verified landlords: current room
        photos taken in the app, clear prices, and rent records you can trust.
      </p>

      <div className="welcome-page__cards">
        <div className="welcome-card">
          <h2>I'm a Student</h2>
          <p>Browse available rooms from approved landlords, compare prices and see exactly what you get.</p>
          <Button onClick={() => navigate('/register', { state: { role: 'student' } })}>Find a Room</Button>
        </div>

        <div className="welcome-card">
          <h2>I'm a Landlord</h2>
          <p>Register your hostel. Once approved you can publish and manage your rooms yourself.</p>
          <Button variant="secondary" onClick={() => navigate('/register', { state: { role: 'landlord' } })}>
            Register my Hostel
          </Button>
        </div>
      </div>

      <p className="welcome-page__login-hint">
        Already have an account? <a onClick={() => navigate('/login')}>Log in</a>
      </p>
    </div>
  );
}


import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">Campus RoomLynk</Link>

      {user && (
        <div className="navbar__links">
          {user.role === 'student' && (
            <>
              <Link to="/browse">Browse</Link>
              <Link to="/my-bookings">My Bookings</Link>
            </>
          )}
          {user.role === 'landlord' && (
            <>
              <Link to="/landlord">My Listings</Link>
              <Link to="/landlord/new">Add Room</Link>
            </>
          )}
          {user.role === 'admin' && <Link to="/admin">Control Panel</Link>}

          {/* Subscription state is visible everywhere, not tucked into a
              settings page — the business model hinges on this being seen. */}
          <span className={`navbar__sub-badge ${user.subscriptionActive ? 'navbar__sub-badge--active' : 'navbar__sub-badge--inactive'}`}>
            {user.subscriptionActive ? 'Subscribed' : 'Free tier'}
          </span>

          <button onClick={handleLogout} className="navbar__logout">Log out</button>
        </div>
      )}
    </nav>
  );
}
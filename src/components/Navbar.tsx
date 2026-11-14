import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Human-friendly labels for the landlord's approval status chip.
const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  changes_required: 'Changes needed',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const landlordStatus = user?.landlordProfile?.accountStatus;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">Campus RoomLynk</Link>

      {user && (
        <div className="navbar__links">
          {/* Each role sees only its own links. (The SERVER enforces this too.) */}
          {user.role === 'student' && (
            <>
              <Link to="/browse">Browse</Link>
              <Link to="/my-bookings">My Bookings</Link>
            </>
          )}
          {user.role === 'landlord' && <Link to="/landlord">My Hostel</Link>}
          {user.role === 'admin' && <Link to="/admin">Landlord Reviews</Link>}

          {/* The landlord's approval status is visible everywhere, because it decides what they can do. */}
          {landlordStatus && (
            <span className={`status-chip status-chip--${landlordStatus}`}>{STATUS_LABEL[landlordStatus]}</span>
          )}

          <button onClick={handleLogout} className="navbar__logout">Log out</button>
        </div>
      )}
    </nav>
  );
}

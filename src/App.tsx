// The map of the whole app: which URL shows which page, and who may see it.
//
// <ProtectedRoute allowedRoles={[...]}> wraps a group of routes and redirects
// anyone whose role isn't in the list. (The SERVER enforces the same rules;
// this just gives people a sensible screen instead of an error.)

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Welcome } from '@/pages/Welcome';
import { ComingSoon } from '@/pages/ComingSoon';
import { Register } from '@/pages/auth/Register';
import { Login } from '@/pages/auth/Login';
import { VerifyOtp } from '@/pages/auth/VerifyOtp';
import { BrowseRooms } from '@/pages/student/BrowseRooms';
import { RoomDetail } from '@/pages/student/RoomDetail';
import { MyBookings } from '@/pages/student/MyBookings';
import { LandlordDashboard } from '@/pages/landlord/LandlordDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="app-main">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Welcome />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />

            {/* Students */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/browse" element={<BrowseRooms />} />
              <Route path="/browse/:roomId" element={<RoomDetail />} />
              <Route path="/my-bookings" element={<MyBookings />} />
            </Route>

            {/* Landlords (what they can DO inside depends on their approval status) */}
            <Route element={<ProtectedRoute allowedRoles={['landlord']} />}>
              <Route path="/landlord" element={<LandlordDashboard />} />
            </Route>

            {/* Administrators */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Agents and finance staff: workspaces come in later phases */}
            <Route element={<ProtectedRoute allowedRoles={['agent', 'finance']} />}>
              <Route path="/coming-soon" element={<ComingSoon />} />
            </Route>

            {/* Unknown URLs → landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

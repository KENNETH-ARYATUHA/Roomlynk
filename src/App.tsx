import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Register } from '@/pages/auth/Register';
import { VerifyOtp } from '@/pages/auth/VerifyOtp';
import { BrowseRooms } from '@/pages/student/BrowseRooms';
import { RoomDetail } from '@/pages/student/RoomDetail';
import { MyBookings } from '@/pages/student/MyBookings';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LandlordDashboard } from '@/pages/landlord/LandlordDashboard';
import { ListingForm } from '@/pages/landlord/ListingForm';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { Welcome } from '@/pages/Welcome';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="app-main">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />

            {/* Student Routes - Protected */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/browse" element={<BrowseRooms />} />
              <Route path="/browse/:roomId" element={<RoomDetail />} />
              <Route path="/my-bookings" element={<MyBookings />} />
            </Route>

            {/* Landlord Routes - Protected */}
            <Route element={<ProtectedRoute allowedRoles={['landlord']} />}>
              <Route path="/landlord" element={<LandlordDashboard />} />
              <Route path="/landlord/new" element={<ListingForm />} />
            </Route>

            {/* Admin Routes - Protected */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Catch-all: unknown URLs go to the landing page, not straight to
                the register form -- a logged-in user hitting a bad link should
                still land somewhere sensible, and ProtectedRoute/Welcome
                already handle redirecting them onward if needed. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards a route — redirects to /login if not authenticated,
 * or to / if authenticated but wrong tier.
 *
 * Usage:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute requirePro>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } />
 */
export default function ProtectedRoute({ children, requirePro = false }) {
  const { isAuthenticated, userTier } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePro && userTier !== 'pro') {
    return <Navigate to="/" replace />;
  }

  return children;
}

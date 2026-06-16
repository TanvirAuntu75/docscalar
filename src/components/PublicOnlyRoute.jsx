import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Prevents logged-in users from seeing login/signup pages.
 * If authenticated, immediately redirect to landing page.
 *
 * Usage:
 *   <Route path="/login" element={
 *     <PublicOnlyRoute>
 *       <Login />
 *     </PublicOnlyRoute>
 *   } />
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

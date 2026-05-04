import { Navigate } from 'react-router-dom';
import { can, isAdmin, getLandingPath } from '../utils/permissions';

/**
 * ProtectedRoute — wraps any route that requires a permission.
 *
 * Usage:
 *   <ProtectedRoute><Dashboard/></ProtectedRoute>                                       // login required
 *   <ProtectedRoute permission="courses.manage"><Courses/></ProtectedRoute>            // single permission
 *   <ProtectedRoute permission={['interview.take', 'interview.review']}><Interview/></ProtectedRoute>  // any-of
 *   <ProtectedRoute adminOnly><Users/></ProtectedRoute>                                 // admin only
 *
 * Behavior:
 *   - No token → /login
 *   - Has token but lacks access → user's own landing page
 */
export default function ProtectedRoute({ children, permission, adminOnly }) {
  const token = localStorage.getItem('token');

  if (!token) return <Navigate to="/login" replace />;

  if (adminOnly && !isAdmin()) {
    return <Navigate to={getLandingPath()} replace />;
  }

  // Permission can be a string OR array (any-of)
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    const hasAny = perms.some(p => can(p));
    if (!hasAny) return <Navigate to={getLandingPath()} replace />;
  }

  return children;
}
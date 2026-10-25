import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  let userRole = localStorage.getItem('userRole') || '';

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      userRole = user?.role || userRole;
    } catch {
      // Data user yang rusak tidak digunakan; pemeriksaan token/role di bawah tetap berlaku.
    }
  }

  const normalizedRole = String(userRole).toUpperCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

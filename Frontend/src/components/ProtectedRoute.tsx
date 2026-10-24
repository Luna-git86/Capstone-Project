import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole'); 

  // Jika tidak ada token, kembalikan ke login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Jika role tidak sesuai dengan rute yang dituju, lemparkan ke halaman unauthorized
  if (userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Jika aman, render halaman
  return <Outlet />;
}
// Frontend/src/components/Topbar.tsx
import React from 'react';

const Topbar: React.FC = () => {
  const userName = localStorage.getItem('userName') || 'Pengguna RSIA';
  const userRole = localStorage.getItem('userRole') || 'STAF';

  // Ambil inisial nama untuk avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Format tanggal hari ini dalam Bahasa Indonesia
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Informasi Tanggal Real-Time */}
      <div>
        <p className="text-sm font-medium text-slate-500">{today}</p>
      </div>

      {/* Profil Pengguna Aktif (Tanpa Placeholder Statis) */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            {userName}
          </p>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            {userRole}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
          {getInitials(userName)}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
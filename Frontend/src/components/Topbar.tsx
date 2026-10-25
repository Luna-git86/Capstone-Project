import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();
  let user: any = null;
  try {
    const savedUser = localStorage.getItem('user');
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    user = null;
  }
  const role = String(user?.role || localStorage.getItem('userRole') || 'Pengguna').toUpperCase();
  const roleLabel: Record<string, string> = {
    DIREKTUR: 'Direktur',
    KADIV: 'Kepala Divisi',
    KOORDINATOR: 'Koordinator',
    STAF: 'Staf',
    ADMIN: 'Administrator',
  };
  const name = user?.name || user?.nama || user?.email || 'Pengguna';
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 md:px-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900 md:text-2xl">{role === 'DIREKTUR' ? 'Portal Direktur' : role === 'KADIV' ? 'Portal Manajerial' : 'Portal E-Ticketing'}</h1>
        <p className="mt-1 text-xs capitalize text-slate-500 md:text-sm">{dateLabel}</p>
      </div>
      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden text-right sm:block">
          <p className="max-w-48 truncate text-sm font-bold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{roleLabel[role] || role}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-800">
          {String(name).trim().charAt(0).toUpperCase() || 'U'}
        </div>
        <button type="button" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 md:text-sm">Keluar</button>
      </div>
    </header>
  );
}

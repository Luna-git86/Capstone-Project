// Frontend/src/components/Sidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { getAuthRole, getAuthUserName, getAuthDivisiNama, clearAuthSession } from '../utils/authStorage';
import { getMenuItems } from './navConfig';

interface SidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, onClose }) => {
  const navigate = useNavigate();

  const userRole = getAuthRole() || 'STAF';
  const userName = getAuthUserName('Pegawai RSIA');
  const userDivisi = getAuthDivisiNama();

  const visibleMenus = getMenuItems(userRole);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="relative w-full lg:w-64 max-w-full bg-brand-deep text-white flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden sidebar-custom-scroll scroll-smooth overscroll-contain">
      {/* Bentuk organik dekoratif */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-mint/25 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-40 -left-20 w-40 h-40 rounded-full bg-white/5" />

      <div className="relative p-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center font-extrabold text-sm shrink-0">
            RS
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-base leading-tight truncate">E-Ticketing RSIA</h1>
            <p className="text-xs text-white/70 truncate">{"Qurrata A'yun"}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="lg:hidden p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative mx-4 mb-2 p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm min-w-0 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-peach text-brand-deep font-extrabold text-sm flex items-center justify-center shrink-0">
          {getInitials(userName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{userName}</p>
          <div className="mt-1 flex flex-wrap gap-1 min-w-0">
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-white text-brand-deep rounded-full uppercase tracking-wide truncate max-w-full">
              {userRole}
            </span>
            {userRole !== 'ADMIN' && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-white/15 text-white rounded-full truncate max-w-full">
                {userDivisi}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative px-4 py-4 flex-1">
        <p className="px-3 text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
          Menu Utama
        </p>
        <nav className="space-y-1" aria-label="Menu utama">
          {visibleMenus.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onNavigate?.()}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ease-out active:scale-98 ${
                    isActive
                      ? 'bg-white text-brand-deep shadow-md font-bold'
                      : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1.5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-brand-orange text-white' : 'bg-white/10 text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="truncate">{item.title}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="relative p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white/10 hover:bg-brand-orange text-white rounded-2xl text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

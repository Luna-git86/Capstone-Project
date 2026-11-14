// Frontend/src/components/BottomNav.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { getAuthRole } from '../utils/authStorage';
import { getMenuItems } from './navConfig';

interface BottomNavProps {
  onOpenMenu: () => void;
}

const PRIORITY_PATHS = ['/semua-tugas', '/riwayat-laporan', '/menu-laporan', '/laporkan-masalah', '/monitoring-notifikasi'];

const BottomNav: React.FC<BottomNavProps> = ({ onOpenMenu }) => {
  const userRole = getAuthRole() || 'STAF';
  const menus = getMenuItems(userRole);

  const [home, ...rest] = menus;
  const prioritized = PRIORITY_PATHS.map((p) => rest.find((m) => m.path === p)).filter(
    (m): m is NonNullable<typeof m> => Boolean(m)
  );
  const quickItems = [home, ...prioritized].filter(Boolean).slice(0, 3);

  return (
    <nav
      aria-label="Navigasi cepat"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-clinical-border rounded-t-3xl shadow-[0_-8px_24px_-12px_rgb(15_92_67/0.25)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around px-2 h-16">
        {quickItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
                    isActive ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="truncate max-w-[72px]">{item.shortTitle}</span>
                    <span
                      aria-hidden="true"
                      className={`w-1 h-1 rounded-full ${isActive ? 'bg-brand-orange' : 'bg-transparent'}`}
                    />
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Buka semua menu"
            className="w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span>Menu</span>
            <span aria-hidden="true" className="w-1 h-1 rounded-full bg-transparent" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default BottomNav;

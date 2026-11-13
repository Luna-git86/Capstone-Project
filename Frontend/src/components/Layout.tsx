import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAnalyticsTerminal = location.pathname === '/analitik-kunjungan';

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] w-full bg-clinical-bg overflow-hidden">
      {/* Sidebar Desktop: Tetap terlihat pada layar >= 1024px (lg) */}
      <div className="hidden lg:block w-64 flex-shrink-0 z-20 h-full">
        <Sidebar />
      </div>

      {/* Sidebar Mobile Drawer: Tampil utuh tanpa terpotong pada layar < 1024px */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex lg:hidden">
          <div
            className="fixed inset-0 bg-clinical-ink/50 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-[100dvh] w-[min(18rem,85vw)] max-w-full flex-shrink-0 overflow-hidden shadow-2xl">
            <Sidebar
              onNavigate={() => setMobileSidebarOpen(false)}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Kolom Kanan: Topbar & Konten Utama */}
      <div className="flex flex-col flex-1 min-w-0 w-full h-full overflow-hidden">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />

        {/* Main Content: Terkunci 100% tanpa scroll vertikal pada desktop di /analitik-kunjungan */}
        <main
          className={
            isAnalyticsTerminal
              ? 'flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden lg:h-[calc(100dvh-4rem)] lg:overflow-hidden flex flex-col bg-clinical-bg'
              : 'flex-1 overflow-y-auto overflow-x-hidden w-full bg-clinical-bg'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAnalyticsTerminal = location.pathname === '/analitik-kunjungan';

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Tutup sidebar otomatis saat menekan tombol Escape di keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };
    if (mobileSidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="flex h-[100dvh] w-full bg-clinical-bg overflow-hidden">
      {/* Sidebar Desktop: Tetap terlihat pada layar >= 1024px (lg) */}
      <div className="hidden lg:block w-64 flex-shrink-0 z-20 h-full">
        <Sidebar />
      </div>

      {/* Sidebar Mobile Drawer: Animasi Geser Halus (Slide In & Slide Out) saat Dibuka & Ditutup */}
      <div
        className={`fixed inset-0 z-[100] flex lg:hidden transition-all duration-300 ease-in-out ${
          mobileSidebarOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none delay-300'
        }`}
        aria-hidden={!mobileSidebarOpen}
      >
        {/* Backdrop dengan animasi memudar (fade in / out) */}
        <div
          className={`fixed inset-0 bg-brand-deep/60 backdrop-blur-xs mobile-drawer-backdrop ${
            mobileSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Panel Sidebar dengan animasi bergeser halus (slide in & slide out dari kiri) */}
        <div
          className={`relative z-10 h-[100dvh] w-[min(18rem,85vw)] max-w-full flex-shrink-0 overflow-hidden rounded-r-3xl shadow-2xl mobile-drawer-panel transform ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            onNavigate={() => setMobileSidebarOpen(false)}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Kolom Kanan: Topbar & Konten Utama */}
      <div className="flex flex-col flex-1 min-w-0 w-full h-full overflow-hidden">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />

        {/* Main Content: Terkunci 100% tanpa scroll vertikal pada desktop di /analitik-kunjungan */}
        <main
          className={
            isAnalyticsTerminal
              ? 'flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden flex flex-col bg-clinical-bg scroll-smooth overscroll-contain'
              : 'flex-1 overflow-y-auto overflow-x-hidden w-full pb-20 lg:pb-0 bg-clinical-bg scroll-smooth overscroll-contain'
          }
        >
          <div key={location.pathname} className="page-enter-animation w-full min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Navigasi bawah khusus mobile */}
      <BottomNav onOpenMenu={() => setMobileSidebarOpen(true)} />
    </div>
  );
}

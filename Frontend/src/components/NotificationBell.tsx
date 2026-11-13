// Frontend/src/components/NotificationBell.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  X,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ExternalLink,
  ShieldAlert,
  Inbox
} from 'lucide-react';
import api from '../services/api';
import { getAuthUserId, getAuthRole, getAuthUserName, getAuthDivisiNama } from '../utils/authStorage';

interface NotificationItem {
  id: number;
  ticketId: number;
  ticketTitle: string;
  ticketStatus: string;
  ticketPrioritas: string;
  jenisTiket: string;
  divisiNama: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const userId = getAuthUserId() || 'guest';
  const userRole = getAuthRole() || 'STAF';
  const userName = getAuthUserName('Pengguna RSIA');
  const userDivisi = getAuthDivisiNama();

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastReadId, setLastReadId] = useState<number>(() => {
    const saved = localStorage.getItem(`rsia_last_read_notif_${userId}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Fungsi Buka & Tutup Popover Notifikasi dengan Animasi Jatuh & Terangkat
  const handleOpen = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsClosing(false);
    setIsOpen(true);
    if (notifications.length === 0) {
      fetchNotifications(false);
    }
  };

  const handleClose = () => {
    if (isClosing || !isOpen) return;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 240); // 240ms sesuai durasi animate-notif-lift
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Ambil data notifikasi dari API
  const fetchNotifications = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await api.get('/notifications/my-notifications');
      const data: NotificationItem[] = response.data?.data || [];
      setNotifications(data);
    } catch (err) {
      // Gagal memuat tidak mengganggu fungsionalitas topbar
      console.warn('Gagal menyinkronkan notifikasi akun:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`rsia_last_read_notif_${userId}`);
    setLastReadId(saved ? parseInt(saved, 10) : 0);
    fetchNotifications(false);

    // Auto-polling pembaruan notifikasi setiap 12 detik
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 12000);

    return () => clearInterval(interval);
  }, [userId]);

  // Handle klik di luar popover untuk menutup otomatis
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isClosing]);

  // Hitung jumlah notifikasi belum dibaca (ID lebih tinggi dari lastReadId)
  const unreadCount = notifications.filter((item) => item.id > lastReadId).length;

  // Tandai semua notifikasi telah dibaca
  const handleMarkAllAsRead = () => {
    if (notifications.length > 0) {
      const maxId = Math.max(...notifications.map((n) => n.id));
      setLastReadId(maxId);
      localStorage.setItem(`rsia_last_read_notif_${userId}`, String(maxId));
    }
  };

  // Navigasi ke tiket terkait saat notifikasi diklik
  const handleItemClick = (item: NotificationItem) => {
    // Update lastReadId jika item ini lebih baru
    if (item.id > lastReadId) {
      setLastReadId((prev) => {
        const next = Math.max(prev, item.id);
        localStorage.setItem(`rsia_last_read_notif_${userId}`, String(next));
        return next;
      });
    }

    handleClose();

    // Arahkan ke rute yang sesuai
    if (item.jenisTiket === 'LAPORAN') {
      navigate(`/detail-laporan/${item.ticketId}`);
    } else {
      navigate(`/detail-tugas/${item.ticketId}`);
    }
  };

  // Bersihkan format bot/markdown telegram bila ada agar teks nyaman dibaca
  const cleanMessage = (msg: string) => {
    if (!msg) return 'Ada pembaruan status pada tiket Anda.';
    return msg
      .replace(/[*_`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  };

  // Format waktu relatif (time ago) yang ramah
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
  };

  // Ikon dan warna semantik berdasarkan tipe event
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'DIRECTIVE_ASSIGNED':
        return {
          icon: ClipboardList,
          bg: 'bg-emerald-50 text-[#0f5c43] border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Tugas Baru',
        };
      case 'TASK_SUBMITTED':
      case 'REPORT_SUBMITTED':
        return {
          icon: Clock,
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Laporan Masuk',
        };
      case 'TASK_REVISION_REQUIRED':
      case 'REPORT_REJECTED':
        return {
          icon: RotateCcw,
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Perlu Revisi',
        };
      case 'TASK_VERIFIED':
      case 'STATUS_CHANGED':
        return {
          icon: CheckCircle2,
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-500',
          label: 'Pembaruan',
        };
      case 'DEADLINE_SOON':
      case 'TASK_ESCALATED':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Peringatan SLA',
        };
      default:
        return {
          icon: Inbox,
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: 'Info Tiket',
        };
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Tombol Lonceng Notifikasi: z-[85] agar tidak pernah ter-blur atau tertutup bayangan */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Buka notifikasi akun"
        aria-expanded={isOpen}
        className={`relative z-[85] w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs ${
          isOpen
            ? 'bg-[#0f5c43] text-white shadow-md ring-2 ring-[#0f5c43]/30 scale-102'
            : 'bg-white text-slate-700 border border-clinical-border hover:border-[#0f5c43]/40 hover:text-[#0f5c43] hover:shadow-sm active:scale-95'
        }`}
      >
        <Bell className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'scale-110' : 'group-hover:rotate-12'}`} />

        {/* Titik Merah Beranimasi (Animated Pulsing Ping Dot) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5">
            {/* Animasi Gelombang Radar Ping */}
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            
            {/* Badge Inti Merah Solid */}
            <span className="relative inline-flex items-center justify-center rounded-full px-1 h-5 min-w-5 bg-rose-600 text-[10px] font-black text-white ring-2 ring-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Floating Popover Pusat Notifikasi */}
      {isOpen && (
        <>
          {/* Backdrop Overlay halus hanya di bawah Topbar agar Topbar dan tombol lonceng tidak kena blur / bayangan gelap */}
          <div
            className={`fixed inset-x-0 bottom-0 top-[4.5rem] z-[70] bg-slate-900/15 backdrop-blur-xs transition-opacity duration-240 ${
              isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-200'
            }`}
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            className={`fixed inset-x-3.5 top-[4.6rem] sm:top-full sm:mt-2.5 sm:right-0 sm:inset-x-auto sm:absolute w-auto sm:w-[24rem] md:w-[26rem] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 z-[80] overflow-hidden flex flex-col max-h-[calc(100dvh-6.5rem)] sm:max-h-[30rem] ${
              isClosing ? 'animate-notif-lift' : 'animate-notif-drop'
            }`}
          >
            {/* Header Popover */}
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/50 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#0f5c43] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-none truncate">
                      Pusat Notifikasi
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-rose-100 text-rose-700 shrink-0">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                    Pembaruan tugas & tiket akun Anda
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {/* Tombol Refresh */}
                <button
                  type="button"
                  onClick={() => fetchNotifications(false)}
                  disabled={loading}
                  title="Muat ulang notifikasi"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0f5c43]' : ''}`} />
                </button>

                {/* Tombol Tandai Semua Sudah Dibaca */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Tandai semua sudah dibaca"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Tombol Tutup */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Notifikasi */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 overscroll-contain max-h-[48dvh] sm:max-h-[22rem]">
              {loading && notifications.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-500 space-y-2">
                  <div className="inline-block w-5 h-5 border-2 border-[#0f5c43] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold">Memeriksa notifikasi masuk...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Bell className="w-5 h-5 opacity-60" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Semua Beres!</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Belum ada notifikasi baru untuk akun ini. Aktivitas penugasan atau perubahan status tiket akan muncul otomatis di sini.
                  </p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = item.id > lastReadId;
                  const badge = getEventBadge(item.type);
                  const IconComponent = badge.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 sm:p-3.5 text-left transition-all cursor-pointer flex gap-2.5 sm:gap-3 hover:bg-slate-50 group relative ${
                        isUnread ? 'bg-emerald-50/30' : 'bg-white'
                      }`}
                    >
                      {/* Indikator Garis Hijau jika Unread */}
                      {isUnread && (
                        <span
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-[#0f5c43]"
                          title="Belum dibaca"
                        />
                      )}

                      {/* Ikon Badge Tipe Event */}
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${badge.bg}`}
                      >
                        <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>

                      {/* Konten Notifikasi */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                            <span className={`w-1 h-1 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 shrink-0">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        {/* Judul Tiket */}
                        <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate group-hover:text-[#0f5c43] transition-colors flex items-center gap-1">
                          <span className="font-mono text-[10px] sm:text-[11px] text-slate-400">
                            #T-{String(item.ticketId).padStart(3, '0')}
                          </span>
                          <span className="truncate">{item.ticketTitle}</span>
                        </p>

                        {/* Ringkasan Pesan */}
                        <p className="text-[10px] sm:text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {cleanMessage(item.message)}
                        </p>

                        {/* Metadata Footer Item */}
                        <div className="flex items-center justify-between pt-0.5 text-[9px] sm:text-[10px] text-slate-400">
                          <span className="truncate max-w-[150px] sm:max-w-[180px]">
                            {item.divisiNama} • {item.jenisTiket}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[#0f5c43] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Buka
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Popover: Keterangan Akun Ringkas & Navigasi Cepat */}
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              {/* Info Akun Login Ringkas */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-peach text-brand-deep font-black text-[9px] sm:text-[10px] flex items-center justify-center shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight truncate">
                    {userName}
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-bold text-brand-orange uppercase tracking-wide truncate">
                    {userRole} {userDivisi ? `• ${userDivisi}` : ''}
                  </p>
                </div>
              </div>

              {/* Link Tambahan jika Admin */}
              {userRole === 'ADMIN' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    navigate('/monitoring-notifikasi');
                  }}
                  className="text-[9px] sm:text-[10px] font-bold text-[#0f5c43] hover:underline flex items-center gap-1 shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-200"
                >
                  <ShieldAlert className="w-3 h-3" />
                  Log Sistem
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    navigate('/riwayat');
                  }}
                  className="text-[9px] sm:text-[10px] font-bold text-[#0f5c43] hover:underline flex items-center gap-1 shrink-0"
                >
                  Riwayat Selesai
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

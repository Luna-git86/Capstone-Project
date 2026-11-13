import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getAuthRole, getAuthUserName, getAuthDivisiNama, isTelegramLinked } from '../utils/authStorage';

interface TopbarProps {
  onToggleSidebar?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const userName = getAuthUserName('Pengguna RSIA');
  const userRole = getAuthRole() || 'STAF';
  const userDivisi = getAuthDivisiNama();
  const [telegramLinked, setTelegramLinked] = useState(
    isTelegramLinked()
  );
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const refreshTelegramStatus = async () => {
    try {
      const response = await api.get('/auth/telegram/status');
      const linked = Boolean(response.data?.linked);
      setTelegramLinked(linked);
      sessionStorage.setItem('telegramLinked', linked ? '1' : '0');
      if (linked) {
        setLinkMessage('Telegram sudah terhubung dengan akun ini.');
      }
    } catch {
      // Status gagal dibaca tidak boleh mengganggu halaman utama.
    }
  };

  useEffect(() => {
    refreshTelegramStatus();
  }, []);

  const handleDisconnectTelegram = async () => {
    const confirmed = window.confirm(
      'Putuskan Telegram dari akun yang sedang login? Setelah itu akun Telegram yang sama bisa dihubungkan ke akun Staf.'
    );
    if (!confirmed) return;

    setLinking(true);
    setLinkMessage('');
    try {
      await api.delete('/auth/telegram/link');
      setTelegramLinked(false);
      sessionStorage.setItem('telegramLinked', '0');
      setLinkMessage('Telegram sudah diputus. Login sebagai Staf, lalu klik Hubungkan Telegram.');
    } catch (error: any) {
      setLinkMessage(error.response?.data?.message || 'Gagal memutus tautan Telegram.');
    } finally {
      setLinking(false);
    }
  };

  const handleConnectTelegram = async () => {
    setLinking(true);
    setLinkMessage('');
    try {
      const response = await api.post('/auth/telegram/link-token');
      const link = response.data?.link;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
        setLinkMessage('Buka Telegram, tekan Start, lalu klik Periksa status.');
      } else {
        setLinkMessage(response.data?.message || 'Tautan Telegram tidak tersedia.');
      }
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 409) {
        setTelegramLinked(true);
        sessionStorage.setItem('telegramLinked', '1');
        setLinkMessage('Akun ini sudah terhubung ke Telegram.');
      } else {
        setLinkMessage(message || 'Gagal membuat tautan Telegram. Pastikan backend dan bot berjalan.');
      }
    } finally {
      setLinking(false);
    }
  };

  return (
    <header className="h-16 shrink-0 bg-clinical-surface border-b border-clinical-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-10 gap-2 sm:gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Buka menu navigasi"
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{today}</p>
          {linkMessage && (
            <p className="hidden md:block text-[11px] text-slate-500 mt-0.5 max-w-xl truncate" title={linkMessage}>
              {linkMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {telegramLinked ? (
          <div className="hidden sm:flex items-center gap-2">
            <span className="hidden md:inline-flex px-3 py-1.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Telegram terhubung
            </span>
            <button
              type="button"
              onClick={handleDisconnectTelegram}
              disabled={linking}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              {linking ? 'Memutus...' : 'Putuskan Telegram'}
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={handleConnectTelegram}
              disabled={linking}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white shadow-sm"
            >
              {linking ? 'Menyiapkan...' : 'Hubungkan Telegram'}
            </button>
            <button
              type="button"
              onClick={refreshTelegramStatus}
              className="hidden md:inline-flex px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Periksa status
            </button>
          </div>
        )}
        <div className="text-right hidden xs:block sm:block">
          <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight max-w-[140px] sm:max-w-none truncate">
            {userName}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded border border-blue-200 uppercase">
              {userRole}
            </span>
            {userRole !== 'ADMIN' && (
              <span className="hidden md:inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {userDivisi}
              </span>
            )}
          </div>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm shrink-0">
          {getInitials(userName)}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

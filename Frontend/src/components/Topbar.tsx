import React, { useEffect, useState } from 'react';
import { Menu, RefreshCw, Send, Unlink } from 'lucide-react';
import api from '../services/api';
import { isTelegramLinked } from '../utils/authStorage';
import NotificationBell from './NotificationBell';

interface TopbarProps {
  onToggleSidebar?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const [telegramLinked, setTelegramLinked] = useState(
    isTelegramLinked()
  );
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const now = new Date();
  const dayNumber = now.getDate();
  const weekdayShort = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(now);
  const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(now);

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
    <header className="h-[4.5rem] shrink-0 bg-clinical-surface/95 backdrop-blur-sm border-b border-clinical-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-50 gap-2 sm:gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Buka menu navigasi"
            className="lg:hidden w-10 h-10 rounded-2xl bg-brand-deep text-white flex items-center justify-center hover:bg-brand-deeper transition shrink-0"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        <div className="flex items-center gap-2.5 min-w-0" title={today}>
          <span className="text-3xl sm:text-4xl font-extrabold text-clinical-ink leading-none tabular-nums">
            {dayNumber}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-semibold text-slate-400 capitalize">{weekdayShort}</p>
            <p className="text-xs font-semibold text-slate-400 capitalize truncate">{monthYear}</p>
          </div>
          <span className="hidden sm:inline-flex ml-1 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">
            Hari ini
          </span>
        </div>
        {linkMessage && (
          <p className="hidden xl:block text-[11px] text-slate-500 max-w-xs truncate border-l border-clinical-border pl-3" title={linkMessage}>
            {linkMessage}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {telegramLinked ? (
          <div className="hidden sm:flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-blue-50 text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              Telegram terhubung
            </span>
            <button
              type="button"
              onClick={handleDisconnectTelegram}
              disabled={linking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" aria-hidden="true" />
              {linking ? 'Memutus...' : 'Putuskan Telegram'}
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={handleConnectTelegram}
              disabled={linking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              {linking ? 'Menyiapkan...' : 'Hubungkan Telegram'}
            </button>
            <button
              type="button"
              onClick={refreshTelegramStatus}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Periksa status
            </button>
          </div>
        )}
        {/* Tombol Notifikasi Akun Interaktif & Dinamis */}
        <NotificationBell />
      </div>
    </header>
  );
};

export default Topbar;

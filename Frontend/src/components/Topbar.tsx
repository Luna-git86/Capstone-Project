// Frontend/src/components/Topbar.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, RefreshCw, Send, Unlink, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { isTelegramLinked, setTelegramLinkedState } from '../utils/authStorage';
import NotificationBell from './NotificationBell';

interface TopbarProps {
  onToggleSidebar?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const [telegramLinked, setTelegramLinked] = useState<boolean>(isTelegramLinked());
  const [linking, setLinking] = useState(false);
  const [awaitingLink, setAwaitingLink] = useState(false);
  const [botUrl, setBotUrl] = useState<string>(() => {
    return sessionStorage.getItem('telegramBotUrl') || 'https://t.me/QurrataBot';
  });
  const [linkMessage, setLinkMessage] = useState('');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showTemporaryMessage = (msg: string, durationMs = 6000) => {
    setLinkMessage(msg);
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setLinkMessage('');
    }, durationMs);
  };

  const refreshTelegramStatus = useCallback(async (isAuto = false): Promise<boolean> => {
    try {
      const response = await api.get('/auth/telegram/status');
      const linked = Boolean(response.data?.linked);
      setTelegramLinked(linked);
      setTelegramLinkedState(linked);

      if (response.data?.botUrl) {
        setBotUrl(response.data.botUrl);
        sessionStorage.setItem('telegramBotUrl', response.data.botUrl);
      }

      if (linked) {
        setAwaitingLink(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (isAuto) {
          showTemporaryMessage('Telegram terhubung! Notifikasi tiket siap dikirim ke bot.');
        }
      }
      return linked;
    } catch {
      // Status gagal dibaca tidak boleh mengganggu tampilan utama.
      return false;
    }
  }, []);

  // Polling aktif saat pengguna baru saja mengklik "Hubungkan Telegram"
  useEffect(() => {
    if (!awaitingLink) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Polling setiap 2 detik memeriksa status penautan
    pollIntervalRef.current = setInterval(async () => {
      const isLinked = await refreshTelegramStatus(true);
      if (isLinked && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 2000);

    // Batas timeout 2 menit jika user tidak menekan Start di Telegram
    timeoutRef.current = setTimeout(() => {
      setAwaitingLink(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      showTemporaryMessage('Waktu tunggu habis. Jika belum terhubung, silakan tekan Hubungkan Telegram kembali.');
    }, 120000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [awaitingLink, refreshTelegramStatus]);

  // Listener window focus & visibilitychange agar saat kembali dari tab/app Telegram langsung sinkron seketika
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshTelegramStatus(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // Initial check saat mount
    refreshTelegramStatus(false);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [refreshTelegramStatus]);

  const handleDisconnectTelegram = async () => {
    const confirmed = window.confirm(
      'Putuskan Telegram dari akun yang sedang login? Setelah itu akun Telegram yang sama bisa dihubungkan ke akun lain.'
    );
    if (!confirmed) return;

    setLinking(true);
    setAwaitingLink(false);
    setLinkMessage('');
    try {
      await api.delete('/auth/telegram/link');
      setTelegramLinked(false);
      setTelegramLinkedState(false);
      showTemporaryMessage('Telegram sudah diputus. Klik Hubungkan Telegram jika ingin menautkan kembali.');
    } catch (error: any) {
      showTemporaryMessage(error.response?.data?.message || 'Gagal memutus tautan Telegram.');
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
      const targetBotUrl = response.data?.botUrl || (response.data?.botUsername ? `https://t.me/${response.data.botUsername}` : null);
      if (targetBotUrl) {
        setBotUrl(targetBotUrl);
        sessionStorage.setItem('telegramBotUrl', targetBotUrl);
      }

      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
        setAwaitingLink(true);
        showTemporaryMessage('Membuka Telegram... Tekan "Start" di bot untuk menyelesaikan tautan akun.', 10000);
      } else {
        showTemporaryMessage(response.data?.message || 'Tautan Telegram tidak tersedia.');
      }
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 409) {
        setTelegramLinked(true);
        setTelegramLinkedState(true);
        setAwaitingLink(false);
        showTemporaryMessage('Akun ini sudah terhubung ke Telegram.');
        if (error.response?.data?.botUrl) {
          setBotUrl(error.response.data.botUrl);
          sessionStorage.setItem('telegramBotUrl', error.response.data.botUrl);
        }
      } else {
        showTemporaryMessage(message || 'Gagal membuat tautan Telegram. Pastikan backend dan bot berjalan.');
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
          <p className="hidden lg:block text-[11px] font-medium text-slate-600 max-w-sm truncate border-l border-clinical-border pl-3" title={linkMessage}>
            {linkMessage}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {telegramLinked ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Status Telegram Terhubung */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="Akun Anda telah terhubung ke bot notifikasi Telegram"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span className="hidden xs:inline">Telegram terhubung</span>
              <span className="xs:hidden">Terhubung</span>
            </span>

            {/* Tombol Membuka Telegram yang Otomatis Mengarahkan ke Chat Bot Notifikasi */}
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-[#0088cc] hover:bg-[#0077b5] active:scale-95 text-white shadow-2xs transition-all shrink-0"
              title="Buka ruang obrolan bot notifikasi di Telegram"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Buka Telegram</span>
              <span className="sm:hidden">Bot</span>
              <ExternalLink className="w-3 h-3 opacity-80" aria-hidden="true" />
            </a>

            {/* Tombol Putuskan Telegram */}
            <button
              type="button"
              onClick={handleDisconnectTelegram}
              disabled={linking}
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors shrink-0"
              title="Putuskan sambungan Telegram dari akun ini"
            >
              <Unlink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">{linking ? 'Memutus...' : 'Putuskan'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {awaitingLink ? (
              <>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-amber-50 text-amber-800 border border-amber-200"
                  title="Menunggu penekanan tombol Start di Telegram..."
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Menunggu konfirmasi...</span>
                  <span className="sm:hidden">Menunggu...</span>
                </span>
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-[#0088cc] hover:bg-[#0077b5] active:scale-95 text-white shadow-2xs transition-all shrink-0"
                  title="Buka obrolan bot Telegram untuk menekan tombol Start"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Buka Telegram</span>
                  <span className="sm:hidden">Bot</span>
                  <ExternalLink className="w-3 h-3 opacity-80" aria-hidden="true" />
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectTelegram}
                disabled={linking}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-slate-300 text-white transition-all shadow-2xs shrink-0"
                title="Hubungkan akun Anda dengan bot notifikasi Telegram"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{linking ? 'Menyiapkan...' : 'Hubungkan Telegram'}</span>
                <span className="sm:hidden">{linking ? '...' : 'Hubungkan'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => refreshTelegramStatus(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
              title="Periksa status sambungan sekarang"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">Periksa status</span>
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

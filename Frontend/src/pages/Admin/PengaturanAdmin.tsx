// Frontend/src/pages/Admin/PengaturanAdmin.tsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface SystemConfig {
  telegramEnabled: boolean;
  maxRetryAttempts: number;
  reminderHoursBeforeDeadline: number;
  timeZone: string;
  cronSchedule: string;
  enabledNotificationTypes: {
    DIRECTIVE_ASSIGNED: boolean;
    TASK_ASSIGNED: boolean;
    TASK_REASSIGNED: boolean;
    TASK_SUBMITTED: boolean;
    TASK_REVISION_REQUIRED: boolean;
    TASK_VERIFIED: boolean;
    TASK_ESCALATED: boolean;
    DEADLINE_SOON: boolean;
    OVERDUE: boolean;
  };
  slaHours: {
    RENDAH: number;
    SEDANG: number;
    TINGGI: number;
    URGENT: number;
  };
}

interface BotStatus {
  configured: boolean;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'UNREACHABLE';
  bot?: {
    id: number;
    isBot: boolean;
    firstName: string;
    username: string;
  };
  message?: string;
}

interface RecipientsSummary {
  totalUsers: number;
  totalLinked: number;
  totalUnlinked: number;
  summaryByRole: Record<string, { total: number; linked: number }>;
  users: Array<{
    id: number;
    nama: string;
    email: string;
    role: string;
    divisi: string;
    isLinked: boolean;
  }>;
}

interface AuditLogItem {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  createdAt: string;
  details: string;
  user?: {
    id: number;
    nama: string;
    email: string;
    role: string;
  };
}

export default function PengaturanAdmin() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [recipients, setRecipients] = useState<RecipientsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingBot, setCheckingBot] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'operasional' | 'event' | 'penerima' | 'audit'>('operasional');

  // Muat data awal
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [configRes, botRes, recRes, auditRes] = await Promise.all([
        api.get('/config'),
        api.get('/config/telegram-status'),
        api.get('/config/recipients-summary'),
        api.get('/config/audit-logs'),
      ]);

      if (configRes.data?.config) {
        setConfig(configRes.data.config);
      }
      setBotStatus(botRes.data);
      setRecipients(recRes.data);
      setAuditLogs(auditRes.data?.data || []);
    } catch (err: any) {
      console.error('Error load config data:', err);
      setErrorMessage(err.response?.data?.message || 'Gagal memuat pengaturan sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Uji koneksi bot telegram
  const handleTestBot = async () => {
    setCheckingBot(true);
    try {
      const res = await api.get('/config/telegram-status');
      setBotStatus(res.data);
    } catch (err: any) {
      setBotStatus({
        configured: false,
        status: 'UNREACHABLE',
        message: err.message,
      });
    } finally {
      setCheckingBot(false);
    }
  };

  // Simpan perubahan konfigurasi
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res = await api.put('/config', config);
      if (res.data?.config) {
        setConfig(res.data.config);
      }
      setSaveSuccess('Konfigurasi sistem berhasil disimpan dan diterapkan!');
      // Muat ulang audit log agar perubahan langsung terlihat
      const auditRes = await api.get('/config/audit-logs');
      setAuditLogs(auditRes.data?.data || []);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#19376D] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat Pengaturan Sistem RSIA...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Gagal memuat konfigurasi. Silakan refresh halaman atau periksa koneksi backend.</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-[#19376D] text-white rounded font-medium hover:bg-[#0B2447]"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2447]">Pengaturan Sistem & Operasional</h1>
          <p className="text-sm text-gray-500">
            Kelola integrasi Telegram Bot, jadwal pengingat deadline, jenis notifikasi aktif, dan akun pegawai.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            Refresh Data
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-5 py-2 bg-[#19376D] hover:bg-[#0B2447] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Alert Notifikasi Sukses / Gagal */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
          <span>{saveSuccess}</span>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-600 font-bold">x</button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 font-bold">x</button>
        </div>
      )}

      {/* Kartu Status Bot Telegram */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold ${
              botStatus?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              BOT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800">Status Bot Telegram RSIA</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  botStatus?.status === 'CONNECTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {botStatus?.status === 'CONNECTED' ? 'TERHUBUNG' : 'BERMASALAH / BELUM AKTIF'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {botStatus?.status === 'CONNECTED'
                  ? `Bot: @${botStatus.bot?.username || 'RSIA_Bot'} (${botStatus.bot?.firstName || 'RSIA Qurrata A’yun'})`
                  : botStatus?.message || 'Token belum dikonfigurasi di file environment.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestBot}
              disabled={checkingBot}
              className="px-3.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-50"
            >
              {checkingBot ? 'Memeriksa...' : 'Uji Koneksi Bot'}
            </button>
            <div className="flex items-center gap-2 border-l pl-3">
              <label className="text-xs font-semibold text-gray-700">Master Switch:</label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, telegramEnabled: !config.telegramEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  config.telegramEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.telegramEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs font-bold text-gray-600">
                {config.telegramEnabled ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigasi Tab */}
      <div className="flex border-b border-gray-200 space-x-2">
        <button
          onClick={() => setActiveTab('operasional')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'operasional'
              ? 'border-[#19376D] text-[#19376D]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Parameter Operasional & Cron
        </button>
        <button
          onClick={() => setActiveTab('event')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'event'
              ? 'border-[#19376D] text-[#19376D]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Event Notifikasi Aktif
        </button>

        <button
          onClick={() => setActiveTab('penerima')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'penerima'
              ? 'border-[#19376D] text-[#19376D]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Keterhubungan Akun Pegawai
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-[#19376D] text-[#19376D]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Audit Log Konfigurasi
        </button>
      </div>

      {/* Konten Tab 1: Parameter Operasional & Cron */}
      {activeTab === 'operasional' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Jadwal Pengingat & Pengaturan Retry</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Pengingat Mendekati Deadline (Jam sebelum deadline)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={config.reminderHoursBeforeDeadline}
                onChange={(e) =>
                  setConfig({ ...config, reminderHoursBeforeDeadline: Number(e.target.value) || 24 })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#19376D] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tiket aktif akan memicu peringatan <code>DEADLINE_SOON</code> ke pelaksana jika batas waktu tinggal &le; jam ini.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Batas Maksimum Percobaan Retry (Attempts)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.maxRetryAttempts}
                onChange={(e) =>
                  setConfig({ ...config, maxRetryAttempts: Number(e.target.value) || 3 })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#19376D] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Notifikasi Telegram yang berstatus <code>FAILED</code> akan dicoba ulang otomatis hingga batas ini tercapai.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Ekspresi Jadwal Cron Job
              </label>
              <input
                type="text"
                value={config.cronSchedule}
                onChange={(e) => setConfig({ ...config, cronSchedule: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#19376D] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: <code>*/15 * * * *</code> (dijalankan setiap 15 menit).
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Zona Waktu Rumah Sakit
              </label>
              <input
                type="text"
                value={config.timeZone}
                onChange={(e) => setConfig({ ...config, timeZone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#19376D] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Zona waktu operasional RSIA Qurrata A’yun (contoh: <code>Asia/Makassar</code> atau <code>Asia/Jakarta</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Konten Tab 2: Event Notifikasi Aktif */}
      {activeTab === 'event' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Jenis Event Notifikasi Telegram</h2>
              <p className="text-xs text-gray-500">
                Pilih jenis event tiket yang diizinkan untuk mengirimkan notifikasi ke Telegram bot.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const allOn: any = {};
                  Object.keys(config.enabledNotificationTypes).forEach((k) => (allOn[k] = true));
                  setConfig({ ...config, enabledNotificationTypes: allOn });
                }}
                className="text-xs font-semibold text-[#19376D] hover:underline"
              >
                Aktifkan Semua
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => {
                  const allOff: any = {};
                  Object.keys(config.enabledNotificationTypes).forEach((k) => (allOff[k] = false));
                  setConfig({ ...config, enabledNotificationTypes: allOff });
                }}
                className="text-xs font-semibold text-gray-500 hover:underline"
              >
                Nonaktifkan Semua
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'DIRECTIVE_ASSIGNED',
                label: 'Arahan Tugas Baru dari Kadiv',
                desc: 'Dikirim ke Koordinator saat Kadiv menerbitkan arahan operasional divisi.',
              },
              {
                key: 'TASK_ASSIGNED',
                label: 'Penugasan Tiket Baru ke Staf',
                desc: 'Dikirim ke Staf pelaksana saat Koordinator membuat tiket operasional.',
              },
              {
                key: 'TASK_REASSIGNED',
                label: 'Pengalihan Pelaksana Tiket',
                desc: 'Dikirim ke Staf pelaksana baru saat penugasan tiket dialihkan.',
              },
              {
                key: 'TASK_SUBMITTED',
                label: 'Penyerahan Tugas untuk Validasi',
                desc: 'Dikirim ke Koordinator saat Staf mengirim pekerjaan selesai untuk diperiksa.',
              },
              {
                key: 'TASK_REVISION_REQUIRED',
                label: 'Permintaan Revisi Tugas',
                desc: 'Dikirim ke Staf saat Koordinator meminta perbaikan hasil pekerjaan.',
              },
              {
                key: 'TASK_VERIFIED',
                label: 'Verifikasi & Tiket Selesai',
                desc: 'Dikirim ke Staf saat hasil pekerjaan disahkan/diverifikasi oleh Koordinator.',
              },
              {
                key: 'TASK_ESCALATED',
                label: 'Permohonan Eskalasi Tiket',
                desc: 'Dikirim ke Kadiv saat Koordinator mengajukan eskalasi kendala operasional.',
              },
              {
                key: 'DEADLINE_SOON',
                label: 'Peringatan Mendekati Batas Waktu',
                desc: 'Pengingat otomatis saat deadline tiket tinggal beberapa jam.',
              },
              {
                key: 'OVERDUE',
                label: 'Peringatan Tiket Melewati Batas Waktu',
                desc: 'Peringatan otomatis saat tiket aktif telah melewati tanggal deadline.',
              },
            ].map((item) => {
              const isChecked = (config.enabledNotificationTypes as any)[item.key] !== false;
              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-lg border transition ${
                    isChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50 opacity-70'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          enabledNotificationTypes: {
                            ...config.enabledNotificationTypes,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#19376D] focus:ring-[#19376D]"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-800">{item.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      <span className="inline-block mt-1 font-mono text-[10px] text-gray-400">
                        TYPE: {item.key}
                      </span>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* Konten Tab 4: Keterhubungan Akun Pegawai */}
      {activeTab === 'penerima' && recipients && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Status Keterhubungan Akun Telegram Pegawai</h2>

          {/* Statistik Keterhubungan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Pegawai</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{recipients.totalUsers}</p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <p className="text-xs font-semibold text-emerald-700 uppercase">Terhubung Telegram</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{recipients.totalLinked}</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <p className="text-xs font-semibold text-rose-700 uppercase">Belum Terhubung</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{recipients.totalUnlinked}</p>
            </div>
          </div>

          {/* Matriks Per Role */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-[#0B2447] text-white text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Nama Pegawai</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Divisi</th>
                  <th className="px-4 py-3 text-center">Status Telegram</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recipients.users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{u.nama}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{u.divisi}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.isLinked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.isLinked ? 'TERHUBUNG' : 'BELUM TERHUBUNG'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Konten Tab 5: Audit Log Konfigurasi */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Riwayat Perubahan Konfigurasi Sistem</h2>
          <p className="text-xs text-gray-500">
            Seluruh penyesuaian parameter konfigurasi yang dilakukan admin dicatat secara otomatis pada tabel AuditLog.
          </p>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-6">
              Belum ada catatan riwayat perubahan konfigurasi.
            </p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                let parsedDetails: any = null;
                try {
                  parsedDetails = JSON.parse(log.details);
                } catch (_) {}

                return (
                  <div key={log.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition text-xs">
                    <div className="flex items-center justify-between font-semibold text-gray-700 mb-1">
                      <span className="text-[#19376D] font-bold">
                        {log.action} (#{log.id})
                      </span>
                      <span className="text-gray-500">
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      Oleh: <span className="font-semibold">{log.user?.nama || parsedDetails?.updatedBy || 'Admin'}</span>
                    </p>
                    {parsedDetails?.updatedConfig && (
                      <div className="mt-2 bg-slate-100 p-2 rounded text-[11px] font-mono text-slate-700 overflow-x-auto">
                        <p>Retry Max: {parsedDetails.updatedConfig.maxRetryAttempts} | Deadline Reminder: {parsedDetails.updatedConfig.reminderHoursBeforeDeadline} Jam | Telegram: {parsedDetails.updatedConfig.telegramEnabled ? 'AKTIF' : 'NONAKTIF'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

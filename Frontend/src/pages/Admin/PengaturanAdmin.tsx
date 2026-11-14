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
  const [recipients, setRecipients] = useState<RecipientsSummary | null>(null);
  const [, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'operasional' | 'penerima'>('operasional');

  // Muat data awal
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [configRes, recRes, auditRes] = await Promise.all([
        api.get('/config'),
        api.get('/config/recipients-summary'),
        api.get('/config/audit-logs'),
      ]);

      if (configRes.data?.config) {
        setConfig(configRes.data.config);
      }
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
      // Muat ulang audit log agar perubahan tetap tercatat di sistem
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
            Kelola integrasi Telegram Bot, jadwal pengingat deadline, dan akun pegawai.
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
          Jadwal Pengingat
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
      </div>

      {/* Konten Tab 1: Jadwal Pengingat */}
      {activeTab === 'operasional' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Jadwal Pengingat Batas Waktu</h2>

          <div className="max-w-xl">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Peringatan Mendekati Batas Waktu (Jam Sebelum Deadline)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="1"
                max="168"
                value={config.reminderHoursBeforeDeadline}
                onChange={(e) =>
                  setConfig({ ...config, reminderHoursBeforeDeadline: Number(e.target.value) || 24 })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-14 text-sm focus:ring-2 focus:ring-[#19376D] focus:outline-none"
              />
              <span className="absolute right-3 text-sm text-gray-500 font-medium pointer-events-none">
                Jam
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Peringatan tugas mendekati batas waktu akan otomatis dikirimkan ke Telegram staf pelaksana jika sisa waktu pengerjaan tinggal &le; jam ini.
            </p>
          </div>
        </div>
      )}

      {/* Konten Tab 2: Keterhubungan Akun Pegawai */}
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
    </div>
  );
}

// Frontend/src/pages/DashboardAdmin.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Divisi {
  id: number;
  nama: string;
}

interface UserItem {
  id: number;
  nama: string;
  noHp: string;
  email: string | null;
  role: string;
  divisiId: number | null;
  divisi?: { id: number; nama: string } | null;
}

interface AuditLogItem {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  createdAt: string;
  user?: { id: number; nama: string; role: string };
}

const DashboardAdmin: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [formData, setFormData] = useState({
    nama: '',
    noHp: '',
    email: '',
    password: '',
    role: 'STAF',
    divisiId: '',
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // State Modal Reset Password (UAT-1.3)
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [resetting, setResetting] = useState<boolean>(false);

  const currentUserName = localStorage.getItem('userName') || '';

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [userRes, divRes, logRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/auth/divisi'),
        api.get('/auth/audit-logs'),
      ]);
      setUsers(userRes.data.data || []);
      setDivisiList(divRes.data.data || []);
      setAuditLogs(logRes.data.data || []);
    } catch (err) {
      console.error('Gagal memuat data Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/register', {
        nama: formData.nama,
        noHp: formData.noHp,
        email: formData.email || null,
        password: formData.password,
        role: formData.role,
        divisiId:
          formData.role === 'DIREKTUR' || !formData.divisiId
            ? null
            : Number(formData.divisiId),
      });

      setMessage(res.data.message || 'Akun pegawai berhasil ditambahkan!');
      setFormData({
        nama: '',
        noHp: '',
        email: '',
        password: '',
        role: 'STAF',
        divisiId: '',
      });
      fetchAdminData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mendaftarkan akun baru.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setMessage('');
    setError('');

    try {
      const res = await api.put(`/auth/users/${resetTarget.id}/reset-password`, {
        newPassword,
      });
      setMessage(res.data.message || 'Kata sandi berhasil diperbarui!');
      setResetTarget(null);
      setNewPassword('');
      fetchAdminData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengatur ulang kata sandi.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (target: UserItem) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus akun ${target.nama} (${target.role})?`
      )
    ) {
      return;
    }

    setMessage('');
    setError('');
    try {
      const res = await api.delete(`/auth/users/${target.id}`);
      setMessage(res.data.message || `Akun ${target.nama} berhasil dihapus.`);
      fetchAdminData();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Gagal menghapus akun. Akun mungkin masih terhubung dengan riwayat tugas.'
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Kelola Akun Pegawai & Matriks RBAC
        </h1>
        <p className="text-sm text-slate-500">
          Pusat pendaftaran akun pegawai, pengaturan ulang kata sandi, dan pemantauan Rekam Jejak Keamanan (Audit Trail) RSIA Qurrata A'yun.
        </p>
      </div>

      {/* Ringkasan Statistik Sistem */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Total Akun Terdaftar
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Total Divisi Rumah Sakit
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {divisiList.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Rekam Jejak Tercatat (Audit Log)
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {auditLogs.length}
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 text-sm font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Pendaftaran Akun Baru (UAT-1.2) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Tambah Akun Pegawai Baru
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) =>
                  setFormData({ ...formData, nama: e.target.value })
                }
                placeholder="Contoh: Budi Santoso, A.Md.T."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nomor HP / WhatsApp (Untuk Login) *
              </label>
              <input
                type="text"
                required
                value={formData.noHp}
                onChange={(e) =>
                  setFormData({ ...formData, noHp: e.target.value })
                }
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Kata Sandi Awal *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Jabatan (Role) *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="STAF">STAF</option>
                  <option value="KOORDINATOR">KOORDINATOR</option>
                  <option value="KADIV">KEPALA DIVISI</option>
                  <option value="DIREKTUR">DIREKTUR</option>
                  <option value="ADMIN">ADMIN SISTEM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Divisi Unit Kerja
                </label>
                <select
                  value={formData.divisiId}
                  onChange={(e) =>
                    setFormData({ ...formData, divisiId: e.target.value })
                  }
                  disabled={formData.role === 'DIREKTUR'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">-- Lintas Divisi --</option>
                  {divisiList.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-lg shadow-sm transition"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Akun Pegawai'}
            </button>
          </form>
        </div>

        {/* Tabel Daftar Akun Pegawai (UAT-1.3 & UAT-1.4) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Daftar Akun Pegawai & Pengaturan Akses
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                  <th className="py-3 px-3">Nama Pegawai</th>
                  <th className="py-3 px-3">Nomor HP</th>
                  <th className="py-3 px-3">Jabatan & Divisi</th>
                  <th className="py-3 px-3 text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Memuat daftar akun...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelfOrAdmin =
                      u.role === 'ADMIN' || u.nama === currentUserName;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {u.nama}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600">
                          {u.noHp}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <span className="px-2 py-0.5 font-bold bg-blue-100 text-blue-800 rounded">
                            {u.role}
                          </span>
                          <span className="ml-2 text-slate-500">
                            {u.divisi?.nama || 'Lintas Divisi'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(u);
                              setNewPassword('');
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-md"
                          >
                            Reset Password
                          </button>

                          {/* Proteksi UAT-1.4: Akun Admin yang sedang aktif terkunci dari penghapusan */}
                          {isSelfOrAdmin ? (
                            <span
                              title="Akun Admin utama dilindungi agar sistem tidak kehilangan akses"
                              className="ml-2 px-2.5 py-1 bg-slate-100 text-slate-400 text-xs font-semibold rounded-md border border-slate-200 cursor-not-allowed"
                            >
                              🔒 Akun Aktif (Terkunci)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="ml-2 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-md"
                            >
                              Hapus
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabel Rekam Jejak Keamanan / Immutable Audit Trail (UAT-6.8) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Audit Trail Log
            </h2>
            <p className="text-xs text-slate-500">
              Seluruh aktivitas pengguna tercatat otomatis dan bersifat Read-Only (tidak dapat diubah atau dihapus).
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
            🔒 Read-Only Log
          </span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-semibold text-slate-500 uppercase bg-slate-50">
                <th className="py-2.5 px-3">Waktu Kejadian</th>
                <th className="py-2.5 px-3">Pelaku & Jabatan</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3">Rincian Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {log.user?.nama || `User #${log.user?.id || '-'}`}{' '}
                    <span className="text-[10px] text-blue-600">
                      ({log.user?.role || '-'})
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 font-mono font-bold bg-slate-100 text-slate-700 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reset Password (UAT-1.3) */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              Reset Kata Sandi: {resetTarget.nama}
            </h3>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Masukkan Kata Sandi Baru *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {resetting ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;
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
  email?: string | null;
  role: 'ADMIN' | 'DIREKTUR' | 'KADIV' | 'KOORDINATOR' | 'STAF';
  divisi?: { id: number; nama: string } | null;
  createdAt: string;
}

const DashboardAdmin: React.FC = () => {
  const [formData, setFormData] = useState({
    nama: '',
    noHp: '',
    email: '',
    password: '',
    role: 'STAF',
    divisiId: '',
  });

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // State untuk Modal Reset Password
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const userName = localStorage.getItem('userName') || 'Admin Sistem IT';

  const fetchDivisi = async () => {
    try {
      const res = await api.get('/auth/divisi');
      const divData: Divisi[] = res.data.data || res.data || [];
      setDivisiList(divData);
      if (divData.length > 0) {
        setFormData((prev) => ({
          ...prev,
          divisiId: prev.divisiId || String(divData[0].id),
        }));
      }
    } catch (err) {
      console.error('Gagal memuat daftar divisi:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsersList(res.data.data || res.data || []);
    } catch (err) {
      console.error('Gagal memuat daftar pengguna:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisi();
    fetchUsers();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.role !== 'DIREKTUR' && !formData.divisiId) {
      setError('Silakan pilih Unit Divisi terlebih dahulu.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        nama: formData.nama,
        noHp: formData.noHp,
        email: formData.email || null,
        password: formData.password,
        role: formData.role,
        divisiId: formData.role === 'DIREKTUR' ? null : Number(formData.divisiId),
      };

      const response = await api.post('/auth/register', payload);
      setSuccess(response.data.message || 'Akun baru berhasil disimpan!');

      setFormData((prev) => ({
        ...prev,
        nama: '',
        noHp: '',
        email: '',
        password: '',
      }));

      fetchUsers();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal menyimpan akun baru. Periksa kembali input Anda.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    setResetLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.put(`/auth/users/${resetTarget.id}/reset-password`, {
        newPassword,
      });
      setSuccess(res.data.message || 'Password berhasil direset!');
      setResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const totalManajerial = usersList.filter(
    (u) => u.role === 'DIREKTUR' || u.role === 'KADIV'
  ).length;
  const totalOperasional = usersList.filter(
    (u) => u.role === 'KOORDINATOR' || u.role === 'STAF'
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Admin — Manajemen Akun & Matriks RBAC
        </h1>
        <p className="text-sm text-slate-500">
          Selamat bertugas, <span className="font-semibold text-slate-700">{userName}</span> — Panel pendaftaran nomor HP/WhatsApp pegawai, pemetaan hak akses, dan reset password
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Akun Terdaftar</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{usersList.length}</p>
          <p className="text-xs text-blue-600 mt-1 font-medium">Seluruh entitas aktif</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Level Eksekutif & Manajerial</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{totalManajerial}</p>
          <p className="text-xs text-slate-500 mt-1">Direktur & Kepala Divisi (Kadiv)</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Level Operasional Lapangan</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{totalOperasional}</p>
          <p className="text-xs text-slate-500 mt-1">Koordinator & Staf Pelaksana</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Akun Baru */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Tambah Akun Baru</h2>
          <p className="text-xs text-slate-500 mb-4">
            Daftarkan pegawai menggunakan Nomor HP aktif untuk login dan notifikasi WhatsApp
          </p>

          {error && (
            <div className="mb-4 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                required
                placeholder="Contoh: Hafidz Naufal"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nomor HP / WhatsApp (Untuk Login)
              </label>
              <input
                type="tel"
                name="noHp"
                value={formData.noHp}
                onChange={handleChange}
                required
                placeholder="Contoh: 081347675143"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email (Opsional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@rsia.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Password Awal
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Jabatan / Role (Matriks RBAC)
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="STAF">Staf Pelaksana (STAF)</option>
                <option value="KOORDINATOR">Koordinator Unit (KOORDINATOR)</option>
                <option value="KADIV">Kepala Divisi (KADIV)</option>
                <option value="DIREKTUR">Direktur (DIREKTUR)</option>
                <option value="ADMIN">Admin Sistem IT (ADMIN)</option>
              </select>
            </div>

            {formData.role !== 'DIREKTUR' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Unit Divisi
                </label>
                <select
                  name="divisiId"
                  value={formData.divisiId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="" disabled>
                    -- Pilih Unit Divisi --
                  </option>
                  {divisiList.map((div) => (
                    <option key={div.id} value={String(div.id)}>
                      {div.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </form>
        </div>

        {/* Tabel Daftar Akun & Pemetaan Role */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Daftar Pengguna & Pemetaan Hak Akses
            </h2>
            <p className="text-xs text-slate-500">
              Data real-time seluruh pegawai terdaftar • Gunakan tombol Reset Password jika pegawai lupa kata sandi
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Nama Pegawai</th>
                  <th className="py-3 px-3">No. HP / WhatsApp</th>
                  <th className="py-3 px-3">Role Otorisasi</th>
                  <th className="py-3 px-3">Divisi</th>
                  <th className="py-3 px-3 text-right">Aksi Keamanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Memuat daftar akun...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada akun terdaftar.
                    </td>
                  </tr>
                ) : (
                  usersList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {item.nama}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">
                        {item.noHp}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                            item.role === 'ADMIN'
                              ? 'bg-slate-800 text-white'
                              : item.role === 'DIREKTUR'
                              ? 'bg-purple-100 text-purple-700'
                              : item.role === 'KADIV'
                              ? 'bg-indigo-100 text-indigo-700'
                              : item.role === 'KOORDINATOR'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.divisi?.nama || 'Lintas Divisi (Eksekutif)'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(item);
                            setNewPassword('');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Reset Password oleh Admin */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">
              Reset Password Pegawai
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tetapkan password baru untuk <span className="font-semibold text-slate-700">{resetTarget.nama}</span> ({resetTarget.noHp})
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Password Baru
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Ketik password baru (min. 6 karakter)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg"
                >
                  {resetLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
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
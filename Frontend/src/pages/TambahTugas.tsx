
import { useEffect, useState } from 'react';
import api from '../services/api';

type Divisi = {
  id: number;
  nama: string;
};

type User = {
  id: number;
  nama: string;
  role: string;
  divisiId: number | null;
};

const urgencyLevels = [
  { id: 'LOW', label: 'Low', desc: 'Tugas rutin, tanpa tekanan waktu', face: 'smile' },
  { id: 'MEDIUM', label: 'Medium', desc: 'Prioritas sedang, segera ditangani', face: 'neutral' },
  { id: 'HIGH', label: 'High', desc: 'Butuh perhatian, dalam 24 jam', face: 'sad' },
  { id: 'URGENT', label: 'Urgent', desc: 'Genting - butuh tindakan segera', face: 'urgent' },
];

export default function TambahTugas() {
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [divisi, setDivisi] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [kategori, setKategori] = useState('');
  const [urgensi, setUrgensi] = useState('MEDIUM');

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [loadingDivisi, setLoadingDivisi] = useState(true);
  const [loadingUser, setLoadingUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadDivisi = async () => {
      try {
        setError('');
        // Endpoint ini perlu ditambahkan pada backend (lihat bagian 2).
        const response = await api.get('/tickets/options');
        const data = response.data;

        setDivisiList(data.divisi ?? []);

        if (data.divisi?.length === 0) {
          setError('Belum ada data divisi. Tambahkan divisi terlebih dahulu.');
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ??
          'Gagal mengambil data divisi. Pastikan backend berjalan dan endpoint opsi tersedia.'
        );
      } finally {
        setLoadingDivisi(false);
      }
    };

    loadDivisi();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!divisi) {
        setUserList([]);
        setAssignee('');
        return;
      }

      try {
        setLoadingUser(true);
        setError('');

        // Daftar pelaksana diambil dari database berdasarkan divisi.
        const response = await api.get(
          `/tickets/options?divisiId=${encodeURIComponent(divisi)}`
        );

        setUserList(response.data.pelaksana ?? []);
      } catch (err: any) {
        setUserList([]);
        setError(
          err.response?.data?.message ??
          'Gagal mengambil daftar pelaksana dari database.'
        );
      } finally {
        setLoadingUser(false);
      }
    };

    loadUsers();
  }, [divisi]);

  const handleClear = () => {
    setJudul('');
    setDeskripsi('');
    setDivisi('');
    setAssignee('');
    setDeadline('');
    setKategori('');
    setUrgensi('MEDIUM');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!judul.trim() || !deskripsi.trim() || !divisi || !urgensi) {
      setError('Judul, deskripsi, divisi, dan prioritas wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);

      const deskripsiFinal = kategori.trim()
        ? `${deskripsi.trim()}\n\nKategori: ${kategori.trim()}`
        : deskripsi.trim();

      const payload = {
        judul: judul.trim(),
        deskripsi: deskripsiFinal,
        divisiId: Number(divisi),
        pelaksanaId: assignee ? Number(assignee) : null,
        deadline: deadline || null,
        // Database saat ini hanya mendukung LOW, MEDIUM, HIGH.
        prioritas: urgensi === 'URGENT' ? 'HIGH' : urgensi,
      };

      const response = await api.post('/tickets', payload);

      setSuccess(response.data.message || 'Tugas berhasil disimpan ke database.');
      handleClear();
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
        'Tugas gagal disimpan. Periksa koneksi backend dan database.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0f172a] leading-tight mb-2">
          Buat Tugas Baru
        </h1>
        <p className="text-slate-500">Isi detail tugas di bawah ini</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label className="text-[15px] font-bold text-[#0f172a]">
              Judul Tugas
            </label>
            <input
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Cek tanggal kedaluwarsa obat-obatan"
              className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[15px] font-bold text-[#0f172a]">
              Deskripsi
            </label>
            <textarea
              required
              rows={4}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Jelaskan pekerjaan, batasan, dan instruksi untuk staf."
              className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">
                Divisi yang ditugaskan
              </label>
              <select
                required
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                disabled={loadingDivisi}
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 bg-white text-slate-700 disabled:bg-slate-100"
              >
                <option value="">
                  {loadingDivisi ? 'Memuat divisi...' : 'Pilih divisi'}
                </option>
                {divisiList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">
                Ditugaskan kepada
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                disabled={!divisi || loadingUser}
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 bg-white text-slate-700 disabled:bg-slate-100"
              >
                <option value="">
                  {loadingUser
                    ? 'Memuat pelaksana...'
                    : 'Tidak ditugaskan (Terbuka untuk divisi)'}
                </option>
                {userList.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">
                Deadline
              </label>
              <input
                type="date"
                min={new Date().toLocaleDateString('en-CA')}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 text-slate-700"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">
                Kategori
              </label>
              <input
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Contoh: Peralatan, Kebersihan, Keamanan"
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 text-slate-700"
              />
              <p className="text-xs text-slate-400">
                Kategori disimpan di bagian deskripsi karena kolom kategori belum tersedia di database.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[15px] font-bold text-[#0f172a]">
              Level Urgensi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {urgencyLevels.map((level) => (
                <label
                  key={level.id}
                  className={`relative flex flex-col items-center justify-center p-6 border rounded-2xl cursor-pointer transition-all ${
                    urgensi === level.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgensi"
                    value={level.id}
                    checked={urgensi === level.id}
                    onChange={(e) => setUrgensi(e.target.value)}
                    className="absolute top-4 right-4 w-5 h-5 text-blue-600"
                  />
                  <span className="text-3xl mb-3" aria-hidden="true">
                    {level.id === 'LOW' ? '☺' : level.id === 'MEDIUM' ? '😐' : level.id === 'HIGH' ? '☹' : '‼'}
                  </span>
                  <span className="text-lg font-bold text-[#0f172a]">
                    {level.label}
                  </span>
                  <span className="text-[11px] text-slate-500 text-center mt-1 font-medium">
                    {level.desc}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-4 pt-8 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClear}
              disabled={submitting}
              className="px-8 py-3 text-[15px] font-bold text-[#0f172a] bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={submitting || loadingDivisi}
              className="px-10 py-3 text-[15px] font-bold text-white bg-[#007bff] hover:bg-blue-700 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Kirim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

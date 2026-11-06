// Frontend/src/pages/TambahTugas.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { getAuthRole, getAuthDivisiId, getAuthUserId } from '../utils/authStorage';

interface Divisi {
  id: number;
  nama: string;
}

interface Pelaksana {
  id: number;
  nama: string;
  noHp?: string;
  role: string;
  divisiId: number | null;
  divisi?: { id: number; nama: string };
}

interface IncomingTicket {
  id: number;
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  deadline?: string | null;
  divisiId?: number | null;
  divisi?: { id: number; nama: string } | null;
  pembuat?: { id?: number; nama: string; role: string };
  pelaksana?: { id?: number; nama: string; role: string } | null;
}

const TambahTugas: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTicketId = searchParams.get('ticketId') || '';

  const userRole = getAuthRole() || 'KOORDINATOR';
  const userDivisiId = getAuthDivisiId() || '';
  const currentUserId = getAuthUserId();

  // Tangkap parameter query parentId jika pembuatan tiket diturunkan dari arahan Kadiv
  const parentId = searchParams.get('parentId');
  const parentTitle = searchParams.get('parentTitle');

  const [incomingTickets, setIncomingTickets] = useState<IncomingTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(preselectedTicketId);
  const [pelaksanaList, setPelaksanaList] = useState<Pelaksana[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    judul: '',
    lokasi: '',
    deskripsi: '',
    prioritas: 'MEDIUM',
    divisiId: userDivisiId,
    pelaksanaId: '',
    deadline: '',
  });

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [allStaffList, setAllStaffList] = useState<Pelaksana[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);

  const toDateTimeLocalInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // 1. Muat daftar tiket masalah & arahan atasan yang dapat didelegasikan
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const ticketRes = await api.get('/tickets');
        const allTickets: IncomingTicket[] = Array.isArray(ticketRes.data)
          ? ticketRes.data
          : ticketRes.data?.data || [];
        const delegatableTickets = allTickets.filter((t) => {
          if (t.status === 'MENUNGGU_TRIASE') return true;
          if (userRole === 'KADIV') {
            // Kadiv mendelegasikan tiket arahan Direktur yang ditugaskan ke Kadiv
            const isAssignedToKadiv =
              !t.pelaksana ||
              t.pelaksana.role === 'KADIV' ||
              (currentUserId && String(t.pelaksana.id) === String(currentUserId));
            return t.pembuat?.role === 'DIREKTUR' && isAssignedToKadiv && t.status !== 'SELESAI';
          }
          if (userRole === 'KOORDINATOR') {
            // Koordinator HANYA mendelegasikan arahan yang SUDAH DITUGASKAN / DITURUNKAN kepadanya
            // (Jika masih di tangan Kadiv, Koordinator belum dapat mendelegasikannya)
            const isAssignedToKoor =
              (currentUserId && String(t.pelaksana?.id) === String(currentUserId)) ||
              t.pelaksana?.role === 'KOORDINATOR';
            const isDirective = ['KADIV', 'DIREKTUR'].includes(t.pembuat?.role || '');
            return isDirective && isAssignedToKoor && t.status !== 'SELESAI';
          }
          return false;
        });
        setIncomingTickets(delegatableTickets);

        // Jika ada ticketId dari parameter URL (?ticketId=...), langsung isi form
        if (preselectedTicketId) {
          const found = delegatableTickets.find(
            (t) => String(t.id) === String(preselectedTicketId)
          );
          if (found) {
            setFormData((prev) => ({
              ...prev,
              judul: found.judul,
              lokasi: found.lokasi || '',
              deskripsi: found.deskripsi,
              prioritas: found.prioritas || 'MEDIUM',
              divisiId: found.divisi?.id
                ? String(found.divisi.id)
                : prev.divisiId,
            }));
          }
        }
      } catch (e) {
        console.warn('Gagal memuat tiket masuk:', e);
      }

      try {
        const divRes = await api.get('/auth/divisi');
        const listDivisi: Divisi[] = divRes.data?.data || divRes.data || [];
        setDivisiList(listDivisi);
        if (!formData.divisiId && listDivisi.length > 0) {
          setFormData((prev) => ({
            ...prev,
            divisiId: prev.divisiId || String(listDivisi[0].id),
          }));
        }
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }

      try {
        const staffRes = await api.get('/tickets/staff');
        setAllStaffList(staffRes.data?.data || staffRes.data || []);
      } catch (e) {
        try {
          const optRes = await api.get('/tickets/options');
          setAllStaffList(optRes.data?.pelaksana || []);
        } catch (errOpt) {
          console.warn('Gagal memuat staf:', errOpt);
        }
      }
    };

    loadInitialData();
  }, [preselectedTicketId]);

  // Saat memilih tiket laporan masalah dari dropdown, isi form secara otomatis
  const handleSelectIncomingTicket = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTicketId(val);

    if (!val) {
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
      }));
      return;
    }

    const found = incomingTickets.find((t) => String(t.id) === val);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        judul: found.judul,
        lokasi: found.lokasi || '',
        deskripsi: found.deskripsi,
        prioritas: found.prioritas || 'MEDIUM',
        divisiId: found.divisi?.id ? String(found.divisi.id) : prev.divisiId,
        pelaksanaId: '',
        deadline: found.deadline ? toDateTimeLocalInput(found.deadline) : prev.deadline,
      }));
    }
  };

  useEffect(() => {
    if (!formData.divisiId) {
      setPelaksanaList([]);
      return;
    }

    const fetchPelaksanaByDivisi = async () => {
      try {
        setLoadingOptions(true);
        const res = await api.get(`/tickets/options?divisiId=${formData.divisiId}`);
        setPelaksanaList(res.data.pelaksana || []);
      } catch (err) {
        console.error('Gagal memuat daftar pelaksana:', err);
        setPelaksanaList([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchPelaksanaByDivisi();
  }, [formData.divisiId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'divisiId') {
      setFormData({ ...formData, divisiId: value, pelaksanaId: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreatedTicket(null);
    setSubmitting(true);

    try {
      const payload: any = {
        tipe: 'BUAT_TUGAS',
        ticketId: selectedTicketId ? Number(selectedTicketId) : undefined,
        judul: formData.judul,
        lokasi: formData.lokasi,
        deskripsi: formData.deskripsi,
        prioritas: formData.prioritas,
        divisiId: Number(formData.divisiId),
        pelaksanaId: formData.pelaksanaId ? Number(formData.pelaksanaId) : null,
        deadline: new Date(formData.deadline).toISOString(),
      };

      if (parentId) {
        payload.parentTicketId = Number(parentId);
      }

      const response = await api.post('/tickets', payload);

      setCreatedTicket(response.data.data);
      setSelectedTicketId('');
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
        pelaksanaId: '',
        deadline: '',
      }));
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal menerbitkan tugas.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  // Utamakan staf di divisi yang dipilih, namun jika kosong tampilkan semua staf agar tidak macet
  const filteredStaff = allStaffList.filter(
    (s) => !formData.divisiId || String(s.divisiId) === String(formData.divisiId)
  );
  const staffToDisplay = pelaksanaList.length > 0
    ? pelaksanaList
    : (filteredStaff.length > 0 ? filteredStaff : allStaffList);

  // Label adaptif berbasis peran hierarki
  const pageTitle =
    userRole === 'DIREKTUR'
      ? 'Terbitkan Arahan Direksi'
      : userRole === 'KADIV'
      ? 'Terbitkan Arahan Divisi ke Koordinator'
      : parentId
      ? 'Terbitkan Tiket Operasional (Turunan Arahan)'
      : userRole === 'KOORDINATOR'
      ? 'Terbitkan Tugas Operasional Staf'
      : 'Pendelegasian Tugas Operasional';

  const pelaksanaLabel =
    userRole === 'DIREKTUR'
      ? 'Pilih Kepala Divisi (Kadiv) Penerima Arahan *'
      : userRole === 'KADIV'
      ? 'Pilih Koordinator Penerima Arahan *'
      : userRole === 'KOORDINATOR'
      ? 'Tunjuk Staf Pelaksana *'
      : 'Pilih Penerima Tugas *';

  const submitButtonText =
    userRole === 'DIREKTUR'
      ? 'Terbitkan Arahan ke Kepala Divisi'
      : userRole === 'KADIV'
      ? 'Terbitkan Arahan ke Koordinator'
      : parentId
      ? 'Terbitkan Tiket Operasional'
      : selectedTicketId
      ? 'Jadikan Tugas & Tetapkan Staf'
      : 'Terbitkan Tugas Baru';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full uppercase">
          Wewenang Penugasan ({userRole})
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {userRole === 'DIREKTUR'
            ? 'Menerbitkan arahan strategis rumah sakit kepada Kepala Divisi (Kadiv) terkait.'
            : userRole === 'KADIV'
            ? 'Menerbitkan target atau arahan divisi kepada Koordinator unit kerja terkait.'
            : parentId
            ? `Tiket ini ditautkan sebagai pelaksana operasional dari arahan induk Kadiv #T-${parentId}.`
            : 'Pendelegasian tugas operasional kepada staf pelaksana lengkap dengan batas waktu pengerjaan.'}
        </p>
      </div>

      {parentId && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Tugas Ditautkan ke Arahan Induk
            </span>
            <p className="text-sm font-bold text-indigo-950 mt-0.5">
              #T-{String(parentId).padStart(3, '0')} {parentTitle ? `— ${parentTitle}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/detail-tugas/${parentId}`)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
          >
            Lihat Arahan Induk →
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      )}

      {createdTicket && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <h3 className="text-sm font-bold text-emerald-900">
            Tugas #T-{String(createdTicket.id).padStart(3, '0')} Berhasil Diterbitkan!
          </h3>
          <p className="text-xs text-emerald-800">
            Penerima: <strong>{createdTicket.pelaksana?.nama || '-'}</strong> ({createdTicket.pelaksana?.role || '-'}) • Batas Waktu:{' '}
            <strong>{formatDateTime(createdTicket.deadline)}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/semua-tugas')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Lihat di Daftar Tugas →
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        {/* PENDELEGASIAN TUGAS (KHUSUS KADIV & KOORDINATOR) */}
        {['KADIV', 'KOORDINATOR'].includes(userRole) && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pendelegasian Tugas
              </label>
              {incomingTickets.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  {incomingTickets.length} Menunggu Delegasi
                </span>
              )}
            </div>
            <select
              value={selectedTicketId}
              onChange={handleSelectIncomingTicket}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">
                -- Pendelegasian Tugas Baru (Mandiri) --
              </option>
              {incomingTickets.map((t) => {
                const isDireksi = t.pembuat?.role === 'DIREKTUR';
                const isKadiv = t.pembuat?.role === 'KADIV';
                const prefix = isDireksi
                  ? '[Arahan Direksi] '
                  : isKadiv
                  ? '[Arahan Divisi] '
                  : '[Tiket Masalah] ';
                return (
                  <option key={t.id} value={String(t.id)}>
                    {prefix}#T-{String(t.id).padStart(3, '0')} | {t.judul} ({t.lokasi || 'Tanpa lokasi'}) — Dari {t.pembuat?.nama || 'Pegawai'}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-500">
              Pilih tiket di atas untuk mendelegasikan tugas dari laporan yang masuk, atau pilih opsi mandiri untuk membuat tugas baru.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Judul Tugas / Arahan *
            </label>
            <input
              type="text"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              required
              placeholder={
                userRole === 'DIREKTUR'
                  ? 'Contoh: Arahan Peningkatan Mutu Layanan Rumah Sakit'
                  : userRole === 'KADIV'
                  ? 'Contoh: Arahan Optimalisasi Layanan Nifas'
                  : 'Contoh: Perbaikan & Cuci AC Ruang Nifas'
              }
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Lokasi Ruangan / Aset *
            </label>
            <input
              type="text"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              required
              placeholder="Contoh: Gedung Utama Lt. 2 - Kamar Nifas 3"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Divisi Tujuan *
            </label>
            <select
              name="divisiId"
              value={formData.divisiId}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="" disabled>
                -- Pilih Divisi --
              </option>
              {divisiList.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              {pelaksanaLabel}
            </label>
            <select
              name="pelaksanaId"
              value={formData.pelaksanaId}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="">
                {loadingOptions ? 'Memuat daftar penerima...' : '-- Pilih Penerima --'}
              </option>
              {staffToDisplay.map((staf) => (
                <option key={staf.id} value={String(staf.id)}>
                  {staf.nama} {staf.role ? `(${staf.role})` : ''} {staf.divisi?.nama ? `[${staf.divisi.nama}]` : ''} {staf.noHp ? `• ${staf.noHp}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Prioritas *
            </label>
            <select
              name="prioritas"
              value={formData.prioritas}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
            >
              <option value="LOW">Biasa (Low)</option>
              <option value="MEDIUM">Penting (Medium)</option>
              <option value="HIGH">Darurat / Segera (High)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Batas Waktu Target (Tanggal & Jam) *
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            {userRole === 'DIREKTUR'
              ? 'Arahan Strategis Direksi *'
              : userRole === 'KADIV'
              ? 'Arahan / Instruksi Divisi *'
              : 'Instruksi Detail Pengerjaan *'}
          </label>
          <textarea
            name="deskripsi"
            rows={4}
            value={formData.deskripsi}
            onChange={handleChange}
            required
            placeholder={
              userRole === 'DIREKTUR'
                ? 'Jelaskan poin arahan strategis untuk ditindaklanjuti dan dirumuskan rencana aksinya oleh Kepala Divisi...'
                : userRole === 'KADIV'
                ? 'Jelaskan tujuan dan arahan kerja untuk ditindaklanjuti oleh Koordinator ke staf pelaksana...'
                : 'Tuliskan instruksi pengerjaan dan standar hasil yang perlu difoto oleh staf saat selesai...'
            }
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-lg shadow-sm transition"
          >
            {submitting ? 'Menyimpan...' : submitButtonText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TambahTugas;

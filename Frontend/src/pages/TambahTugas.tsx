// Frontend/src/pages/TambahTugas.tsx
import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import { useNavigate, useLocation } from 'react-router-dom';
=======
import { useNavigate, useSearchParams } from 'react-router-dom';
>>>>>>> origin/main
import api from '../services/api';

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
  divisiId?: number | null;
  divisi?: { id: number; nama: string } | null;
  pembuat?: { nama: string; role: string };
}

const TambahTugas: React.FC = () => {
  const navigate = useNavigate();
<<<<<<< HEAD
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'KOORDINATOR';
  const userDivisiId = localStorage.getItem('userDivisiId') || '';

  // Tangkap parameter query parentId jika pembuatan tiket diturunkan dari arahan Kadiv
  const searchParams = new URLSearchParams(location.search);
  const parentId = searchParams.get('parentId');
  const parentTitle = searchParams.get('parentTitle');
=======
  const [searchParams] = useSearchParams();
  const preselectedTicketId = searchParams.get('ticketId') || '';

  const userRole = localStorage.getItem('userRole') || 'KOORDINATOR';
  const userDivisiId = localStorage.getItem('userDivisiId') || '';

  const [incomingTickets, setIncomingTickets] = useState<IncomingTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(preselectedTicketId);
>>>>>>> origin/main

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

  // 1. Muat daftar tiket masalah (MENUNGGU_TRIASE), daftar divisi, dan daftar staf
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const ticketRes = await api.get('/tickets');
        const allTickets: IncomingTicket[] = Array.isArray(ticketRes.data)
          ? ticketRes.data
          : ticketRes.data?.data || [];
        const waitingTickets = allTickets.filter(
          (t) => t.status === 'MENUNGGU_TRIASE'
        );
        setIncomingTickets(waitingTickets);

        // Jika ada ticketId dari parameter URL (?ticketId=...), langsung isi form
        if (preselectedTicketId) {
          const found = waitingTickets.find(
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

<<<<<<< HEAD
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
=======
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
      }));
    }
  };
>>>>>>> origin/main

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

  const generateWhatsAppUrl = (ticket: any) => {
    const rawPhone = ticket?.pelaksana?.noHp || '';
    let waNumber = rawPhone.replace(/[\s\-]/g, '');
    if (waNumber.startsWith('0')) {
      waNumber = '62' + waNumber.slice(1);
    }
    const text = encodeURIComponent(
      `*[PENUGASAN BARU RSIA QURRATA A'YUN]*\n` +
        `No. Tiket: #T-${String(ticket.id).padStart(3, '0')}\n` +
        `Tugas: ${ticket.judul}\n` +
        `Lokasi: ${ticket.lokasi || '-'}\n` +
        `Prioritas: *${ticket.prioritas}*\n` +
        `Batas Waktu: *${formatDateTime(ticket.deadline)}*\n` +
        `Instruksi: ${ticket.deskripsi}\n\n` +
        `Silakan kerjakan dan unggah foto bukti penyelesaiannya di web E-Ticketing RSIA.`
    );
    return `https://wa.me/${waNumber}?text=${text}`;
  };

<<<<<<< HEAD
  // Label adaptif berbasis peran hierarki
  const pageTitle =
    userRole === 'KADIV'
      ? 'Terbitkan Arahan Divisi ke Koordinator'
      : parentId
      ? 'Terbitkan Tiket Operasional (Turunan Arahan)'
      : userRole === 'KOORDINATOR'
      ? 'Terbitkan Tugas Operasional Staf'
      : userRole === 'DIREKTUR'
      ? 'Terbitkan Arahan Direksi'
      : 'Buat Tugas Baru';

  const pelaksanaLabel =
    userRole === 'KADIV'
      ? 'Pilih Koordinator Penerima Arahan *'
      : userRole === 'KOORDINATOR'
      ? 'Tunjuk Staf Pelaksana *'
      : 'Pilih Penerima Tugas *';

  const submitButtonText =
    userRole === 'KADIV'
      ? 'Terbitkan Arahan ke Koordinator'
      : parentId
      ? 'Terbitkan Tiket Operasional'
      : 'Terbitkan Tugas';
=======
  // Utamakan staf di divisi yang dipilih, namun jika kosong tampilkan semua staf agar tidak macet
  const filteredStaff = allStaffList.filter(
    (s) => !formData.divisiId || String(s.divisiId) === String(formData.divisiId)
  );
  const staffToDisplay = filteredStaff.length > 0 ? filteredStaff : allStaffList;
>>>>>>> origin/main

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full uppercase">
          Wewenang Penugasan ({userRole})
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
<<<<<<< HEAD
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {userRole === 'KADIV'
            ? 'Menerbitkan target atau arahan divisi kepada Koordinator unit kerja terkait.'
            : parentId
            ? `Tiket ini ditautkan sebagai pelaksana operasional dari arahan induk Kadiv #T-${parentId}.`
            : 'Tetapkan pelaksana, prioritas, serta batas waktu pengerjaan (lengkap hingga jam & menit).'}
=======
          Buat Tugas Baru / Tindak Lanjuti Tiket Masalah
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih dari tiket laporan masalah yang masuk atau buat instruksi tugas baru lengkap dengan batas waktu (tanggal & jam).
>>>>>>> origin/main
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
            ✅ Tugas #T-{String(createdTicket.id).padStart(3, '0')} Berhasil Diterbitkan!
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

            {createdTicket.pelaksana?.noHp && (
              <a
                href={generateWhatsAppUrl(createdTicket)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                📲 Kirim Pemberitahuan ke WhatsApp {createdTicket.pelaksana.nama}
              </a>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        {/* PILIH DARI TIKET LAPORAN MASALAH YANG MASUK */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-amber-900 uppercase">
            📌 Ambil dari Tiket Laporan Masalah yang Masuk (Opsional)
          </label>
          <select
            value={selectedTicketId}
            onChange={handleSelectIncomingTicket}
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">
              -- Buat Tugas Baru Tanpa Tiket ({incomingTickets.length} Tiket Masalah Menunggu) --
            </option>
            {incomingTickets.map((t) => (
              <option key={t.id} value={String(t.id)}>
                #T-{String(t.id).padStart(3, '0')} | {t.judul} ({t.lokasi || 'Tanpa lokasi'}) — Dilaporkan oleh {t.pembuat?.nama || 'Pegawai'}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-amber-800">
            Jika Anda memilih salah satu tiket di atas, data di bawah akan terisi otomatis dan tiket tersebut langsung berubah menjadi tugas aktif.
          </p>
        </div>

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
              placeholder={userRole === 'KADIV' ? "Contoh: Arahan Optimalisasi Layanan Nifas" : "Contoh: Perbaikan & Cuci AC Ruang Nifas"}
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
<<<<<<< HEAD
              <option value="">
                {loadingOptions ? 'Memuat daftar penerima...' : '-- Pilih Penerima --'}
              </option>
              {pelaksanaList.map((staf) => (
                <option key={staf.id} value={String(staf.id)}>
                  {staf.nama} ({staf.role}) {staf.noHp ? `• ${staf.noHp}` : ''}
=======
              <option value="">-- Pilih Staf Pelaksana --</option>
              {staffToDisplay.map((staf) => (
                <option key={staf.id} value={String(staf.id)}>
                  {staf.nama} {staf.divisi?.nama ? `(${staf.divisi.nama})` : ''}
>>>>>>> origin/main
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
            {userRole === 'KADIV' ? 'Arahan / Instruksi Divisi *' : 'Instruksi Detail Pengerjaan *'}
          </label>
          <textarea
            name="deskripsi"
            rows={4}
            value={formData.deskripsi}
            onChange={handleChange}
            required
            placeholder={
              userRole === 'KADIV'
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
<<<<<<< HEAD
            {submitting ? 'Menyimpan...' : submitButtonText}
=======
            {submitting
              ? 'Menyimpan...'
              : selectedTicketId
              ? 'Jadikan Tugas & Tetapkan Staf'
              : 'Terbitkan Tugas Baru'}
>>>>>>> origin/main
          </button>
        </div>
      </form>
    </div>
  );
};

export default TambahTugas;
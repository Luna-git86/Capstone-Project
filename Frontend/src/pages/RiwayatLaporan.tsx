// Frontend/src/pages/RiwayatLaporan.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAuthUserId, getAuthRole } from '../utils/authStorage';

interface TicketItem {
  id: number;
  judul: string;
  lokasi: string | null;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  createdAt: string;
  updatedAt: string;
  pembuat?: { id: number; nama: string; role: string } | null;
  pelaksana?: { id: number; nama: string; role: string } | null;
  divisi?: { id: number; nama: string } | null;
}

export default function RiwayatLaporan() {
  const navigate = useNavigate();
  const currentUserId = getAuthUserId();
  const userRole = getAuthRole() || 'STAF';

  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  const [activeFilter, setActiveFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await api.get('/tickets?jenis=LAPORAN');
      const data: TicketItem[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAllTickets(data);
    } catch (err: any) {
      if (!isBackground) {
        console.error('Gagal memuat riwayat laporan:', err);
        setError(err.response?.data?.message || 'Gagal memuat data laporan.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(false);
    const intervalId = setInterval(() => fetchTickets(true), 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter 1: HANYA ambil tiket di mana user ini adalah pembuatnya
  const myReports = useMemo(() => {
    if (!currentUserId) return [];
    return allTickets.filter(t => String(t.pembuat?.id) === String(currentUserId));
  }, [allTickets, currentUserId]);

  // Filter 2: Kategori tab dan pencarian
  const filteredReports = useMemo(() => {
    return myReports.filter(t => {
      // Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.judul.toLowerCase().includes(q);
        const matchId = `t-${String(t.id).padStart(3, '0')}`.includes(q);
        if (!matchTitle && !matchId) return false;
      }

      // Tab Kategori
      if (activeFilter === 'Menunggu') {
        return ['MENUNGGU_TRIASE', 'MENUNGGU_VALIDASI'].includes(t.status);
      }
      if (activeFilter === 'Diproses') {
        return ['DIPROSES', 'HOLD_ESKALASI'].includes(t.status);
      }
      if (activeFilter === 'Selesai') {
        return t.status === 'SELESAI';
      }
      if (activeFilter === 'Ditolak') {
        return t.status === 'DITOLAK';
      }
      return true; // Tab 'Semua'
    });
  }, [myReports, activeFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_TRIASE': return { text: 'Belum Ditugaskan', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'DIPROSES': return { text: 'Sedang Dikerjakan', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'MENUNGGU_VALIDASI': return { text: 'Menunggu Evaluasi', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'HOLD_ESKALASI': return { text: 'Terkendala (Hold)', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'SELESAI': return { text: 'Selesai', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'DITOLAK': return { text: 'Ditolak', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { text: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const countMenunggu = myReports.filter(t => ['MENUNGGU_TRIASE', 'MENUNGGU_VALIDASI'].includes(t.status)).length;
  const countDiproses = myReports.filter(t => ['DIPROSES', 'HOLD_ESKALASI'].includes(t.status)).length;
  const countSelesai = myReports.filter(t => t.status === 'SELESAI').length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div>
        <span className="px-3 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded border border-indigo-200 uppercase tracking-wider">
          Akses Profil ({userRole})
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">
          Riwayat Laporan Saya
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          Pantau status penanganan dari semua masalah fasilitas atau arahan yang telah Anda buat/laporkan ke sistem.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium rounded-xl shadow-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['Semua', 'Menunggu', 'Diproses', 'Selesai'].map(tab => {
            const isActive = activeFilter === tab;
            let countLabel = '';
            if (tab === 'Semua') countLabel = `(${myReports.length})`;
            if (tab === 'Menunggu') countLabel = `(${countMenunggu})`;
            if (tab === 'Diproses') countLabel = `(${countDiproses})`;
            if (tab === 'Selesai') countLabel = `(${countSelesai})`;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab} {countLabel}
              </button>
            );
          })}
        </div>
        
        <div className="w-full md:w-64 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID tiket atau judul..."
            className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 animate-pulse font-medium">
            Memuat laporan Anda...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-400">Belum ada laporan di kategori ini.</p>
            <p className="text-xs mt-1">Anda belum membuat atau melaporkan tiket apa pun.</p>
          </div>
        ) : (
          filteredReports.map(ticket => {
            const badge = getStatusBadge(ticket.status);
            return (
              <div key={ticket.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      #T-{String(ticket.id).padStart(3, '0')}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${badge.bg}`}>
                      {badge.text}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{ticket.judul}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Lokasi: <span className="text-slate-700">{ticket.lokasi || '-'}</span> | Diteruskan ke: <span className="text-slate-700 uppercase font-bold">{ticket.divisi?.nama || 'Belum Ditentukan'}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pelaksana Teknis</p>
                    <p className="text-xs font-bold text-emerald-700 mt-0.5">{ticket.pelaksana?.nama || 'Belum Ditunjuk'}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dilaporkan Pada</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(ticket.createdAt))}
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate(`/detail-laporan/${ticket.id}`)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
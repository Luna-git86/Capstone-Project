import { useState } from 'react';

// Tipe data untuk Riwayat Tugas
type TaskHistory = {
  id: string;
  title: string;
  status: 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi';
  categories: string[];
  completionDate: string;
  supervisor: string;
  supervisorDiv: string;
  feedback: string;
};

export default function RiwayatTugas() {
  // State untuk accordion dan filter
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('Semua');

  const toggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  // Data Dummy Riwayat
  const tasks: TaskHistory[] = [
    {
      id: 'T-001', 
      title: 'Pengecekan Fasilitas Kamar Rawat Inap Lantai 2', 
      status: 'Disetujui', 
      categories: ['Fasilitas', 'Rutin'], 
      completionDate: '9 Sep 2026', 
      supervisor: 'Dr. Andi Kusuma', 
      supervisorDiv: 'Kadiv Medis',
      feedback: 'Kerja bagus! Pengecekan sudah dilakukan secara menyeluruh dan sesuai dengan standar operasional prosedur (SOP) rumah sakit. Silakan dipertahankan untuk periode berikutnya.'
    },
    {
      id: 'T-002', 
      title: 'Perbaikan Jaringan Internet Poli Gigi', 
      status: 'Sedang Dievaluasi', 
      categories: ['IT', 'Urgent'], 
      completionDate: '8 Sep 2026', 
      supervisor: 'Bapak Budi Santoso', 
      supervisorDiv: 'Kadiv IT',
      feedback: 'Laporan perbaikan sudah diterima. Saat ini sedang menunggu proses pengecekan akhir oleh tim Quality Assurance sebelum tiket dinyatakan selesai sepenuhnya.'
    },
    {
      id: 'T-003', 
      title: 'Laporan Audit Inventaris Obat Gudang Farmasi', 
      status: 'Revisi', 
      categories: ['Logistik', 'Laporan'], 
      completionDate: '5 Sep 2026', 
      supervisor: 'Ibu Siti Aminah', 
      supervisorDiv: 'Kadiv Farmasi',
      feedback: 'Ada beberapa perhitungan stok alat suntik dan paracetamol yang tidak sesuai dengan data di sistem. Tolong dicek ulang secara fisik dan perbarui laporannya.'
    }
  ];

  // Logika Filter
  const filteredTasks = activeFilter === 'Semua' 
    ? tasks 
    : tasks.filter(task => task.status === activeFilter);

  // Komponen Item Baris Riwayat
  const HistoryItem = ({ task }: { task: TaskHistory }) => {
    const isExpanded = expandedTaskId === task.id;

    // Warna berdasarkan status evaluasi
    const statusColors = {
      'Disetujui': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
      'Sedang Dievaluasi': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
      'Revisi': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    };
    const colors = statusColors[task.status];

    return (
      <div className="mb-4">
        {/* Baris Utama Card */}
        <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-5 gap-4">
          
          {/* ID Tugas & Badge Status */}
          <div className="flex items-center gap-4 shrink-0 w-40">
            <span className="text-xl font-bold text-slate-300">{task.id}</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colors.border} ${colors.bg}`}>
              <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
              <span className={`text-xs font-bold ${colors.text}`}>{task.status}</span>
            </div>
          </div>

          {/* Info Utama Tugas */}
          <div className="flex-1 flex flex-col justify-center border-l border-slate-100 pl-4">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{task.title}</h3>
            <div className="flex gap-2 mt-1.5">
              {task.categories.map((cat, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Kolom Kanan (Supervisor & Aksi) */}
          <div className="flex items-center gap-6 shrink-0 border-l border-slate-100 pl-6">
            <div className="text-right">
              <p className="text-xs text-slate-500">Selesai</p>
              <p className="text-sm font-bold text-slate-800">{task.completionDate}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {task.supervisor.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-slate-900 leading-tight">{task.supervisor}</p>
                <p className="text-xs text-slate-500">{task.supervisorDiv}</p>
              </div>
            </div>

            <button onClick={() => toggleExpand(task.id)} className="p-2 ml-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-lg transition-all">
              <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
        </div>

        {/* Konten Accordion (Feedback) */}
        {isExpanded && (
          <div className="mx-2 border-x border-b border-slate-200 bg-slate-50 rounded-b-xl p-6 shadow-inner animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Feedback Supervisor</h4>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {task.feedback}
            </p>
            <div className="flex justify-end">
              <button className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                Lihat Detail Laporan
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header & Informasi Staf */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-blue-600 mb-1">Nama Staff - Nama Divisinya</h2>
        <h1 className="text-3xl font-bold text-slate-900">Riwayat Penyelesaian Saya</h1>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 border-b border-slate-200 pb-6">
        
        {/* Tombol Filter Status */}
        <div className="flex gap-2">
          {['Semua', 'Disetujui', 'Sedang Dievaluasi', 'Revisi'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                activeFilter === filter 
                ? 'bg-slate-800 text-white border-slate-800' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'Semua' && 'Semua ' + tasks.length}
              {filter === 'Disetujui' && <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Disetujui</span>}
              {filter === 'Sedang Dievaluasi' && <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Dievaluasi</span>}
              {filter === 'Revisi' && <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Revisi</span>}
            </button>
          ))}
        </div>

        {/* Input Pencarian & Dropdown Waktu */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Cari riwayat tugas..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
            <option>Semua Waktu</option>
            <option>Minggu Ini</option>
            <option>Bulan Ini</option>
          </select>
        </div>
      </div>

      {/* List Riwayat Tugas */}
      <div className="flex flex-col">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => <HistoryItem key={task.id} task={task}/>)
        ) : (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Tidak ada riwayat tugas untuk filter ini.
          </div>
        )}
      </div>

    </div>
  );
}
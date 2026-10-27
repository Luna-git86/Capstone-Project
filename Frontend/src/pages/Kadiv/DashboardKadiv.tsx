export default function DashboardKadiv() {
  // --- DUMMY DATA ---
  const eskalasiMasuk = [
    { id: 'TSK-088', tugas: 'AC Poli Anak', koordinator: 'Ahmad', urgensi: 'Kritis' },
    { id: 'TKT-210', tugas: 'Pipa Farmasi', koordinator: 'Ahmad', urgensi: 'Tinggi' },
    { id: 'TSK-092', tugas: 'Genset Utama', koordinator: 'Diana', urgensi: 'Tinggi' }
  ];

  const semuaTugas = [
    { id: 'PRJ-012', nama: 'Inspeksi Kelistrikan IGD', PIC: 'Ahmad (Koor. Sarpras)', tipe: 'Instruksi', status: 'Dalam Progres', deadline: '30 Okt 2026' },
    { id: 'PRJ-013', nama: 'Audit Kepatuhan APD Teknisi', PIC: 'Diana (Koor. K3)', tipe: 'Instruksi', status: 'Menunggu Pengesahan', deadline: '28 Okt 2026' },
    { id: 'TSK-080', nama: 'Penggantian Pipa Wastafel IGD', PIC: 'Andi (Teknisi)', tipe: 'Laporan', status: 'Selesai', deadline: '27 Okt 2026' },
    { id: 'TSK-085', nama: 'Pengecekan Panel Listrik', PIC: 'M. Hafidz (Teknisi)', tipe: 'Laporan', status: 'Dalam Progres', deadline: '28 Okt 2026' }
  ];

  // Helper Warna Badge
  const getBadgeColor = (value: string) => {
    switch (value) {
      case 'Kritis': return 'bg-red-100 text-red-700';
      case 'Tinggi': return 'bg-amber-100 text-amber-700';
      case 'Menunggu Pengesahan': return 'bg-amber-100 text-amber-700';
      case 'Dalam Progres': return 'bg-indigo-100 text-indigo-700';
      case 'Selesai': return 'bg-emerald-100 text-emerald-700';
      case 'Instruksi': return 'bg-sky-100 text-sky-700';
      case 'Laporan': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 w-full flex flex-col gap-6 bg-slate-50 min-h-screen">
      
      {/* Header Dashboard */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ringkasan Dasbor Kadiv</h1>
          <p className="text-slate-500 text-sm mt-1">Pantauan strategis, eskalasi risiko, dan status tugas divisi</p>
        </div>
      </div>

      {/* 4 KARTU METRIK UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex flex-col relative overflow-hidden">
          <span className="text-rose-800 font-semibold text-sm mb-4">Antrean Eskalasi</span>
          <h2 className="text-4xl font-bold text-rose-700 mb-2">3</h2>
          <p className="text-rose-600 text-xs font-medium">Butuh keputusan manajerial</p>
        </div>

        <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 flex flex-col relative overflow-hidden">
          <span className="text-sky-800 font-semibold text-sm mb-4">Instruksi Aktif</span>
          <h2 className="text-4xl font-bold text-sky-700 mb-2">5</h2>
          <p className="text-sky-600 text-xs font-medium">Proyek makro berjalan</p>
        </div>

        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col relative overflow-hidden">
          <span className="text-amber-800 font-semibold text-sm mb-4">Menunggu Pengesahan</span>
          <h2 className="text-4xl font-bold text-amber-700 mb-2">2</h2>
          <p className="text-amber-600 text-xs font-medium">Tugas selesai dari Koordinator</p>
        </div>

        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col relative overflow-hidden">
          <span className="text-emerald-800 font-semibold text-sm mb-4">Rata-rata Kepatuhan SLA</span>
          <h2 className="text-4xl font-bold text-emerald-700 mb-2">92%</h2>
          <p className="text-emerald-600 text-xs font-medium">Periode Oktober 2026</p>
        </div>
      </div>

      {/* AREA TABEL BERDAMPINGAN (1:2 Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">
        
        {/* KOLOM KIRI: Tabel Eskalasi (Lebih Kecil) */}
        <div className="lg:col-span-1 bg-white border-2 border-rose-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-rose-50 bg-rose-50/30 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Eskalasi Masuk
            </h3>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Lihat Semua</button>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Insiden</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {eskalasiMasuk.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-bold text-slate-800">{item.tugas}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">{item.id} • {item.koordinator}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(item.urgensi)}`}>
                        {item.urgensi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KOLOM KANAN: Tabel Semua Tugas (Lebih Besar) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800">Pemantauan Semua Tugas Divisi</h3>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 border border-slate-200 rounded-md shadow-sm">
              Filter Tabel
            </button>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Tugas & ID</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">PIC / Koordinator</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tenggat Waktu</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status Akhir</th>
                </tr>
              </thead>
              <tbody>
                {semuaTugas.map((tugas, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-5">
                      <div className="text-sm font-bold text-slate-800">{tugas.nama}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-slate-500">{tugas.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getBadgeColor(tugas.tipe)}`}>
                          {tugas.tipe}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-sm font-semibold text-slate-700">{tugas.PIC}</td>
                    <td className="py-3 px-5 text-sm font-medium text-slate-600">{tugas.deadline}</td>
                    <td className="py-3 px-5 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(tugas.status)}`}>
                        {tugas.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
export default function DashboardKoordinator() {
  // --- DUMMY DATA ---
  const laporanMasuk = [
    { id: 'TKT-201', pelapor: 'Ns. Siti', unit: 'Poli Anak', masalah: 'AC Mati total, pasien kepanasan', urgensi: 'Tinggi', waktu: '10 menit lalu' },
    { id: 'TKT-202', pelapor: 'Bag. Farmasi', unit: 'Apotek', masalah: 'Printer resep macet', urgensi: 'Sedang', waktu: '1 jam lalu' }
  ];

  const tugasTim = [
    { id: 'TSK-088', nama: 'Perbaikan AC Poli Anak', staf: 'Budi (Teknisi)', status: 'Menunggu Validasi', deadline: 'Hari ini, 15:00', prioritas: 'Tinggi' },
    { id: 'TSK-089', nama: 'Pengecekan Genset', staf: 'Hafidz (Teknisi)', status: 'Dalam Proses', deadline: 'Besok, 10:00', prioritas: 'Sedang' },
    { id: 'TSK-090', nama: 'Distribusi APD', staf: 'Anda (Koor)', status: 'Baru', deadline: 'Besok, 12:00', prioritas: 'Rendah' }
  ];

  // --- HELPER WARNA BADGE ---
  const getBadgeColor = (value: string) => {
    switch (value) {
      case 'Tinggi': return 'bg-red-100 text-red-700';
      case 'Sedang': return 'bg-amber-100 text-amber-700';
      case 'Rendah': return 'bg-sky-100 text-sky-700';
      case 'Menunggu Validasi': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Dalam Proses': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'Baru': return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="p-8 w-full flex flex-col gap-8">
      
      {/* Header Dashboard */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ringkasan Dasbor Koordinator</h1>
        <p className="text-slate-500 text-sm mt-1">Divisi Teknisi & Pemeliharaan • Kamis, 28 Agustus 2026</p>
      </div>

      {/* 4 KARTU METRIK KOORDINATOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Kartu Laporan Baru */}
        <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sky-800 font-semibold text-sm">Laporan Masuk (Triase)</span>
            <svg className="w-6 h-6 stroke-sky-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-sky-700 mb-2">3</h2>
          <p className="text-sky-600 text-xs font-medium mb-3">Belum diproses menjadi tugas</p>
          <div className="w-full h-1.5 bg-sky-200/50 rounded-full mt-auto"><div className="h-full bg-sky-600 rounded-full w-[30%]"></div></div>
        </div>

        {/* Kartu Tugas Aktif Tim */}
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-amber-800 font-semibold text-sm">Tugas Tim Aktif</span>
            <svg className="w-6 h-6 stroke-amber-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-amber-700 mb-2">12</h2>
          <p className="text-amber-600 text-xs font-medium mb-3">Staf sedang bekerja di lapangan</p>
          <div className="w-full h-1.5 bg-amber-200/50 rounded-full mt-auto"><div className="h-full bg-amber-600 rounded-full w-[60%]"></div></div>
        </div>

        {/* Kartu Menunggu Validasi */}
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-emerald-800 font-semibold text-sm">Menunggu Validasi</span>
            <svg className="w-6 h-6 stroke-emerald-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-emerald-700 mb-2">5</h2>
          <p className="text-emerald-600 text-xs font-medium mb-3">Butuh persetujuan Anda segera</p>
          <div className="w-full h-1.5 bg-emerald-200/50 rounded-full mt-auto"><div className="h-full bg-emerald-600 rounded-full w-[80%]"></div></div>
        </div>

        {/* Kartu Kendala / Overdue */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-red-800 font-semibold text-sm">Kendala & Eskalasi</span>
            <svg className="w-6 h-6 stroke-red-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <h2 className="text-5xl font-bold text-red-700 mb-2">2</h2>
          <p className="text-red-600 text-xs font-medium mb-3">Melewati SLA atau lapor risiko</p>
          <div className="w-full h-1.5 bg-red-200/50 rounded-full mt-auto"><div className="h-full bg-red-600 rounded-full w-[15%]"></div></div>
        </div>
      </div>

      {/* TABEL RANGKUMAN TUGAS TIM */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-2">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Rangkuman Tugas Tim</h3>
            <p className="text-sm text-slate-500">Pantauan cepat pekerjaan Staf dan Anda</p>
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            Lihat Detail & Validasi →
          </button>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Pelaksana</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Deadline</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Prioritas</th>
              </tr>
            </thead>
            <tbody>
              {tugasTim.map((tugas, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-sm font-bold text-slate-700">{tugas.nama}</td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-600">{tugas.staf}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getBadgeColor(tugas.status)}`}>{tugas.status}</span>
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-600">{tugas.deadline}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(tugas.prioritas)}`}>{tugas.prioritas}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABEL RANGKUMAN LAPORAN MASUK */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Laporan Masuk Terkini</h3>
            <p className="text-sm text-slate-500">Antrean tiket yang memerlukan triase</p>
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            Buka Ruang Triase →
          </button>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">ID Laporan</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Masalah</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Pelapor & Unit</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Urgensi</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase">Waktu Masuk</th>
              </tr>
            </thead>
            <tbody>
              {laporanMasuk.map((laporan, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-sm font-bold text-slate-500">{laporan.id}</td>
                  <td className="py-4 px-6 text-sm font-bold text-slate-800">{laporan.masalah}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm font-semibold text-slate-700">{laporan.pelapor}</div>
                    <div className="text-xs text-slate-500">{laporan.unit}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(laporan.urgensi)}`}>{laporan.urgensi}</span>
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-500">{laporan.waktu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
export default function Dashboard() {
  return (
    <div className="p-8 flex flex-col gap-6">
      
      {/* 4 KARTU INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Kartu Biru - Aktif */}
        <div className="p-5 rounded-xl flex flex-col justify-between bg-sky-50 text-sky-700 border border-sky-200 shadow-sm">
          <div className="flex justify-between items-center font-semibold text-[0.95rem]">
            <span>Total Tugas Aktif</span>
            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </div>
          <div className="text-[2.8rem] font-bold my-2">56</div>
          <div>
            <div className="text-xs font-semibold mb-1">+12 Minggu ini</div>
            <div className="w-full h-1 bg-black/10 rounded-full">
              <div className="h-full bg-current rounded-full" style={{width: '70%'}}></div>
            </div>
          </div>
        </div>

        {/* Kartu Hijau - Selesai */}
        <div className="p-5 rounded-xl flex flex-col justify-between bg-green-50 text-green-700 border border-green-200 shadow-sm">
          <div className="flex justify-between items-center font-semibold text-[0.95rem]">
            <span>Tugas Selesai</span>
            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="text-[2.8rem] font-bold my-2">39</div>
          <div>
            <div className="text-xs font-semibold mb-1">Tingkat penyelesaian 61%</div>
            <div className="w-full h-1 bg-black/10 rounded-full">
              <div className="h-full bg-current rounded-full" style={{width: '61%'}}></div>
            </div>
          </div>
        </div>

        {/* Kartu Kuning - Terlambat */}
        <div className="p-5 rounded-xl flex flex-col justify-between bg-yellow-50 text-yellow-700 border border-yellow-200 shadow-sm">
          <div className="flex justify-between items-center font-semibold text-[0.95rem]">
            <span>Tugas Terlambat</span>
            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div className="text-[2.8rem] font-bold my-2">6</div>
          <div>
            <div className="text-xs font-semibold mb-1">Butuh perhatian segera</div>
            <div className="w-full h-1 bg-black/10 rounded-full">
              <div className="h-full bg-current rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>
        </div>

        {/* Kartu Merah - Urgent */}
        <div className="p-5 rounded-xl flex flex-col justify-between bg-red-50 text-red-700 border border-red-200 shadow-sm">
          <div className="flex justify-between items-center font-semibold text-[0.95rem]">
            <span>Urgent</span>
            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div className="text-[2.8rem] font-bold my-2">11</div>
          <div>
            <div className="text-xs font-semibold mb-1">Harus diselesaikan dalam 2 hari</div>
            <div className="w-full h-1 bg-black/10 rounded-full">
              <div className="h-full bg-current rounded-full" style={{width: '80%'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL BAWAH (Grid 2 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5 min-h-[400px]">
        
        {/* Panel Kiri: Capaian Terkini */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
            <h2 className="flex items-center gap-2 text-[1.2rem] text-slate-900 font-bold m-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-900 stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Capaian Terkini
            </h2>
            <span className="text-sm font-semibold text-slate-900">5 Selesai</span>
          </div>
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full border border-slate-900 flex justify-center items-center">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div className="flex-1">
                  <h4 className="m-0 mb-1 text-[0.95rem] text-slate-900 font-semibold">Lorem Ipsum dolor sit amet</h4>
                  <p className="m-0 text-xs text-slate-500">Nama Divisi - Tanggal selesai</p>
                </div>
                <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[0.7rem] font-bold">Urgent</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Kanan: Tabel Tugas Urgent */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          <div className="flex justify-start items-start border-b border-slate-100 pb-4 mb-4 flex-col">
            <h2 className="text-[1.2rem] text-slate-900 font-bold m-0">Total Tugas Urgent</h2>
            <p className="text-slate-900 text-[0.85rem] font-semibold mt-1">6 Menunggu Evaluasi</p>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 text-[0.85rem] text-slate-900 font-bold">Nama Tugas</th>
                  <th className="text-left py-3 px-4 text-[0.85rem] text-slate-900 font-bold">Ditugaskan Oleh</th>
                  <th className="text-left py-3 px-4 text-[0.85rem] text-slate-900 font-bold">Deadline</th>
                  <th className="text-left py-3 px-4 text-[0.85rem] text-slate-900 font-bold">Prioritas</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <tr key={item} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="py-4 px-4 text-[0.9rem] font-semibold text-slate-900 whitespace-nowrap">Lorem ipsum dolor sit amet</td>
                    <td className="py-4 px-4 text-[0.9rem] font-semibold text-slate-900 whitespace-nowrap">Nama Kadiv</td>
                    <td className="py-4 px-4 text-[0.9rem] font-semibold text-slate-900 whitespace-nowrap">13 Sep, 2026</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[0.75rem] font-bold">Urgent</span>
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
export default function DashboardStaff() {
  const dummyTasks = Array(7).fill({
    id: "T-001",
    nama: "Lorem Ipsum dolor sir amet",
    divisi: "Nama divisi",
    ditugaskan: "Dr. Kuuji",
    deadline: "yyyy-mm-dd",
    prioritas: "Urgent"
  });

  return (
    <div className="p-8 w-full flex flex-col gap-8">
      
      {/* Header Dashboard */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ringkasan Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Kamis, 28 Agustus, 2026</p>
      </div>

      {/* 4 KARTU METRIK (Sesuai Mockup) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Kartu Biru: Total Tugas Aktif */}
        <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sky-800 font-semibold text-sm">Total Tugas Aktif</span>
            <svg className="w-6 h-6 stroke-sky-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-sky-700 mb-2">56</h2>
          <p className="text-sky-600 text-xs font-medium mb-3">+12 Minggu ini</p>
          <div className="w-full h-1.5 bg-sky-200/50 rounded-full mt-auto"><div className="h-full bg-sky-600 rounded-full w-[70%]"></div></div>
        </div>

        {/* Kartu Hijau: Tugas Selesai */}
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-emerald-800 font-semibold text-sm">Tugas Selesai</span>
            <svg className="w-6 h-6 stroke-emerald-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-emerald-700 mb-2">39</h2>
          <p className="text-emerald-600 text-xs font-medium mb-3">Tingkat penyelesaian 61%</p>
          <div className="w-full h-1.5 bg-emerald-200/50 rounded-full mt-auto"><div className="h-full bg-emerald-600 rounded-full w-[61%]"></div></div>
        </div>

        {/* Kartu Kuning: Tugas Terlambat */}
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-amber-800 font-semibold text-sm">Tugas Terlambat</span>
            <svg className="w-6 h-6 stroke-amber-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-amber-700 mb-2">6</h2>
          <p className="text-amber-600 text-xs font-medium mb-3">Butuh perhatian segera</p>
          <div className="w-full h-1.5 bg-amber-200/50 rounded-full mt-auto"><div className="h-full bg-amber-600 rounded-full w-[20%]"></div></div>
        </div>

        {/* Kartu Merah: Urgent */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-red-800 font-semibold text-sm">Urgent</span>
            <svg className="w-6 h-6 stroke-red-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <h2 className="text-5xl font-bold text-red-700 mb-2">11</h2>
          <p className="text-red-600 text-xs font-medium mb-3">Harus diselesaikan dalam 2 hari</p>
          <div className="w-full h-1.5 bg-red-200/50 rounded-full mt-auto"><div className="h-full bg-red-600 rounded-full w-[85%]"></div></div>
        </div>
      </div>

      {/* TABEL TUGAS TERKINI */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-2">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Tugas Terkini</h3>
          <p className="text-sm text-slate-500">Tugasmu hari ini</p>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">ID Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Nama Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Divisi</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Ditugaskan</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Deadline</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Prioritas</th>
              </tr>
            </thead>
            <tbody>
              {dummyTasks.map((task, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="py-4 px-6 text-sm font-semibold text-slate-800">{task.id}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{task.nama}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{task.divisi}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{task.ditugaskan}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{task.deadline}</td>
                  <td className="py-4 px-6 text-sm font-bold text-slate-800">{task.prioritas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
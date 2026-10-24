import { useState } from 'react';

export default function DashboardStaff() {
  // Penambahan field 'status' pada dummy data
  const dummyTasks = Array(7).fill({
    id: "T-001",
    nama: "Perbaikan AC Poli Anak",
    divisi: "Teknisi",
    ditugaskan: "Dr. Kuuji",
    deadline: "2026-08-28",
    prioritas: "Tinggi",
    status: "Baru"
  });

  // Fungsi helper untuk warna badge prioritas
  const getPriorityBadge = (prioritas: string) => {
    switch (prioritas) {
      case 'Tinggi': return 'bg-red-100 text-red-700';
      case 'Sedang': return 'bg-amber-100 text-amber-700';
      case 'Rendah': return 'bg-sky-100 text-sky-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Fungsi helper untuk warna badge status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Baru': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Diproses': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'Revisi': return 'bg-rose-100 text-rose-700 border border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

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

        {/* Kartu Kuning: Dalam Proses */}
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-amber-800 font-semibold text-sm">Dalam Proses</span>
            <svg className="w-6 h-6 stroke-amber-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2 className="text-5xl font-bold text-amber-700 mb-2">6</h2>
          <p className="text-amber-600 text-xs font-medium mb-3">Dalam proses pengerjaan</p>
          <div className="w-full h-1.5 bg-amber-200/50 rounded-full mt-auto"><div className="h-full bg-amber-600 rounded-full w-[20%]"></div></div>
        </div>

        {/* Kartu Merah: Terlambat */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-red-800 font-semibold text-sm">Terlambat</span>
            <svg className="w-6 h-6 stroke-red-600 fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <h2 className="text-5xl font-bold text-red-700 mb-2">11</h2>
          <p className="text-red-600 text-xs font-medium mb-3">Harus diselesaikan dalam 2 hari</p>
          <div className="w-full h-1.5 bg-red-200/50 rounded-full mt-auto"><div className="h-full bg-red-600 rounded-full w-[85%]"></div></div>
        </div>
      </div>

      {/* TABEL TUGAS TERKINI */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-2">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Tugas Terkini</h3>
            <p className="text-sm text-slate-500">Daftar tugas yang harus Anda kerjakan</p>
          </div>
          {/* Opsi Tambahan: Input Pencarian */}
          <div className="relative">
            <input type="text" placeholder="Cari ID atau Nama..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
            <svg className="w-4 h-4 absolute left-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">ID Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Nama Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Deadline</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">Prioritas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dummyTasks.map((task, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-sm font-bold text-slate-700">{task.id}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm font-semibold text-slate-800">{task.nama}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{task.divisi} • Ditugaskan: {task.ditugaskan}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{task.deadline}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getPriorityBadge(task.prioritas)}`}>
                      {task.prioritas}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
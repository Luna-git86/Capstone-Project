export default function DokumenSop() {
  // Dummy data dokumen untuk di tabel
  const dummyDocs = Array(8).fill({
    id: "SOP-IT-2691301",
    judul: "Lorem Ipsum dolor sit amet",
    divisi: "Nama Divisi",
    tanggal: "13 Sep, 2026",
    kategori: "Kategori"
  });

  return (
    <div className="p-8 w-full">
      {/* Container Putih Utama */}
      <div className="bg-white border border-slate-300 rounded-2xl w-full min-h-[600px] overflow-hidden flex flex-col">
        
        {/* Header Aksi: Pencarian & Tombol Upload */}
        <div className="flex items-center gap-4 p-6 border-b border-slate-100">
          
          {/* Kolom Pencarian */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-400 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Cari" 
              className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* Tombol Upload */}
          <button className="bg-[#0066cc] hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2">
            <span className="text-lg font-bold leading-none">+</span>
            Upload SOP
          </button>
          
        </div>

        {/* Tabel Data Dokumen */}
        <div className="w-full overflow-x-auto flex-1">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="bg-[#f4f5f7]">
              <tr>
                <th className="py-4 px-6 font-bold text-slate-900 text-[0.95rem]">Id Dokumen</th>
                <th className="py-4 px-6 font-bold text-slate-900 text-[0.95rem]">Judul Dokumen</th>
                <th className="py-4 px-6 font-bold text-slate-900 text-[0.95rem]">Divisi</th>
                <th className="py-4 px-6 font-bold text-slate-900 text-[0.95rem]">Tanggal Upload</th>
                <th className="py-4 px-6 font-bold text-slate-900 text-[0.95rem]">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {dummyDocs.map((doc, index) => (
                <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-slate-700 text-[0.95rem]">{doc.id}</td>
                  <td className="py-4 px-6 text-slate-700 text-[0.95rem]">{doc.judul}</td>
                  <td className="py-4 px-6 text-slate-700 text-[0.95rem]">{doc.divisi}</td>
                  <td className="py-4 px-6 text-slate-700 text-[0.95rem]">{doc.tanggal}</td>
                  <td className="py-4 px-6 text-slate-700 text-[0.95rem]">{doc.kategori}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
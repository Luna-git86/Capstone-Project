import { useState } from 'react';

export default function LaporkanMasalah() {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [urgensi, setUrgensi] = useState('NORMAL');
  const [deskripsi, setDeskripsi] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Di sini nantinya Anda akan memanggil API backend
    alert('Laporan masalah berhasil dikirim ke antrean sistem!');
    console.log({ judul, kategori, lokasi, urgensi, deskripsi, fileName });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">Laporkan Masalah</h1>
        <p className="text-slate-500 mt-2">Buat tiket laporan baru untuk masalah teknis, fasilitas, atau operasional agar segera ditindaklanjuti.</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Baris 1: Judul Masalah */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Judul Masalah <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: AC Bocor di Ruang Tunggu Poli Anak" 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
            />
          </div>

          {/* Baris 2: Kategori & Lokasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Kategori <span className="text-red-500">*</span></label>
              <select 
                required
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-slate-700"
              >
                <option value="" disabled>Pilih kategori masalah...</option>
                <option value="IT & Jaringan">IT & Jaringan</option>
                <option value="Fasilitas & Gedung">Fasilitas & Gedung</option>
                <option value="Peralatan Medis">Peralatan Medis</option>
                <option value="Logistik & Farmasi">Logistik & Farmasi</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Lokasi Spesifik <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Contoh: Lantai 2, Gedung B" 
                className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Baris 4: Deskripsi */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Deskripsi Lengkap <span className="text-red-500">*</span></label>
            <textarea 
              required
              rows={4}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Jelaskan masalah secara detail..." 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400 resize-y"
            ></textarea>
          </div>

          {/* Baris 5: File Upload (Drag & Drop Zone) */}
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-bold text-slate-700">Lampirkan Bukti Foto/Dokumen (Opsional)</label>
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group cursor-pointer">
              
              {/* Hidden Input File */}
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              
              {fileName ? (
                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {fileName}
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 mb-1">Klik untuk unggah atau seret file ke sini</p>
                  <p className="text-xs text-slate-500">Mendukung format JPG, PNG, atau PDF (Maks. 5MB)</p>
                </>
              )}
            </div>
          </div>

          {/* Baris 6: Tombol Aksi */}
          <div className="flex items-center justify-end gap-4 mt-4 pt-6 border-t border-slate-100">
            <button type="button" className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Batal
            </button>
            <button type="submit" className="px-8 py-3 text-sm font-bold text-white bg-[#005bb5] hover:bg-blue-700 shadow-md shadow-blue-500/20 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              Kirim Laporan
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TambahTugas() {
  const navigate = useNavigate();
  
  // Simulasi mengambil role pengguna yang sedang login (KADIV atau KOORDINATOR)
  // Di aplikasi nyata, ini biasanya diambil dari localStorage atau Context/Redux
  const userRole = localStorage.getItem('userRole') || 'KOORDINATOR'; 

  // State untuk form
  const [formData, setFormData] = useState({
    judul: '',
    deskripsi: '',
    pelaksana: '',
    deadline: '',
    urgensi: 'MEDIUM',
    dokumen: null as File | null
  });

  // Simulasi daftar bawahan yang berbeda tergantung Role
  const [daftarBawahan, setDaftarBawahan] = useState<{ id: string, nama: string, divisi?: string }[]>([]);

  useEffect(() => {
    // Logika adaptif: Jika Kadiv, panggil daftar Koordinator. Jika Koordinator, panggil daftar Staf/Teknisi.
    if (userRole === 'KADIV') {
      setDaftarBawahan([
        { id: 'KOR-01', nama: 'Ahmad', divisi: 'Sarpras' },
        { id: 'KOR-02', nama: 'Diana', divisi: 'K3' },
        { id: 'KOR-03', nama: 'Budi', divisi: 'Alkes' }
      ]);
    } else {
      setDaftarBawahan([
        { id: 'STF-01', nama: 'M. Hafidz (Listrik)' },
        { id: 'STF-02', nama: 'Budi Santoso (AC)' },
        { id: 'STF-03', nama: 'Andi (Umum)' }
      ]);
    }
  }, [userRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, dokumen: e.target.files[0] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Kirim formData ke API menggunakan multipart/form-data
    console.log('Data yang akan dikirim:', formData, 'Oleh Role:', userRole);
    
    // Kembali ke halaman sebelumnya setelah sukses
    navigate(-1); 
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* Header Adaptif */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {userRole === 'KADIV' ? 'Buat Instruksi Manajerial Baru' : 'Delegasikan Tugas Baru'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {userRole === 'KADIV' 
                ? 'Rancang proyek dan tetapkan Koordinator sebagai penanggung jawab.' 
                : 'Buat rincian tugas kerja dan delegasikan kepada staf lapangan.'}
            </p>
          </div>
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Kembali
          </button>
        </div>

        {/* Form Utama */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Judul {userRole === 'KADIV' ? 'Proyek/Instruksi' : 'Tugas'} <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="judul"
                value={formData.judul}
                onChange={handleChange}
                placeholder={userRole === 'KADIV' ? "Cth: Inspeksi Panel Kelistrikan Bulanan" : "Cth: Perbaikan AC Poli Anak"}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Deskripsi / Target Pekerjaan <span className="text-rose-500">*</span></label>
              <textarea 
                name="deskripsi"
                value={formData.deskripsi}
                onChange={handleChange}
                rows={4}
                placeholder="Jelaskan detail pekerjaan, target yang harus dicapai, atau instruksi khusus..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                required
              ></textarea>
            </div>

            {/* Field Adaptif: Pilihan Bawahan */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Pilih {userRole === 'KADIV' ? 'Koordinator PIC' : 'Teknisi / Staf'} <span className="text-rose-500">*</span>
              </label>
              <select 
                name="pelaksana"
                value={formData.pelaksana}
                onChange={handleChange}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                required
              >
                <option value="" disabled>-- Pilih Penanggung Jawab --</option>
                {daftarBawahan.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nama} {b.divisi && `(Koordinator ${b.divisi})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tenggat Waktu (Deadline) <span className="text-rose-500">*</span></label>
              <input 
                type="datetime-local" 
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700" 
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tingkat Urgensi <span className="text-rose-500">*</span></label>
              <select 
                name="urgensi"
                value={formData.urgensi}
                onChange={handleChange}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
              >
                <option value="LOW">Rendah (Pengerjaan Rutin)</option>
                <option value="MEDIUM">Sedang (Perlu Perhatian)</option>
                <option value="HIGH">Tinggi (Segera Dieksekusi)</option>
              </select>
            </div>

            {/* Upload File Universal (Bisa untuk SOP Kadiv / Skema dari Koordinator) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Lampiran Dokumen (SOP / Denah / Foto)
              </label>
              <input 
                type="file" 
                onChange={handleFileChange}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
              />
              <p className="text-xs text-slate-400 mt-2">Format: PDF, JPG, PNG (Maks. 5MB)</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end items-center">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors text-sm w-full md:w-auto">
              {userRole === 'KADIV' ? 'Terbitkan Instruksi Manajerial' : 'Buat & Delegasikan Tugas'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
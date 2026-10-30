import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- TIPE DATA ---
interface Pegawai {
  id: number;
  nama: string;
  role: 'STAF' | 'KOORDINATOR' | 'KADIV' | 'DIREKTUR';
  divisi: string;
}

export default function TambahTugas() {
  const navigate = useNavigate();

  // State untuk form
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [prioritas, setPrioritas] = useState('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [pelaksanaId, setPelaksanaId] = useState('');
  const [kategori, setKategori] = useState(''); // State baru untuk kategori
  
  // State untuk file upload
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State untuk data dinamis
  const [daftarPelaksana, setDaftarPelaksana] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);

  // Ambil role user yang sedang login dari localStorage
  const currentRole = localStorage.getItem('userRole') || 'STAF'; 

  useEffect(() => {
    // Fungsi simulasi untuk mengambil daftar pegawai dari API
    const fetchPelaksana = async () => {
      try {
        setLoading(true);
        // SIMULASI DUMMY DATA SEMENTARA
        const dummyPegawai: Pegawai[] = [
          { id: 1, nama: 'Andi (Staf Sarpras)', role: 'STAF', divisi: 'Sarpras' },
          { id: 2, nama: 'Budi (Staf IT)', role: 'STAF', divisi: 'IT' },
          { id: 3, nama: 'Hafidz (Koor. Sarpras)', role: 'KOORDINATOR', divisi: 'Sarpras' },
          { id: 4, nama: 'Siti (Koor. IT)', role: 'KOORDINATOR', divisi: 'IT' },
          { id: 5, nama: 'Dr. Hendra (Kadiv Operasional)', role: 'KADIV', divisi: 'Operasional' },
        ];

        let filteredPegawai: Pegawai[] = [];

        if (currentRole === 'KOORDINATOR') {
          filteredPegawai = dummyPegawai.filter(p => p.role === 'STAF');
        } else if (currentRole === 'KADIV') {
          filteredPegawai = dummyPegawai.filter(p => p.role === 'KOORDINATOR' || p.role === 'STAF');
        } else if (currentRole === 'DIREKTUR') {
          filteredPegawai = dummyPegawai.filter(p => p.role !== 'DIREKTUR');
        }

        setDaftarPelaksana(filteredPegawai);
      } catch (error) {
        console.error('Gagal mengambil daftar pelaksana:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentRole === 'STAF') {
       navigate('/unauthorized');
    } else {
       fetchPelaksana();
    }
  }, [currentRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // NANTINYA: Kirim data ke backend menggunakan api.post('/tickets', formData)
    // Jika ada file, gunakan FormData alih-alih JSON
    console.log({ judul, pelaksanaId, prioritas, deadline, kategori, file, deskripsi });
    alert('Tugas berhasil ditambahkan!');
    navigate(-1);
  };

  const getPageTitle = () => {
    if (currentRole === 'DIREKTUR') return 'Buat Instruksi Direksi';
    if (currentRole === 'KADIV') return 'Buat Instruksi Manajerial';
    return 'Tambah Tugas Baru'; 
  };

  // --- LOGIKA DRAG & DROP FILE ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-3xl w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        
        <div className="mb-8 border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-bold text-slate-800">{getPageTitle()}</h1>
          <p className="text-slate-500 text-sm mt-1">Isi formulir di bawah ini untuk mendelegasikan pekerjaan ke tim Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Input Judul */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nama Tugas / Instruksi <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Cth: Inspeksi Panel Listrik Bulanan"
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Grid 2 Kolom: Pelaksana & Prioritas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Pelaksana <span className="text-red-500">*</span></label>
              <select 
                required
                value={pelaksanaId}
                onChange={(e) => setPelaksanaId(e.target.value)}
                disabled={loading}
                className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>-- Pilih Orang atau Tim --</option>
                {loading ? (
                  <option disabled>Memuat daftar pelaksana...</option>
                ) : (
                  daftarPelaksana.map((pegawai) => (
                    <option key={pegawai.id} value={pegawai.id}>
                      {pegawai.nama} - [{pegawai.role}]
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {currentRole === 'KOORDINATOR' && 'Menampilkan daftar Staf di divisi Anda.'}
                {currentRole === 'KADIV' && 'Menampilkan daftar Koordinator dan Staf di divisi Anda.'}
                {currentRole === 'DIREKTUR' && 'Menampilkan semua personel rumah sakit.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tingkat Prioritas</label>
              <select 
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Rendah (Low)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="HIGH">Tinggi (High)</option>
              </select>
            </div>
          </div>

          {/* Grid 2 Kolom: Deadline & Kategori */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Batas Waktu (Deadline) <span className="text-red-500">*</span></label>
              <input 
                type="date" 
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Form Kategori Baru */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kategori Tugas</label>
              <select 
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>-- Pilih Kategori --</option>
                <option value="MAINTENANCE">Pemeliharaan (Maintenance)</option>
                <option value="REPAIR">Perbaikan (Repair)</option>
                <option value="INSPECTION">Inspeksi Rutin</option>
                <option value="PROJECT">Proyek Baru</option>
              </select>
            </div>
          </div>

          {/* Area Drag & Drop Upload File */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Lampiran Dokumen / Foto (Opsional)</label>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              
              {!file ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  <p className="text-sm font-semibold text-slate-600">Klik untuk upload atau drag & drop file ke sini</p>
                  <p className="text-xs text-slate-400">PDF, Word, JPG, PNG (Maks. 5MB)</p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <svg className="w-6 h-6 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span className="text-sm font-semibold text-slate-700 truncate">{file.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRemoveFile}
                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Input Deskripsi (Dipindah ke bawah) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Instruksi Detail</label>
            <textarea 
              rows={4}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Tulis rincian langkah kerja atau catatan tambahan di sini..."
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
            >
              Delegasikan Tugas
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
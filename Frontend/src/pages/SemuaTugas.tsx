import { useState } from 'react';

// Tipe data untuk mempermudah struktur
type Task = {
  id: string;
  title: string;
  priority: 'Urgent' | 'High' | 'Low';
  status: 'Belum Dikerjakan' | 'Sedang Dikerjakan';
  categories: string[];
  date: string;
  description: string;
  assigner: string;
  assignerDiv: string;
};

export default function SemuaTugas() {
  // State untuk melacak ID tugas mana yang sedang di-expand (terbuka)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Fungsi untuk toggle buka/tutup accordion
  const toggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  // Dummy Data
  const tasks: Task[] = [
    {
      id: 't1', title: 'Lorem ipsum dolor sit amet', priority: 'Urgent', status: 'Sedang Dikerjakan', categories: ['Kategori', 'Kategori'], date: 'Sep 26', assigner: 'Hafidz Naufal', assignerDiv: 'Logistik',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus sollicitudin odio eget nibh tincidunt, aliquet rutrum tellus pharetra. Vivamus nec purus rutrum, mattis tellus in, consectetur justo. Nullam congue pellentesque risus, vel ornare lacus malesuada ac. Donec a pellentesque sapien. Vivamus convallis turpis in porta accumsan. Vestibulum scelerisque iaculis sapien, ut consequat ligula finibus in. Donec nec magna sit amet turpis tempus imperdiet. Proin non euismod tortor. Proin pulvinar quam non nibh malesuada, et cursus libero mattis.'
    },
    {
      id: 't2', title: 'Lorem ipsum dolor sit amet', priority: 'Urgent', status: 'Belum Dikerjakan', categories: ['Kategori', 'Kategori'], date: 'Sep 26', assigner: 'Hafidz Naufal', assignerDiv: 'Logistik',
      description: 'Detail tugas urgent kedua yang harus segera ditangani oleh staf terkait sebelum batas waktu habis.'
    },
    {
      id: 't3', title: 'Lorem ipsum dolor sit amet', priority: 'High', status: 'Belum Dikerjakan', categories: ['Kategori', 'Kategori'], date: 'Sep 26', assigner: 'Dr. Andi', assignerDiv: 'Medis',
      description: 'Tugas dengan prioritas tinggi, periksa ketersediaan alat medis di ruang operasi lantai 3.'
    },
    {
      id: 't4', title: 'Lorem ipsum dolor sit amet', priority: 'Low', status: 'Belum Dikerjakan', categories: ['Kategori', 'Kategori'], date: 'Sep 26', assigner: 'Budi', assignerDiv: 'Fasilitas',
      description: 'Tugas rutin pemeliharaan fasilitas gedung, periksa lampu koridor sayap timur.'
    }
  ];

  // Memisahkan tugas Urgent dan Lainnya
  const urgentTasks = tasks.filter(t => t.priority === 'Urgent');
  const otherTasks = tasks.filter(t => t.priority !== 'Urgent');

  // Komponen Helper untuk merender satu baris tugas (Accordion Item)
  const TaskItem = ({ task }: { task: Task }) => {
    const isExpanded = expandedTaskId === task.id;
    
    // Menentukan warna berdasarkan prioritas
    const priorityColors = {
      Urgent: { bg: 'bg-red-600', text: 'text-red-600', dot: 'bg-red-600', border: 'border-red-200' },
      High: { bg: 'bg-amber-500', text: 'text-amber-500', dot: 'bg-amber-500', border: 'border-amber-200' },
      Low: { bg: 'bg-green-500', text: 'text-green-600', dot: 'bg-green-500', border: 'border-green-200' }
    };
    const colors = priorityColors[task.priority];

    return (
      <div className="mb-4">
        {/* Baris Utama Tugas */}
        <div className="flex items-start bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden pr-6">
          {/* Garis Warna Kiri */}
          <div className={`w-3 shrink-0 ${colors.bg} self-stretch`}></div>
          
          <div className="flex-1 py-5 pl-5 pr-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-start gap-4">
              {/* Badge Prioritas */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${colors.border} bg-white shrink-0 mt-1`}>
                <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                <span className={`text-xs font-semibold ${colors.text}`}>{task.priority}</span>
              </div>

              {/* Info Utama */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{task.title}</h3>
                
                {/* Meta Info (Tanggal, Status, Kategori) */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {task.date}
                  </div>
                  
                  {/* Badge Status */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    task.status === 'Sedang Dikerjakan' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {task.status}
                  </span>

                  {/* Kategori */}
                  {task.categories.map((cat, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded border border-slate-200 text-slate-500 text-[10px] font-medium bg-white">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Aksi Kanan (Tombol & Panah) */}
            <div className="flex items-center gap-4 self-end md:self-auto">
              {/* Panah Dropdown */}
              <button onClick={() => toggleExpand(task.id)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>

              {/* Tombol Aksi */}
              {task.status === 'Sedang Dikerjakan' ? (
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-bold text-blue-600 border-2 border-blue-100 bg-white hover:bg-blue-50 rounded-lg transition-colors">Update Progres</button>
                  <button className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Submit</button>
                </div>
              ) : (
                <button className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Mulai</button>
              )}
            </div>

          </div>
        </div>

        {/* Area Deskripsi (Accordion Content) */}
        {isExpanded && (
          <div className="ml-3 border-x border-b border-slate-200 bg-slate-50 rounded-b-xl p-6 shadow-inner animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Tugas</h4>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              {task.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <svg className="w-4 h-4 stroke-slate-400 stroke-2 fill-none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Ditugaskan Oleh <span className="font-bold text-slate-900">{task.assigner}</span> - {task.assignerDiv}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl">
      
      {/* Header Halaman */}
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h2 className="text-xl text-slate-500 font-medium">Nama Divisi</h2>
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">Tugas Aktif</h1>
        <p className="text-slate-400 text-lg mt-1">{tasks.length} Tugas Tersisa</p>
      </div>

      {/* Bagian URGENT */}
      {urgentTasks.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
            <h2 className="text-lg font-bold text-red-600">Urgent - Kerjakan Segera</h2>
          </div>
          <div className="flex flex-col">
            {urgentTasks.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Bagian TUGAS LAINNYA */}
      {otherTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 ml-1">Tugas Lainnya</h2>
          <div className="flex flex-col">
            {otherTasks.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}

    </div>
  );
}
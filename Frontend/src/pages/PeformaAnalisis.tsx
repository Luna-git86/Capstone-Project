import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

export default function PeformaAnalisis() {
  // --- DUMMY DATA ---
  const dataDivisi = [
    { name: 'Teknologi', selesai: 70, proses: 20, telat: 10 },
    { name: 'Pemasaran', selesai: 68, proses: 15, telat: 17 },
    { name: 'Operasional', selesai: 72, proses: 20, telat: 8 },
    { name: 'Produk', selesai: 46, proses: 30, telat: 24 },
    { name: 'Desain', selesai: 68, proses: 20, telat: 12 },
    { name: 'Penjualan', selesai: 53, proses: 30, telat: 17 },
  ];

  const dataPerforma = [
    { name: 'Selesai Tepat Waktu', value: 85 },
    { name: 'Telat', value: 15 },
  ];
  const COLORS = ['#10b981', '#ef4444']; // Hijau dan Merah

  const dataTren = [
    { bulan: 'Jan', selesai: 40, telat: 15 },
    { bulan: 'Feb', selesai: 45, telat: 12 },
    { bulan: 'Mar', selesai: 55, telat: 10 },
    { bulan: 'Apr', selesai: 50, telat: 18 },
    { bulan: 'Mei', selesai: 65, telat: 8 },
    { bulan: 'Jun', selesai: 70, telat: 5 },
  ];

  return (
    <div className="p-8 w-full flex flex-col gap-6">
      
      {/* 4 KARTU KPI ATAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-800 leading-tight">Rata-Rata<br/>Tingkat Penyelesaian</p>
          <h2 className="text-4xl font-bold text-emerald-500 my-3">85%</h2>
          <p className="text-xs font-semibold text-slate-500">+12 Minggu ini</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-800 leading-tight">Tugas Bulan ini</p>
          <h2 className="text-4xl font-bold text-blue-600 my-3">56</h2>
          <p className="text-xs font-semibold text-slate-500">-6.2% dibanding bulan kemarin</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-800 leading-tight">Rata-rata waktu<br/>yang dibutuhkan</p>
          <h2 className="text-4xl font-bold text-slate-900 my-3">3.5<span className="text-2xl">hari</span></h2>
          <p className="text-xs font-semibold text-slate-500">Target ≤5 hari</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-800 leading-tight">Tingkat eskalasi</p>
          <h2 className="text-4xl font-bold text-red-500 my-3">15%</h2>
          <p className="text-xs font-semibold text-slate-500">Tugas yang terlambat</p>
        </div>
      </div>

      {/* BARIS TENGAH: GRAFIK DIVISI & DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        
        {/* Grafik Bar: Penyelesaian Berdasarkan Divisi */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900">Penyelesaian Tugas berdasarkan Divisi</h3>
          <p className="text-xs text-slate-500 mb-6 font-semibold">Penyelesaian dan gambaran umum status secara real-time per divisi operasional</p>
          
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataDivisi} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 600, fontSize: 13}} width={100} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b', paddingTop: '20px' }} />
                <Bar dataKey="selesai" name="Selesai" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={16} />
                <Bar dataKey="proses" name="Sedang dikerjakan" stackId="a" fill="#3b82f6" />
                <Bar dataKey="telat" name="Telat" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Donut: Persentase Performa */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between items-center relative">
          <div className="w-full text-left">
            <h3 className="text-lg font-bold text-slate-900">Persentase performa</h3>
            <p className="text-xs text-slate-500 font-semibold">85% Selesai • 15% Telat</p>
          </div>
          
          <div className="w-full h-[220px] mt-4 relative flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataPerforma} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                  {dataPerforma.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Teks di tengah Donut */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-900">85%</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">TEPAT WAKTU</span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 mt-6">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="flex items-center gap-2 text-slate-700"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Selesai</span>
              <span>85 <span className="text-slate-400 text-xs ml-1">85%</span></span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="flex items-center gap-2 text-slate-700"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Telat</span>
              <span>15 <span className="text-slate-400 text-xs ml-1">15%</span></span>
            </div>
          </div>
        </div>

      </div>

      {/* BARIS BAWAH: GRAFIK TREN (Tambahan Ekstra) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Tren Produktivitas Bulanan</h3>
        <p className="text-xs text-slate-500 mb-6 font-semibold">Perbandingan tugas selesai tepat waktu vs terlambat dalam 6 bulan terakhir</p>
        
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataTren} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
              <Line type="monotone" dataKey="selesai" name="Selesai Tepat Waktu" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="telat" name="Telat" stroke="#ef4444" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
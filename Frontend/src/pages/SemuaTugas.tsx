import { useState } from 'react';

export default function SemuaTugas() {
  const [expandedSection, setExpandedSection] = useState<string | null>('belum');

  // Konfigurasi warna dengan class Tailwind
  const sections = [
    { id: 'terlambat', label: 'Terlambat', bgClass: 'bg-red-600', textClass: 'text-white', thClass: 'bg-red-100 text-red-800' },
    { id: 'belum', label: 'Belum Dikerjakan', bgClass: 'bg-slate-300', textClass: 'text-slate-900', thClass: 'bg-slate-100 text-slate-900' },
    { id: 'proses', label: 'Dalam Proses', bgClass: 'bg-sky-600', textClass: 'text-white', thClass: 'bg-sky-100 text-sky-800' },
    { id: 'evaluasi', label: 'Menunggu Evaluasi', bgClass: 'bg-amber-500', textClass: 'text-white', thClass: 'bg-amber-100 text-amber-800' },
    { id: 'selesai', label: 'Selesai', bgClass: 'bg-green-600', textClass: 'text-white', thClass: 'bg-green-100 text-green-800' }
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="flex flex-col w-full">
      {sections.map((section) => {
        const isOpen = expandedSection === section.id;
        
        return (
          <div key={section.id} className="w-full">
            
            {/* Accordion Header */}
            <div 
              className={`px-8 py-5 text-[1.35rem] font-bold flex justify-between items-center cursor-pointer border-b border-black/5 hover:opacity-90 transition-opacity ${section.bgClass} ${section.textClass}`}
              onClick={() => toggleSection(section.id)}
            >
              <span>{section.label}</span>
              <svg viewBox="0 0 24 24" className="w-6 h-6 min-w-[24px] stroke-current stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round">
                {isOpen ? (
                  <polyline points="18 15 12 9 6 15"></polyline>
                ) : (
                  <polyline points="6 9 12 15 18 9"></polyline>
                )}
              </svg>
            </div>

            {/* Accordion Body (Tabel) */}
            {isOpen && (
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left">
                      <thead className={`${section.thClass}`}>
                        <tr>
                          <th className="px-5 py-3.5 font-bold text-[0.85rem] tracking-wide">Nama Tugas</th>
                          <th className="px-5 py-3.5 font-bold text-[0.85rem] tracking-wide">Divisi</th>
                          <th className="px-5 py-3.5 font-bold text-[0.85rem] tracking-wide">Ditugaskan Oleh</th>
                          <th className="px-5 py-3.5 font-bold text-[0.85rem] tracking-wide">Deadline</th>
                          <th className="px-5 py-3.5 font-bold text-[0.85rem] tracking-wide">Prioritas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                          <tr key={item} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                            <td className="px-5 py-4 font-semibold text-slate-800 text-[0.9rem] whitespace-nowrap">Lorem ipsum dolor sit amet</td>
                            <td className="px-5 py-4 font-semibold text-slate-800 text-[0.9rem] whitespace-nowrap">Nama Divisi</td>
                            <td className="px-5 py-4 font-semibold text-slate-800 text-[0.9rem] whitespace-nowrap">Nama Kadiv</td>
                            <td className="px-5 py-4 font-semibold text-slate-800 text-[0.9rem] whitespace-nowrap">13 Sep, 2026</td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="bg-slate-200 text-slate-600 px-3.5 py-1.5 rounded-full text-[0.75rem] font-bold">Urgent</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        );
      })}
    </div>
  );
}
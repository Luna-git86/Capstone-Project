import { useState } from 'react';

export default function SemuaTugas() {
  const [expandedSection, setExpandedSection] = useState<string | null>('belum');

  const sections = [
    { id: 'terlambat', label: 'Terlambat', bgClass: 'bg-red', textClass: 'text-white', thClass: 'th-red' },
    { id: 'belum', label: 'Belum Dikerjakan', bgClass: 'bg-gray', textClass: 'text-black', thClass: 'th-gray' },
    { id: 'proses', label: 'Dalam Proses', bgClass: 'bg-blue', textClass: 'text-white', thClass: 'th-blue' },
    { id: 'evaluasi', label: 'Menunggu Evaluasi', bgClass: 'bg-orange', textClass: 'text-white', thClass: 'th-orange' },
    { id: 'selesai', label: 'Selesai', bgClass: 'bg-green', textClass: 'text-white', thClass: 'th-green' }
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="task-list-area">
      {sections.map((section) => {
        const isOpen = expandedSection === section.id;
        
        return (
          <div key={section.id} className="accordion-item">
            
            {/* Accordion Header */}
            <div 
              className={`accordion-header ${section.bgClass} ${section.textClass}`}
              onClick={() => toggleSection(section.id)}
            >
              <span>{section.label}</span>
              <svg viewBox="0 0 24 24" className="accordion-icon">
                {isOpen ? (
                  <polyline points="18 15 12 9 6 15"></polyline>
                ) : (
                  <polyline points="6 9 12 15 18 9"></polyline>
                )}
              </svg>
            </div>

            {/* Accordion Body (Tabel) */}
            {isOpen && (
              <div className="accordion-body">
                <div className="table-wrapper">
                  <div className="table-responsive">
                    <table className="task-table">
                      <thead className={section.thClass}>
                        <tr>
                          <th>Nama Tugas</th>
                          <th>Divisi</th>
                          <th>Ditugaskan Oleh</th>
                          <th>Deadline</th>
                          <th>Prioritas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                          <tr key={item}>
                            <td>Lorem ipsum dolor sit amet</td>
                            <td>Nama Divisi</td>
                            <td>Nama Kadiv</td>
                            <td>13 Sep, 2026</td>
                            <td><span className="badge-urgent-grey">Urgent</span></td>
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
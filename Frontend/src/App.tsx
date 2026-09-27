import { useState, useEffect } from 'react';
import './App.css';

// 1. Definisikan Struktur Data Tiket (TypeScript Interface)
interface Ticket {
  id: string;
  title: string;
  reporter: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Under Evaluation' | 'Closed';
  deadline: string; // Format ISO Date
  isOverdue?: boolean; // Label SLA
}

function App() {
  // 2. React State untuk menyimpan data tiket (Pengganti DOM Manipulation manual)
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // 3. Logika Real-Time Fetch & SLA
  const fetchTickets = async () => {
    try {
      // CATATAN: Nanti fetch ke backend Express Anda (misal: fetch('http://localhost:3000/api/tickets'))
      // Sementara kita gunakan dummy data untuk merender UI
      const dummyData: Ticket[] = [
        {
          id: "TCK-001",
          title: "AC Ruang Operasi Bocor",
          reporter: "Koordinator UGD",
          urgency: "Urgent",
          status: "Open",
          deadline: "2026-09-25T10:00:00", // Coba ubah tanggal ini menjadi kemarin untuk melihat efek OVERDUE
        },
        {
          id: "TCK-002",
          title: "Komputer Pendaftaran Blank",
          reporter: "Staf Registrasi",
          urgency: "Medium",
          status: "In Progress",
          deadline: "2026-09-30T15:00:00",
        }
      ];

      // Kalkulasi SLA: Cek apakah waktu saat ini melebihi deadline
      const currentTime = new Date();
      const ticketsWithSLA = dummyData.map(ticket => {
        const deadlineDate = new Date(ticket.deadline);
        const isOverdue = ticket.status !== 'Closed' && currentTime > deadlineDate;
        
        return { ...ticket, isOverdue };
      });

      // Update state, React akan otomatis merender ulang UI (Real-time DOM Manipulation)
      setTickets(ticketsWithSLA);
    } catch (error) {
      console.error("Gagal mengambil data tiket", error);
    }
  };

  // 4. useEffect: Menjalankan Fetch pertama kali & interval (polling) tiap 5 detik
  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Dasbor Manajerial (E-Ticketing & SLA)</h1>
        <p>Memantau antrean tiket dan pelanggaran batas waktu</p>
      </header>

      <div className="ticket-list">
        {tickets.length === 0 ? <p>Membaca data dari server...</p> : null}
        
        {tickets.map((ticket) => (
          <div 
            key={ticket.id} 
            // Dinamis memberikan class 'overdue' jika pelanggaran SLA terjadi
            className={`ticket-card urgency-${ticket.urgency.toLowerCase()} ${ticket.isOverdue ? 'overdue-alert' : ''}`}
          >
            <div className="ticket-header">
              <h3>{ticket.title}</h3>
              {ticket.isOverdue && <span className="badge-overdue"> SLA OVERDUE</span>}
            </div>
            
            <div className="ticket-body">
              <p><strong>ID Tiket:</strong> {ticket.id}</p>
              <p><strong>Pelapor:</strong> {ticket.reporter}</p>
              <p><strong>Status:</strong> <span className={`status-${ticket.status.replace(/\s+/g, '-').toLowerCase()}`}>{ticket.status}</span></p>
              <p><strong>Batas Waktu:</strong> {new Date(ticket.deadline).toLocaleString('id-ID')}</p>
            </div>

            <div className="ticket-actions">
              <button className="btn-action">Evaluasi Tiket / Submit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import './App.css';

interface Ticket {
  id: string;
  title: string;
  reporter: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Under Evaluation' | 'Closed';
  deadline: string; 
  isOverdue?: boolean; 
}

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchTickets = async () => {
    try {
      const dummyData: Ticket[] = [
        {
          id: "TCK-001",
          title: "AC Ruang Operasi Bocor",
          reporter: "Koordinator UGD",
          urgency: "Urgent",
          status: "Open",
          deadline: "2026-09-25T10:00:00",
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

      const currentTime = new Date();
      const ticketsWithSLA = dummyData.map(ticket => {
        const deadlineDate = new Date(ticket.deadline);
        const isOverdue = ticket.status !== 'Closed' && currentTime > deadlineDate;
        return { ...ticket, isOverdue };
      });

      setTickets(ticketsWithSLA);
    } catch (error) {
      console.error("Gagal mengambil data tiket", error);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"></div>
          <h2>E-Ticketing</h2>
        </div>
        <nav className="menu">
          <p className="menu-label">Main Menu</p>
          <ul>
            <li className="active">Dashboard</li>
            <li>Antrean Tiket</li>
            <li>Dokumen SOP</li>
          </ul>
        </nav>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* TOP NAVBAR */}
        <header className="topbar">
          <div className="search-bar">
             Cari Tiket, Divisi...
          </div>
          <div className="user-profile">
            <div className="avatar"></div>
            <div className="user-info">
              <span className="user-name">Nama User</span>
              <span className="user-role">Kepala Divisi</span>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="main-content">
          <div className="content-header">
            <h1>Dasbor Manajerial (SLA Monitoring)</h1>
            <p>Memantau antrean tiket dan pelanggaran batas waktu operasional</p>
          </div>

          <div className="ticket-list">
            {tickets.length === 0 ? <p>Membaca data dari server...</p> : null}
            
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className={`ticket-card urgency-${ticket.urgency.toLowerCase()} ${ticket.isOverdue ? 'overdue-alert' : ''}`}
              >
                <div className="ticket-header">
                  <h3>{ticket.title}</h3>
                  {ticket.isOverdue && <span className="badge-overdue"> Terlambat </span>}
                </div>
                
                <div className="ticket-body">
                  <div className="ticket-info-grid">
                    <div><strong>ID Tiket:</strong> {ticket.id}</div>
                    <div><strong>Pelapor:</strong> {ticket.reporter}</div>
                    <div><strong>Status:</strong> <span className="status-badge">{ticket.status}</span></div>
                    <div><strong>Batas Waktu:</strong> {new Date(ticket.deadline).toLocaleString('id-ID')}</div>
                  </div>
                </div>

                <div className="ticket-actions">
                  <button className="btn-action">Evaluasi Tiket</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
export default function Dashboard() {
  return (
    <div className="dashboard-area">
      
      {/* 4 KARTU INFO */}
      <div className="info-cards-grid">
        <div className="info-card card-blue">
          <div className="card-header">
            <span>Total Tugas Aktif</span>
            <svg viewBox="0 0 24 24" className="card-icon-svg"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </div>
          <div className="card-value">56</div>
          <div className="card-progress">
            <div className="progress-text">+12 Minggu ini</div>
            <div className="progress-bar"><div className="progress-fill" style={{width: '70%'}}></div></div>
          </div>
        </div>

        <div className="info-card card-green">
          <div className="card-header">
            <span>Tugas Selesai</span>
            <svg viewBox="0 0 24 24" className="card-icon-svg"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="card-value">39</div>
          <div className="card-progress">
            <div className="progress-text">Tingkat penyelesaian 61%</div>
            <div className="progress-bar"><div className="progress-fill" style={{width: '61%'}}></div></div>
          </div>
        </div>

        <div className="info-card card-yellow">
          <div className="card-header">
            <span>Tugas Terlambat</span>
            <svg viewBox="0 0 24 24" className="card-icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div className="card-value">6</div>
          <div className="card-progress">
            <div className="progress-text">Butuh perhatian segera</div>
            <div className="progress-bar"><div className="progress-fill" style={{width: '100%'}}></div></div>
          </div>
        </div>

        <div className="info-card card-red">
          <div className="card-header">
            <span>Urgent</span>
            <svg viewBox="0 0 24 24" className="card-icon-svg"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div className="card-value">11</div>
          <div className="card-progress">
            <div className="progress-text">Harus Diselesaikan dalam 2 hari</div>
            <div className="progress-bar"><div className="progress-fill" style={{width: '80%'}}></div></div>
          </div>
        </div>
      </div>

      {/* PANEL BAWAH */}
      <div className="bottom-panels">
        
        {/* Panel Kiri: Capaian Terkini */}
        <div className="panel capai-terkini">
          <div className="panel-header">
            <h2 className="title-with-icon">
              <svg viewBox="0 0 24 24" className="icon-svg title-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Capaian Terkini
            </h2>
            <span className="panel-subtitle">5 Selesai</span>
          </div>
          <div className="list-container">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="list-item">
                <div className="list-icon">
                  <svg viewBox="0 0 24 24" className="icon-svg-small"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div className="list-text">
                  <h4>Lorem Ipsum dolor sit amet</h4>
                  <p>Nama Divisi - Tanggal selesai</p>
                </div>
                <span className="badge-urgent-grey">Urgent</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Kanan: Total Tugas Urgent */}
        <div className="panel tugas-urgent">
          <div className="panel-header column-header">
            <div>
              <h2>Total Tugas Urgent</h2>
              <p className="sub-heading">6 Menunggu Evaluasi</p>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="urgent-table">
              <thead>
                <tr>
                  <th>Nama Tugas</th>
                  <th>Ditugaskan Oleh</th>
                  <th>Deadline</th>
                  <th>Prioritas</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <tr key={item}>
                    <td>Lorem ipsum dolor sit amet</td>
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
    </div>
  );
}
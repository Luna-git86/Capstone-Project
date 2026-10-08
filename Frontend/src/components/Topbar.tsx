export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>Portal Manajerial</h1>
        <p>Minggu, 13 September, 2026</p>
      </div>
      <div className="topbar-right">
        <div className="filter-group">
          <span className="filter-label">Filter per divisi</span>
          <select className="filter-select">
            <option>Semua</option>
          </select>
        </div>
        <button className="btn-icon">
          <svg viewBox="0 0 24 24" className="icon-svg-top"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 01-3.46 0"></path></svg>
        </button>
        <div className="user-profile">
          <div className="user-avatar"></div>
          <div className="user-info">
            <span className="user-name">Nama user</span>
            <span className="user-role">
              Role/Divisi user 
              <svg viewBox="0 0 24 24" className="icon-svg-small inline-caret"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
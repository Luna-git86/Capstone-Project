import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="icon-main-logo">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M3 9h18M9 21V9"></path>
          </svg>
        </div>
        <div className="logo-text">
          <h2>Nama Program</h2>
          <p>Portal Direktur</p>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <p className="nav-title">Main Menu</p>
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" className="icon-svg"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Dashboard
            </NavLink>
          </li>
          
          <li>
            <NavLink to="/semua-tugas" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" className="icon-svg"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>
              Semua Tugas
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
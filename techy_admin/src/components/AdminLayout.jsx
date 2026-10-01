import { NavLink, useNavigate } from 'react-router-dom';
import { HiOutlineChartBar, HiOutlineCube, HiOutlineClipboardList, HiOutlineUsers, HiOutlineLogout, HiOutlineSun, HiOutlineMoon, HiOutlineMenu, HiOutlineUser } from 'react-icons/hi';
import useAuthStore from '../stores/authStore';
import useThemeStore from '../stores/themeStore';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: HiOutlineChartBar, label: 'Dashboard' },
  { to: '/products', icon: HiOutlineCube, label: 'Products' },
  { to: '/orders', icon: HiOutlineClipboardList, label: 'Orders' },
  { to: '/users', icon: HiOutlineUsers, label: 'Users' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <span className="sidebar-logo">TechVault Admin</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <HiOutlineUser size={18} /> <span>My Profile</span>
          </NavLink>
          <button className="sidebar-item" onClick={handleLogout} style={{ width: '100%' }}>
            <HiOutlineLogout size={18} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="main-header">
          <div className="main-header-left">
            <button className="header-icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }} id="menu-toggle">
              <HiOutlineMenu size={18} />
            </button>
          </div>
          <div className="main-header-right">
            <button className="header-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
            </button>
            <div
              onClick={() => navigate('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', cursor: 'pointer', transition: 'opacity 150ms' }}
              title="My Profile"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary-glow)' }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{user?.name || 'Admin'}</span>
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/',         label: '📊 לוח בקרה',  exact: true },
  { to: '/receipts', label: '🧾 קבלות'              },
  { to: '/products', label: '🛒 מוצרים'             },
  { to: '/compare',  label: '⚖️ השוואה'             },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo">🛒 SmartCart</span>
          <button className="close-btn" onClick={() => setMobileOpen(false)}>✕</button>
        </div>
        <nav>
          {NAV_ITEMS.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>ניהול קניות חכם</p>
          <p>למשפחה שלך</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileOpen(true)}>☰</button>
          <h1 className="page-title">SmartCart</h1>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && <div className="overlay" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}

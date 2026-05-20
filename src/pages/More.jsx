import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const MENU_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { label: 'Expenses',     sub: 'Log & track',     color: '#f59e0b', path: '/more/expenses',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
      { label: 'Diesel & Toll', sub: 'Fuel & roads',   color: '#10b981', path: '/more/diesel-toll',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 22V6a2 2 0 012-2h9a2 2 0 012 2v12M3 22h14M14 11h4l1.5 1.5V22H14V11z"/></svg> },
      { label: 'Vendors',      sub: 'Supplier list',   color: '#8b5cf6', path: '/more/vendors',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
      { label: 'Inventory',    sub: 'Parts & spares',  color: '#06b6d4', path: '/more/inventory',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
    ]
  },
  {
    title: 'Finance',
    items: [
      { label: 'Loans',       sub: 'EMI tracker',    color: '#ef4444', path: '/more/loans',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
      { label: 'Accounting',  sub: 'Ledger & books', color: '#3b82f6', path: '/more/accounting',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
      { label: 'Reports',     sub: 'P&L & analytics',color: '#10b981', path: '/more/reports',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    ]
  },
  {
    title: 'Management',
    items: [
      { label: 'Staff',    sub: 'App users',       color: '#ec4899', path: '/more/staff',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
      { label: 'Settings', sub: 'Company info',    color: '#94a3b8', path: '/more/settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
      { label: 'Backup',   sub: 'Export & restore', color: '#f97316', path: '/more/backup',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
    ]
  }
]

const ROLE_COLORS = {
  OWNER:   { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  color: '#3b82f6' },
  MANAGER: { bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.35)',  color: '#8b5cf6' },
  STAFF:   { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)',   color: '#06b6d4' },
}

export default function More() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const roleCfg = ROLE_COLORS[user?.role] || ROLE_COLORS.STAFF
  const initial = (user?.name || 'U')[0].toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 58 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="2" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.2 }}>More</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>Tools &amp; settings</div>
        </div>
      </div>

      <div className="page" style={{ paddingBottom: 'calc(var(--nav-h) + 24px)' }}>
        {/* Profile Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: roleCfg.bg, border: `2px solid ${roleCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: roleCfg.color, flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{user?.mobile || ''}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: roleCfg.bg, border: `1px solid ${roleCfg.border}`, color: roleCfg.color }}>
                {user?.role || 'STAFF'}
              </span>
            </div>
          </div>
        </div>

        {MENU_SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>{section.title}</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {section.items.map((item, idx) => (
                <button key={item.path} onClick={() => navigate(item.path)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: idx < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'transparent',
                  cursor: 'pointer', textAlign: 'left'
                }}
                  onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={handleLogout} style={{ width: '100%', padding: 14, borderRadius: 14, border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </>
  )
}

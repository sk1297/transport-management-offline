import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useT } from '../i18n/index.js'

const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    path: '/vehicles',
    label: 'Vehicles',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1}/>
        <path d="M16 8h4l3 3v3h-7V8z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1}/>
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    )
  },
  {
    path: '/trips',
    label: 'Trips',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
        {active && <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />}
      </svg>
    )
  },
  {
    path: '/drivers',
    label: 'Drivers',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    path: '/more',
    label: 'More',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5"  r={active ? "2" : "1.5"} fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r={active ? "2" : "1.5"} fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r={active ? "2" : "1.5"} fill="currentColor" stroke="none" />
      </svg>
    )
  }
]

export default function BottomNav() {
  const { t } = useT()
  const navigate  = useNavigate()
  const location  = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.path)
        return (
          <button
            key={item.path}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon(active)}
            <span>{t(item.label)}</span>
          </button>
        )
      })}
    </nav>
  )
}

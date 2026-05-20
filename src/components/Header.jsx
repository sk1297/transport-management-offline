import React from 'react'

export default function Header({ title, rightAction, leftAction, onBack }) {
  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button className="btn-icon" style={{ width: 34, height: 34 }} onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        {leftAction && !onBack && leftAction}
        <h1 className="header-title">{title}</h1>
      </div>
      {rightAction && <div className="header-right">{rightAction}</div>}
    </div>
  )
}

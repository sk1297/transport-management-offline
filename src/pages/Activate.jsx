import React, { useState } from 'react'
import { useLicense } from '../context/LicenseContext.jsx'

export default function Activate() {
  const { activate, expired, expiry } = useLicense()
  const [key,    setKey] = useState('')
  const [show,   setShow]= useState(false)
  const [loading,setLoad]= useState(false)
  const [error,  setErr] = useState('')
  const [shake,  setShk] = useState(false)
  const [success,setSucc]= useState(null)   // { expiry, daysLeft }

  const triggerShake = () => { setShk(true); setTimeout(() => setShk(false), 600) }

  const handleActivate = async () => {
    if (!key.trim()) { setErr('Please enter your license key'); triggerShake(); return }
    setLoad(true); setErr('')
    const result = await activate(key)
    setLoad(false)
    if (!result.ok) { setErr(result.msg); triggerShake(); return }
    // Show success briefly — LicenseGate will unmount this anyway
    const d = new Date(result.expiry).getTime() - new Date().setHours(0,0,0,0)
    setSucc({ expiry: result.expiry, daysLeft: Math.round(d / 86400000) })
  }

  const isExpiredState = expired && expiry

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px'
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22, margin: '0 auto 18px',
          background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.7" strokeLinecap="round">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: -0.6 }}>
          Transport Manager
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 22, padding: 28
      }}>

        {/* Status header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: '0 auto',
            background: isExpiredState ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${isExpiredState ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {isExpiredState
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            }
          </div>

          {isExpiredState ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', marginTop: 12 }}>License Expired</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.6 }}>
                Your key expired on <strong>{expiry}</strong>.<br/>
                Contact your provider to get a new key.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>License Required</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
                This app requires an activation key.<br/>Contact your provider to get one.
              </div>
            </>
          )}
        </div>

        {/* Success state */}
        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981', marginTop: 8 }}>Activated!</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Valid until <strong>{success.expiry}</strong> ({success.daysLeft} day{success.daysLeft !== 1 ? 's' : ''})
            </div>
          </div>
        ) : (
          <>
            {/* Key input */}
            <div style={{ position: 'relative', animation: shake ? 'shake 0.5s ease' : 'none' }}>
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => { setKey(e.target.value); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                placeholder="Paste your license key…"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface2)',
                  border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
                  borderRadius: 12, padding: '13px 44px 13px 14px',
                  color: 'var(--text)', fontSize: 14,
                  fontFamily: show ? 'monospace' : 'inherit',
                  letterSpacing: show ? '0.3px' : 'normal',
                  outline: 'none', transition: 'border-color 0.2s'
                }}
              />
              <button onClick={() => setShow(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex'
              }}>
                {show
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>

            {error && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button
              onClick={handleActivate}
              disabled={loading}
              style={{
                marginTop: 18, width: '100%', padding: 15, borderRadius: 12,
                background: loading ? 'rgba(59,130,246,0.5)' : '#3b82f6',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s'
              }}
            >
              {loading
                ? <><span className="spinner spinner-sm" /> Verifying…</>
                : <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Activate App
                  </>
              }
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.7 }}>
        🔒 Verified offline — no internet required.<br/>
        Keys are time-limited and unique.
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
      `}</style>
    </div>
  )
}

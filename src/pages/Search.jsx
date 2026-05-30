import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate } from '../utils.js'
import db from '../db/database.js'

const RESULT_TYPES = {
  lr:       { label: 'LR / Bilty',  color: '#10b981', path: '/trips' },
  trip:     { label: 'Trip',        color: '#3b82f6', path: '/trips' },
  vehicle:  { label: 'Vehicle',     color: '#8b5cf6', path: '/vehicles' },
  driver:   { label: 'Driver',      color: '#06b6d4', path: '/drivers' },
  customer: { label: 'Customer',    color: '#f59e0b', path: '/more/customers' },
  vendor:   { label: 'Vendor',      color: '#ec4899', path: '/more/vendors' },
  expense:  { label: 'Expense',     color: '#ef4444', path: '/more/expenses' },
}

async function globalSearch(q) {
  if (!q || q.length < 2) return []
  const lq = q.toLowerCase()
  const results = []

  const [lrs, trips, vehicles, drivers, vendors, expenses] = await Promise.all([
    db.lr_bilty.toArray(),
    db.trips.toArray(),
    db.vehicles.toArray(),
    db.drivers.toArray(),
    db.vendors.toArray(),
    db.expenses.toArray(),
  ])

  // Also try customers if table exists
  let customers = []
  try { customers = await db.customers.toArray() } catch {}

  for (const lr of lrs) {
    if (`${lr.lr_no} ${lr.consignor} ${lr.consignee} ${lr.goods_desc}`.toLowerCase().includes(lq)) {
      results.push({ type: 'lr', id: lr.id, title: lr.lr_no, sub: `${lr.consignor} → ${lr.consignee}`, meta: formatCurrency(lr.freight), date: lr.date })
    }
  }
  for (const t of trips) {
    if (`${t.from_loc} ${t.to_loc} ${t.notes||''}`.toLowerCase().includes(lq)) {
      results.push({ type: 'trip', id: t.id, title: `${t.from_loc} → ${t.to_loc}`, sub: t.status, meta: t.start_date, date: t.start_date })
    }
  }
  for (const v of vehicles) {
    if (`${v.name} ${v.reg_no} ${v.type}`.toLowerCase().includes(lq)) {
      results.push({ type: 'vehicle', id: v.id, title: v.name, sub: v.reg_no, meta: v.type, date: null })
    }
  }
  for (const d of drivers) {
    if (`${d.name} ${d.phone} ${d.license_no}`.toLowerCase().includes(lq)) {
      results.push({ type: 'driver', id: d.id, title: d.name, sub: d.phone, meta: d.status, date: null })
    }
  }
  for (const c of customers) {
    if (`${c.name} ${c.phone} ${c.city} ${c.gstin}`.toLowerCase().includes(lq)) {
      results.push({ type: 'customer', id: c.id, title: c.name, sub: c.city || c.phone, meta: c.type, date: null })
    }
  }
  for (const v of vendors) {
    if (`${v.name} ${v.phone} ${v.type}`.toLowerCase().includes(lq)) {
      results.push({ type: 'vendor', id: v.id, title: v.name, sub: v.type, meta: v.phone, date: null })
    }
  }
  for (const e of expenses) {
    if (`${e.category} ${e.notes||''}`.toLowerCase().includes(lq)) {
      results.push({ type: 'expense', id: e.id, title: e.category, sub: e.notes || '', meta: formatCurrency(e.amount), date: e.date })
    }
  }

  return results.slice(0, 40)
}

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleChange = (val) => {
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val || val.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const res = await globalSearch(val)
      setResults(res)
      setSearching(false)
    }, 300)
  }

  // Group results by type
  const grouped = {}
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = []
    grouped[r.type].push(r)
  }

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 58 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            autoFocus
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search LRs, trips, vehicles, customers..."
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          {query && <button onClick={() => handleChange('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>}
        </div>
      </div>

      <div className="page">
        {!query && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Search Everything</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              Search across LR numbers, consignee names,<br/>vehicles, drivers, customers, vendors...
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 20 }}>
              {['LR-2026', 'Pune', 'Mumbai', 'Tata 407'].map(hint => (
                <button key={hint} onClick={() => handleChange(hint)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>{hint}</button>
              ))}
            </div>
          </div>
        )}

        {searching && <div className="loading"><span className="spinner" />Searching…</div>}

        {!searching && query.length >= 2 && results.length === 0 && (
          <div className="empty">
            <div className="empty-icon">😶</div>
            <div className="empty-title">No results for "{query}"</div>
            <div className="empty-desc">Try a different keyword</div>
          </div>
        )}

        {!searching && Object.entries(grouped).map(([type, items]) => {
          const cfg = RESULT_TYPES[type] || { label: type, color: '#94a3b8', path: '/' }
          return (
            <div key={type} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                {cfg.label} ({items.length})
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                {items.map((r, i) => (
                  <div key={`${r.type}-${r.id}`}
                    onClick={() => navigate(cfg.path)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                    onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      {r.type.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 1 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{r.meta}</div>
                      {r.date && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{formatDate(r.date)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTripPL, getVehicleExpenses, getMonthlyPL, getOutstandingReceivables } from '../services/reportService.js'
import { getAll as getTrips } from '../services/tripService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, formatDate, getErrorMsg } from '../utils.js'
import Header from '../components/Header.jsx'

export default function Reports() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [tab, setTab]             = useState('monthly')
  const [trips, setTrips]         = useState([])
  const [vehicles, setVehicles]   = useState([])
  const [tripPLs, setTripPLs]     = useState([])
  const [vehicleExp, setVehicleExp] = useState([])
  const [outstanding, setOutstanding] = useState([])
  const [loading, setLoading]     = useState(true)
  const [monthlyPL, setMonthlyPL] = useState({ revenue: 0, expenses: 0, profit: 0 })
  const [month, setMonth]         = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, v, out] = await Promise.all([getTrips(), getVehicles(), getOutstandingReceivables()])
      setTrips(t); setVehicles(v); setOutstanding(out)

      // Trip P&Ls
      const pls = await Promise.all(t.slice(0, 10).map(async trip => ({ trip, pl: await getTripPL(trip.id) })))
      setTripPLs(pls)

      // Vehicle expenses
      const vExps = await Promise.all(v.map(async veh => ({ veh, byCategory: await getVehicleExpenses(veh.id) })))
      setVehicleExp(vExps)

      // Monthly P&L
      const [y, m] = month.split('-').map(Number)
      setMonthlyPL(await getMonthlyPL(y, m))
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])

  const svgBars = (data, maxVal) => {
    const W = 280, H = 80
    return data.map((v, i) => {
      const barH = maxVal > 0 ? (v.val / maxVal) * (H - 16) : 4
      const x    = (i / data.length) * W + 10
      const barW = (W / data.length) - 8
      return (
        <g key={i}>
          <rect x={x} y={H - barH - 4} width={barW} height={barH} rx={3} fill={v.color} opacity={0.85} />
          <text x={x + barW/2} y={H + 2} textAnchor="middle" fontSize="7" fill="#94a3b8">{v.label}</text>
        </g>
      )
    })
  }

  return (
    <>
      <Header title="Reports" onBack={() => navigate('/more')} />
      <div className="page">
        <div className="tabs">
          {[{ id: 'monthly', label: 'Monthly P&L' }, { id: 'trips', label: 'Trip P&L' }, { id: 'vehicles', label: 'Vehicle Exp.' }, { id: 'outstanding', label: 'Receivables' }].map(t => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {/* Monthly P&L */}
        {!loading && tab === 'monthly' && (
          <>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <input className="form-input" type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Revenue', value: formatCurrency(monthlyPL.revenue), color: '#10b981' },
                { label: 'Expenses', value: formatCurrency(monthlyPL.expenses), color: '#ef4444' },
                { label: 'Profit', value: formatCurrency(monthlyPL.profit), color: monthlyPL.profit >= 0 ? '#10b981' : '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* SVG bar chart */}
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Revenue vs Expenses</div>
              <svg width="100%" viewBox={`0 0 300 90`} style={{ display: 'block' }}>
                {svgBars([
                  { val: monthlyPL.revenue, color: '#10b981', label: 'Rev' },
                  { val: monthlyPL.expenses, color: '#ef4444', label: 'Exp' },
                  { val: Math.max(0, monthlyPL.profit), color: '#3b82f6', label: 'Prof' },
                ], Math.max(monthlyPL.revenue, monthlyPL.expenses, 1))}
              </svg>
            </div>
          </>
        )}

        {/* Trip P&L */}
        {!loading && tab === 'trips' && (
          tripPLs.length === 0
            ? <div className="empty"><div className="empty-icon">🚚</div><div className="empty-title">No trips</div></div>
            : tripPLs.map(({ trip, pl }) => (
              <div key={trip.id} className="card" style={{ borderLeft: `3px solid ${pl.profit >= 0 ? '#10b981' : '#ef4444'}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{trip.from_loc} → {trip.to_loc}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{formatDate(trip.start_date)} · {trip.status}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Revenue', value: formatCurrency(pl.revenue), color: '#10b981' },
                    { label: 'Expenses', value: formatCurrency(pl.expenses), color: '#ef4444' },
                    { label: 'Profit', value: formatCurrency(pl.profit), color: pl.profit >= 0 ? '#10b981' : '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}

        {/* Vehicle Expenses */}
        {!loading && tab === 'vehicles' && (
          vehicleExp.length === 0
            ? <div className="empty"><div className="empty-icon">🚛</div><div className="empty-title">No data</div></div>
            : vehicleExp.filter(({ byCategory }) => Object.keys(byCategory).length > 0).map(({ veh, byCategory }) => (
              <div key={veh.id} className="card">
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>{veh.name} ({veh.reg_no})</div>
                {Object.entries(byCategory).map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>{cat}</span>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(amt)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontWeight: 800, fontSize: 14 }}>
                  <span style={{ color: 'var(--text)' }}>Total</span>
                  <span style={{ color: 'var(--red)' }}>{formatCurrency(Object.values(byCategory).reduce((s,v) => s+v,0))}</span>
                </div>
              </div>
            ))
        )}

        {/* Outstanding Receivables */}
        {!loading && tab === 'outstanding' && (
          outstanding.length === 0
            ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-title">No outstanding receivables</div></div>
            : <>
              <div className="card" style={{ marginBottom: 14, textAlign: 'center', borderTop: '2px solid #f59e0b' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Total Outstanding</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(outstanding.reduce((s,l) => s+(l.freight||0),0))}</div>
              </div>
              {outstanding.map(lr => (
                <div key={lr.id} className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{lr.lr_no}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{lr.consignor} → {lr.consignee}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{formatDate(lr.date)} · {lr.status}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#f59e0b' }}>{formatCurrency(lr.freight)}</div>
                  </div>
                </div>
              ))}
            </>
        )}
      </div>
    </>
  )
}

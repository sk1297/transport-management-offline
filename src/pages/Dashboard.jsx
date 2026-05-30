import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share } from '@capacitor/share'
import { useAuth } from '../context/AuthContext.jsx'
import { formatCurrency, formatDate, todayStr, daysUntil } from '../utils.js'
import db from '../db/database.js'
import { useT } from '../i18n/index.js'

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (!target) { setVal(0); return }
    let start = null
    const animate = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(eased * target))
      if (p < 1) raf.current = requestAnimationFrame(animate)
      else setVal(target)
    }
    raf.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return val
}

function Fade({ children, delay = 0 }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(14px)', transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useT()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData]           = useState(null)
  const [alerts, setAlerts]       = useState([])
  const [recentLRs, setRecentLRs] = useState([])
  const [loading, setLoading]     = useState(true)
  const [mounted, setMounted]     = useState(false)
  const [now, setNow]             = useState(new Date())
  const [companyName, setCompanyName] = useState('Transport Manager')
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [revenueTarget, setRevenueTarget] = useState(0)
  const [targetEdit, setTargetEdit] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [followUpsDue, setFollowUpsDue] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // Read company name from Dexie settings, fallback to localStorage
    db.settings.where('key').equals('company_name').first().then(row => {
      if (row?.value) setCompanyName(row.value)
      else {
        try {
          const s = JSON.parse(localStorage.getItem('transportSettings') || '{}')
          if (s.companyName) setCompanyName(s.companyName)
        } catch {}
      }
    }).catch(() => {
      try {
        const s = JSON.parse(localStorage.getItem('transportSettings') || '{}')
        if (s.companyName) setCompanyName(s.companyName)
      } catch {}
    })
  }, [])

  useEffect(() => {
    db.settings.where('key').equals('revenue_target').first().then(r => {
      if (r?.value) { setRevenueTarget(Number(r.value)); setTargetInput(r.value) }
    }).catch(() => {})
  }, [])

  const saveTarget = async () => {
    const val = Number(targetInput) || 0
    setRevenueTarget(val)
    setTargetEdit(false)
    try {
      const existing = await db.settings.where('key').equals('revenue_target').first()
      if (existing) await db.settings.update(existing.id, { value: String(val) })
      else await db.settings.add({ key: 'revenue_target', value: String(val) })
    } catch {}
  }

  const load = useCallback(async () => {
    setLoading(true); setMounted(false)
    try {
      const [vehicles, trips, lrs, expenses, loans, inventory, invoices, drivers] = await Promise.all([
        db.vehicles.toArray(),
        db.trips.toArray(),
        db.lr_bilty.toArray(),
        db.expenses.toArray(),
        db.loans.toArray(),
        db.inventory.toArray(),
        db.invoices ? db.invoices.toArray() : Promise.resolve([]),
        db.drivers.toArray(),
      ])

      const activeVehicles = vehicles.filter(v => v.status === 'Active').length
      const activeTrips    = trips.filter(t => t.status === 'Active').length
      const pendingLRs     = lrs.filter(l => l.pay_type !== 'Paid' && l.status !== 'Delivered').length
      const outstandingAmt = lrs.filter(l => l.pay_type === 'To-Pay' && l.status !== 'Delivered').reduce((s,l) => s + (l.freight||0), 0)

      const today = todayStr()
      const todayExpenses = expenses.filter(e => e.date === today).reduce((s,e) => s + (e.amount||0), 0)

      // Overdue invoices
      const overdueInvoices = invoices.filter(inv => {
        if (inv.status === 'Paid') return false
        if (!inv.due_date) return false
        return inv.due_date < today
      })

      // Low stock items
      const lowStockItems = inventory.filter(item => (item.qty||0) <= (item.reorder_level||0) && (item.reorder_level||0) > 0)

      // Alerts
      const newAlerts = []
      for (const v of vehicles) {
        const insDays = daysUntil(v.insurance_expiry)
        if (insDays != null && insDays <= 30 && insDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${v.name} (${v.reg_no}) insurance expires in ${insDays} day(s)` })
        const pucDays = daysUntil(v.puc_expiry)
        if (pucDays != null && pucDays <= 30 && pucDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${v.name} (${v.reg_no}) PUC expires in ${pucDays} day(s)` })
        const fitDays = daysUntil(v.fitness_expiry)
        if (fitDays != null && fitDays <= 30 && fitDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${v.name} fitness certificate expires in ${fitDays} day(s)` })
        const natDays = daysUntil(v.national_permit_expiry)
        if (natDays != null && natDays <= 30 && natDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${v.name} national permit expires in ${natDays} day(s)` })
        const stDays = daysUntil(v.state_permit_expiry)
        if (stDays != null && stDays <= 30 && stDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${v.name} state permit expires in ${stDays} day(s)` })
      }
      for (const loan of loans) {
        if (loan.status === 'Active') {
          const start = new Date(loan.start_date)
          start.setMonth(start.getMonth() + (loan.paid_emis || 0))
          const daysToEMI = daysUntil(start.toISOString().split('T')[0])
          if (daysToEMI != null && daysToEMI <= 3 && daysToEMI >= 0)
            newAlerts.push({ type: 'info', msg: `EMI due in ${daysToEMI} day(s) — ${loan.bank_name} (${formatCurrency(loan.emi_amount)})` })
        }
      }
      // Driver document expiry alerts
      for (const d of drivers) {
        const medDays = daysUntil(d.medical_expiry)
        if (medDays != null && medDays <= 30 && medDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${d.name} medical fitness expires in ${medDays} day(s)` })
        const badgeDays = daysUntil(d.badge_expiry)
        if (badgeDays != null && badgeDays <= 30 && badgeDays >= 0)
          newAlerts.push({ type: 'warning', msg: `${d.name} badge expires in ${badgeDays} day(s)` })
      }

      if (overdueInvoices.length > 0)
        newAlerts.push({ type: 'warning', msg: `${overdueInvoices.length} invoice(s) overdue — ₹${overdueInvoices.reduce((s,i) => s + ((i.total_amount||0) - (i.paid_amount||0)), 0).toLocaleString('en-IN')} pending` })
      if (lowStockItems.length > 0)
        newAlerts.push({ type: 'warning', msg: `${lowStockItems.length} inventory item(s) below minimum stock` })

      // Follow-ups due today
      try {
        const allFU = await db.follow_ups.toArray()
        const dueFU = allFU.filter(f => f.next_date && f.next_date <= today && f.status !== 'Resolved').length
        setFollowUpsDue(dueFU)
        if (dueFU > 0) newAlerts.push({ type: 'info', msg: `${dueFU} customer follow-up(s) due today` })
      } catch {}

      // This month revenue
      const monthPrefix = today.substring(0, 7)
      const thisMonthRevenue = lrs.filter(l => l.date?.startsWith(monthPrefix)).reduce((s,l) => s+(l.freight||0), 0)
      setMonthRevenue(thisMonthRevenue)

      setData({ activeVehicles, activeTrips, pendingLRs, outstandingAmt, todayExpenses })
      setAlerts(newAlerts)
      setRecentLRs(lrs.slice(-5).reverse())
    } finally {
      setLoading(false)
      setTimeout(() => setMounted(true), 80)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDailySummary = async () => {
    const today = todayStr()
    const [allTrips, allLRs, allExp, allDiesel] = await Promise.all([
      db.trips.toArray(), db.lr_bilty.toArray(), db.expenses.toArray(), db.diesel_logs.toArray()
    ])
    const activeTrips = allTrips.filter(t => t.status === 'Active').length
    const todayLRs = allLRs.filter(l => l.date === today)
    const todayFreight = todayLRs.reduce((s,l) => s+(l.freight||0), 0)
    const todayExp = allExp.filter(e => e.date === today).reduce((s,e) => s+(e.amount||0), 0)
    const todayDiesel = allDiesel.filter(d => d.date === today).reduce((s,d) => s+(d.amount||0), 0)
    const text = `*Daily Operations Summary — ${today}*\n\nActive Trips: ${activeTrips}\nNew LRs Today: ${todayLRs.length}\nFreight Today: ₹${todayFreight.toLocaleString('en-IN')}\nExpenses Today: ₹${todayExp.toLocaleString('en-IN')}\nDiesel Today: ₹${todayDiesel.toLocaleString('en-IN')}\n\n_Sent from Transport Manager_`
    try { await Share.share({ text, dialogTitle: 'Daily Summary' }) } catch {}
  }

  const vCount = useCountUp(mounted ? (data?.activeVehicles || 0) : 0, 900)
  const tCount = useCountUp(mounted ? (data?.activeTrips || 0) : 0, 900)
  const lCount = useCountUp(mounted ? (data?.pendingLRs || 0) : 0, 900)

  const hour  = now.getHours()
  const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg)' }}>
      <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[180, 100, 120, 100].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 18, background: 'var(--surface2)', animation: `skel 1.6s ease-in-out ${i*0.1}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes skel{0%,100%{opacity:.9}50%{opacity:.4}}`}</style>
    </div>
  )

  const quickActions = [
    { label: 'New Trip',      sub: 'Start journey', color: '#3b82f6', tint: 'rgba(59,130,246,0.12)', path: '/trips', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
    )},
    { label: 'Create LR',     sub: 'New bilty',     color: '#10b981', tint: 'rgba(16,185,129,0.12)', path: '/trips', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg>
    )},
    { label: 'Add Expense',   sub: 'Log cost',      color: '#f59e0b', tint: 'rgba(245,158,11,0.12)', path: '/more/expenses', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
    )},
    { label: 'Log Diesel',    sub: 'Fuel entry',    color: '#8b5cf6', tint: 'rgba(139,92,246,0.12)', path: '/more/diesel-toll', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 22V6a2 2 0 012-2h9a2 2 0 012 2v12M3 22h14M14 11h4l1.5 1.5V22H14V11z"/></svg>
    )},
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v3h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{companyName}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>Fleet & Logistics</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>{timeStr}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)' }}>{dateStr}</div>
          </div>
          <button onClick={handleDailySummary} title="Share daily summary" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          <button onClick={() => navigate('/search')} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button onClick={load} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 'calc(var(--nav-h) + 20px)' }}>

        {/* Hero card */}
        <Fade delay={0}>
          <div style={{ background: 'linear-gradient(145deg, #0c1a35 0%, #1a2d4a 50%, #1e3a5f 100%)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 24, padding: '20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2 }}>{greet}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 3 }}>{user?.name?.split(' ')[0] || 'Owner'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'livePulse 2s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8 }}>LIVE</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Outstanding Receivables</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1.5, background: 'linear-gradient(135deg, #fff 60%, #93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {formatCurrency(data?.outstandingAmt || 0)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Today's Expenses: {formatCurrency(data?.todayExpenses || 0)}</div>
          </div>
        </Fade>

        {/* KPI pills */}
        <Fade delay={80}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: t('Vehicles'), value: vCount, color: '#3b82f6', onClick: () => navigate('/vehicles') },
              { label: t('Active Trips'), value: tCount, color: '#10b981', onClick: () => navigate('/trips') },
              { label: t('Pending LRs'), value: lCount, color: '#f59e0b', onClick: () => navigate('/trips') },
            ].map(pill => (
              <div key={pill.label} onClick={pill.onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${pill.color}`, borderRadius: 12, padding: '10px 6px', textAlign: 'center', cursor: 'pointer' }}
                onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: 3 }}>{pill.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{pill.label}</div>
              </div>
            ))}
          </div>
        </Fade>

        {/* Revenue Target Tracker */}
        <Fade delay={120}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Monthly Revenue Target')}</div>
              <button onClick={() => { setTargetEdit(te => !te); setTargetInput(String(revenueTarget || '')) }}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {targetEdit ? t('Cancel') : t('Set Target')}
              </button>
            </div>
            {targetEdit ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="Enter monthly target ₹" style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={saveTarget}>{t('Save')}</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{formatCurrency(monthRevenue)}</span>
                  {revenueTarget > 0 && <span style={{ fontSize: 12, color: 'var(--text2)' }}>of {formatCurrency(revenueTarget)}</span>}
                </div>
                {revenueTarget > 0 ? (
                  <>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: monthRevenue >= revenueTarget ? '#10b981' : '#3b82f6', width: `${Math.min(100, Math.round((monthRevenue/revenueTarget)*100))}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 5 }}>
                      {monthRevenue >= revenueTarget
                        ? <span style={{ color: '#10b981', fontWeight: 700 }}>Target achieved!</span>
                        : `${Math.round((monthRevenue/revenueTarget)*100)}% — ${formatCurrency(revenueTarget - monthRevenue)} to go`}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Tap "Set Target" to track monthly revenue goal</div>
                )}
              </>
            )}
          </div>
        </Fade>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Fade delay={140}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t('Alerts')}</div>
              {alerts.map((a, i) => (
                <div key={i} style={{ background: a.type === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${a.type === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: a.type === 'warning' ? 'var(--yellow)' : 'var(--accent)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {a.msg}
                </div>
              ))}
            </div>
          </Fade>
        )}

        {/* Quick Actions */}
        <Fade delay={200}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{t('Quick Actions')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => navigate(a.path)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: a.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </Fade>

        {/* Recent LRs */}
        <Fade delay={280}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Recent LRs')}</div>
            <button onClick={() => navigate('/trips')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>{t('View All')}</button>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
            {recentLRs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text2)', fontSize: 13 }}>{t('No trips yet')}</div>
            ) : recentLRs.map((lr, i) => {
              const payColor = lr.pay_type === 'Paid' ? '#10b981' : lr.pay_type === 'To-Pay' ? '#f59e0b' : '#3b82f6'
              return (
                <div key={lr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < recentLRs.length - 1 ? '1px solid var(--border)' : 'none', borderLeft: `3px solid ${payColor}`, cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => navigate('/trips')}
                  onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{lr.lr_no}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lr.consignor} → {lr.consignee}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${payColor}18`, color: payColor, textTransform: 'uppercase' }}>{lr.pay_type}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(100,116,139,0.15)', color: 'var(--text2)', textTransform: 'uppercase' }}>{lr.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>{formatCurrency(lr.freight)}</div>
                </div>
              )
            })}
          </div>
        </Fade>
      </div>

      <style>{`
        @keyframes livePulse{0%,100%{box-shadow:0 0 0 2px rgba(74,222,128,0.35)}50%{box-shadow:0 0 0 6px rgba(74,222,128,0.08)}}
        @keyframes skel{0%,100%{opacity:.9}50%{opacity:.4}}
      `}</style>
    </div>
  )
}

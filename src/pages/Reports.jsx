import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getTripPL, getVehicleExpenses, getMonthlyPL, getOutstandingReceivables } from '../services/reportService.js'
import { getAll as getTrips } from '../services/tripService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, formatDate, getErrorMsg } from '../utils.js'
import Header from '../components/Header.jsx'
import db from '../db/database.js'

async function getBalanceSheet() {
  const [lrs, expenses, diesel, tolls, loans, inventory, accounts] = await Promise.all([
    db.lr_bilty.toArray(),
    db.expenses.toArray(),
    db.diesel_logs.toArray(),
    db.toll_logs.toArray(),
    db.loans.toArray(),
    db.inventory.toArray(),
    db.accounts.toArray(),
  ])

  // Assets
  const receivables    = lrs.filter(l => l.pay_type === 'To-Pay' && l.status !== 'Delivered').reduce((s,l) => s+(l.freight||0), 0)
  const inventoryValue = inventory.reduce((s,i) => s+(i.qty||0)*(i.rate||0), 0)
  const cashIncome     = accounts.filter(a => a.type === 'credit').reduce((s,a) => s+(a.credit||0), 0)
  const cashExpense    = accounts.filter(a => a.type === 'debit').reduce((s,a) => s+(a.debit||0), 0)
  const cashBalance    = cashIncome - cashExpense

  // Liabilities
  const loanOutstanding = loans.filter(l => l.status === 'Active').reduce((s,l) => s+(l.emi_amount||0)*((l.tenure_months||0)-(l.paid_emis||0)), 0)
  // Vendor payables — amounts owed to vendors (debit entries without matching credit)
  const vendorLedger = await db.vendor_ledger.toArray()
  const vendorPayables = Math.max(0, vendorLedger.filter(v => v.type === 'debit').reduce((s,v) => s+(v.amount||0), 0)
    - vendorLedger.filter(v => v.type === 'credit').reduce((s,v) => s+(v.amount||0), 0))

  // Revenue (total freight billed)
  const totalRevenue = lrs.reduce((s,l) => s+(l.freight||0), 0)
  // Total Expenses
  const totalExp = [...expenses, ...diesel, ...tolls].reduce((s,e) => s+(e.amount||0), 0)

  return {
    assets: {
      cashBalance: Math.max(0, cashBalance),
      receivables,
      inventoryValue,
      total: Math.max(0, cashBalance) + receivables + inventoryValue,
    },
    liabilities: {
      loanOutstanding,
      payables: vendorPayables,
      total: loanOutstanding + vendorPayables,
    },
    summary: { totalRevenue, totalExpenses: totalExp, netProfit: totalRevenue - totalExp },
  }
}

async function getCashFlow(year) {
  const [lrs, expenses, diesel, tolls] = await Promise.all([
    db.lr_bilty.toArray(),
    db.expenses.toArray(),
    db.diesel_logs.toArray(),
    db.toll_logs.toArray(),
  ])
  const months = Array.from({ length: 12 }, (_, i) => {
    const prefix = `${year}-${String(i+1).padStart(2,'0')}`
    const income = lrs.filter(l => l.date?.startsWith(prefix)).reduce((s,l) => s+(l.freight||0), 0)
    const outgo  = [...expenses, ...diesel, ...tolls].filter(e => e.date?.startsWith(prefix)).reduce((s,e) => s+(e.amount||0), 0)
    return { month: i+1, income, outgo, net: income - outgo }
  })
  return months
}

function printReport(title, content) {
  const s = (() => { try { return JSON.parse(localStorage.getItem('transportSettings') || '{}') } catch { return {} } })()
  const company = s.companyName || 'Transport Company'
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}body{padding:20px;font-size:12px;color:#000}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}.company{font-size:18px;font-weight:bold}.title{font-size:14px;font-weight:bold;margin-top:6px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#1e3a5f;color:#fff;padding:7px 10px;font-size:11px;text-align:left}td{border-bottom:1px solid #eee;padding:7px 10px}.total{font-weight:bold;border-top:2px solid #000}@media print{body{padding:8px}}</style></head>
  <body><div class="header"><div class="company">${company}</div><div class="title">${title} — ${new Date().toLocaleDateString('en-IN')}</div></div>${content}</body></html>`
  const w = window.open('', '_blank', 'width=800,height=600')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 300)
}

export default function Reports() {
  const navigate = useNavigate()
  const { show }  = useToast()
  const { t } = useT()
  const [tab, setTab]             = useState('monthly')
  const [trips, setTrips]         = useState([])
  const [vehicles, setVehicles]   = useState([])
  const [tripPLs, setTripPLs]     = useState([])
  const [vehicleExp, setVehicleExp] = useState([])
  const [outstanding, setOutstanding] = useState([])
  const [loading, setLoading]     = useState(true)
  const [vehiclePL, setVehiclePL] = useState([])
  const [aging, setAging] = useState(null)
  const [monthlyPL, setMonthlyPL] = useState({ revenue: 0, expenses: 0, profit: 0 })
  const [month, setMonth]         = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })
  const [balanceSheet, setBalanceSheet] = useState(null)
  const [cashFlow, setCashFlow]         = useState([])
  const [cfYear, setCfYear]             = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, v, out] = await Promise.all([getTrips(), getVehicles(), getOutstandingReceivables()])
      setTrips(t); setVehicles(v); setOutstanding(out)
      const pls  = await Promise.all(t.slice(0, 15).map(async trip => ({ trip, pl: await getTripPL(trip.id) })))
      setTripPLs(pls)
      const vExps = await Promise.all(v.map(async veh => ({ veh, byCategory: await getVehicleExpenses(veh.id) })))
      setVehicleExp(vExps)
      // Vehicle-wise P&L: freight earned per vehicle from LRs + trips, minus all vehicle expenses
      const [allLRs, allDiesel, allTolls, allExpenses, allMaintLogs, allSalaries] = await Promise.all([
        db.lr_bilty.toArray(), db.diesel_logs.toArray(), db.toll_logs.toArray(),
        db.expenses.toArray(), db.maintenance_logs ? db.maintenance_logs.toArray() : Promise.resolve([]),
        db.salary.toArray(),
      ])
      const vplData = v.map(veh => {
        const revenue = allLRs.filter(l => l.vehicle_id === veh.id || l.vehicle === veh.reg_no).reduce((s,l) => s+(l.freight||0), 0)
        const diesel  = allDiesel.filter(d => d.vehicle_id === veh.id).reduce((s,d) => s+(d.amount||0), 0)
        const toll    = allTolls.filter(d => d.vehicle_id === veh.id).reduce((s,d) => s+(d.amount||0), 0)
        const expense = allExpenses.filter(e => e.vehicle_id === veh.id).reduce((s,e) => s+(e.amount||0), 0)
        const maint   = (allMaintLogs||[]).filter(m => m.vehicle_id === veh.id).reduce((s,m) => s+(m.cost||0), 0)
        const totalExp = diesel + toll + expense + maint
        return { veh, revenue, diesel, toll, expense, maint, totalExp, profit: revenue - totalExp }
      }).filter(r => r.revenue > 0 || r.totalExp > 0)
      setVehiclePL(vplData)
      const [y, m] = month.split('-').map(Number)
      setMonthlyPL(await getMonthlyPL(y, m))
      const bs = await getBalanceSheet()
      setBalanceSheet(bs)
      setCashFlow(await getCashFlow(cfYear))
      // Aging
      const allLRsAging = await db.lr_bilty.toArray()
      const unpaidLRs = allLRsAging.filter(l => l.status !== 'Delivered' || l.pay_type === 'To-Pay')
      const now = new Date()
      const agingBuckets = { '0-30': [], '31-60': [], '61-90': [], '90+': [] }
      for (const lr of unpaidLRs) {
        const days = Math.floor((now - new Date(lr.date)) / 86400000)
        if (days <= 30) agingBuckets['0-30'].push(lr)
        else if (days <= 60) agingBuckets['31-60'].push(lr)
        else if (days <= 90) agingBuckets['61-90'].push(lr)
        else agingBuckets['90+'].push(lr)
      }
      setAging(agingBuckets)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [month, cfYear])

  useEffect(() => { load() }, [load])

  const maxCF = Math.max(...cashFlow.map(m => Math.max(m.income, m.outgo, 1)))
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <>
      <Header title={t('Reports')} onBack={() => navigate('/more')} />
      <div className="page">
        {/* Tabs - scrollable */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'monthly', label: 'Monthly P&L' },
            { id: 'trips', label: 'Trip P&L' },
            { id: 'vehiclepl', label: 'Vehicle P&L' },
            { id: 'vehicles', label: 'Vehicle Exp.' },
            { id: 'balance', label: 'Balance Sheet' },
            { id: 'cashflow', label: 'Cash Flow' },
            { id: 'outstanding', label: t('Receivables') },
            { id: 'aging', label: t('Aging') },
          ].map(tabItem => (
            <button key={tabItem.id} className={`filter-chip${tab === tabItem.id ? ' active' : ''}`} onClick={() => setTab(tabItem.id)} style={{ whiteSpace: 'nowrap' }}>{tabItem.label}</button>
          ))}
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {/* Monthly P&L */}
        {!loading && tab === 'monthly' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <input className="form-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const content = `<table><tr><th>Metric</th><th>Amount</th></tr><tr><td>Revenue</td><td>₹${monthlyPL.revenue.toLocaleString('en-IN')}</td></tr><tr><td>Expenses</td><td>₹${monthlyPL.expenses.toLocaleString('en-IN')}</td></tr><tr class="total"><td>Net Profit</td><td>₹${monthlyPL.profit.toLocaleString('en-IN')}</td></tr></table>`
                printReport(`Monthly P&L — ${month}`, content)
              }}>{t('Print')}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: t('Revenue'), value: formatCurrency(monthlyPL.revenue), color: '#10b981' },
                { label: t('Expenses'), value: formatCurrency(monthlyPL.expenses), color: '#ef4444' },
                { label: monthlyPL.profit >= 0 ? t('Profit') : t('Loss'), value: formatCurrency(Math.abs(monthlyPL.profit)), color: monthlyPL.profit >= 0 ? '#10b981' : '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Revenue vs Expenses</div>
              <svg width="100%" viewBox="0 0 300 90" style={{ display: 'block' }}>
                {[
                  { val: monthlyPL.revenue, color: '#10b981', label: 'Revenue' },
                  { val: monthlyPL.expenses, color: '#ef4444', label: 'Expenses' },
                  { val: Math.max(0, monthlyPL.profit), color: '#3b82f6', label: 'Profit' },
                ].map((v, i) => {
                  const maxVal = Math.max(monthlyPL.revenue, monthlyPL.expenses, 1)
                  const barH = (v.val / maxVal) * 64
                  const x = i * 96 + 20
                  return (
                    <g key={i}>
                      <rect x={x} y={72-barH} width={60} height={barH} rx={4} fill={v.color} opacity={0.85} />
                      <text x={x+30} y={84} textAnchor="middle" fontSize="8" fill="#94a3b8">{v.label}</text>
                      <text x={x+30} y={70-barH} textAnchor="middle" fontSize="7" fill={v.color} fontWeight="bold">
                        {v.val > 0 ? `₹${(v.val/1000).toFixed(0)}K` : ''}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </>
        )}

        {/* Trip P&L */}
        {!loading && tab === 'trips' && (
          tripPLs.length === 0
            ? <div className="empty"><div className="empty-icon">🚚</div><div className="empty-title">No trips</div></div>
            : <>
              <div style={{ marginBottom: 10, textAlign: 'right' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const rows = tripPLs.map(({trip,pl}) => `<tr><td>${trip.from_loc} → ${trip.to_loc}</td><td>${formatDate(trip.start_date)}</td><td>${trip.status}</td><td>₹${pl.revenue.toLocaleString('en-IN')}</td><td>₹${pl.expenses.toLocaleString('en-IN')}</td><td>₹${pl.profit.toLocaleString('en-IN')}</td></tr>`).join('')
                  printReport('Trip P&L Report', `<table><tr><th>Route</th><th>Date</th><th>Status</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr>${rows}</table>`)
                }}>Print All</button>
              </div>
              {tripPLs.map(({ trip, pl }) => (
                <div key={trip.id} className="card" style={{ borderLeft: `3px solid ${pl.profit >= 0 ? '#10b981' : '#ef4444'}` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>{trip.from_loc} → {trip.to_loc}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{formatDate(trip.start_date)} · {trip.status}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[
                      { label: t('Revenue'), value: formatCurrency(pl.revenue), color: '#10b981' },
                      { label: t('Expenses'), value: formatCurrency(pl.expenses), color: '#ef4444' },
                      { label: pl.profit >= 0 ? t('Profit') : t('Loss'), value: formatCurrency(Math.abs(pl.profit)), color: pl.profit >= 0 ? '#10b981' : '#ef4444' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
        )}

        {/* Vehicle P&L */}
        {!loading && tab === 'vehiclepl' && (
          vehiclePL.length === 0
            ? <div className="empty"><div className="empty-icon">🚛</div><div className="empty-title">No data</div><div className="empty-desc">Vehicle P&L requires LR entries linked to vehicles</div></div>
            : <>
              <div style={{ marginBottom: 10, textAlign: 'right' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const rows = vehiclePL.map(r => `<tr><td>${r.veh.name} (${r.veh.reg_no})</td><td>₹${r.revenue.toLocaleString('en-IN')}</td><td>₹${r.diesel.toLocaleString('en-IN')}</td><td>₹${r.toll.toLocaleString('en-IN')}</td><td>₹${r.expense.toLocaleString('en-IN')}</td><td>₹${r.maint.toLocaleString('en-IN')}</td><td style="color:${r.profit>=0?'green':'red'}">₹${r.profit.toLocaleString('en-IN')}</td></tr>`).join('')
                  printReport('Vehicle-wise P&L', `<table><tr><th>Vehicle</th><th>Revenue</th><th>Diesel</th><th>Toll</th><th>Expense</th><th>Maint.</th><th>Profit</th></tr>${rows}</table>`)
                }}>Print</button>
              </div>
              {vehiclePL.map(({ veh, revenue, diesel, toll, expense, maint, totalExp, profit }) => (
                <div key={veh.id} className="card" style={{ borderLeft: `3px solid ${profit >= 0 ? '#10b981' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{veh.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{veh.reg_no}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: profit >= 0 ? '#10b981' : '#ef4444' }}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text2)' }}>{profit >= 0 ? t('Profit') : t('Loss')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                    {[
                      { label: t('Revenue'), value: revenue, color: '#10b981' },
                      { label: t('Expenses'), value: totalExp, color: '#ef4444' },
                      { label: 'Margin', value: revenue > 0 ? Math.round((profit/revenue)*100) + '%' : '—', color: profit >= 0 ? '#3b82f6' : '#f97316', raw: true },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.raw ? s.value : formatCurrency(s.value)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2, textTransform: 'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', gap: 12 }}>
                    {[['Diesel',diesel],['Toll',toll],['Exp.',expense],['Maint.',maint]].map(([l,v]) => v>0 && (
                      <span key={l}>{l}: <strong style={{color:'#ef4444'}}>{formatCurrency(v)}</strong></span>
                    ))}
                  </div>
                </div>
              ))}
            </>
        )}

        {/* Vehicle Expenses */}
        {!loading && tab === 'vehicles' && (
          vehicleExp.length === 0
            ? <div className="empty"><div className="empty-icon">🚛</div><div className="empty-title">No data</div></div>
            : vehicleExp.filter(({ byCategory }) => Object.keys(byCategory).length > 0).map(({ veh, byCategory }) => {
              const total = Object.values(byCategory).reduce((s,v) => s+v, 0)
              return (
                <div key={veh.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{veh.name} ({veh.reg_no})</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--red)' }}>{formatCurrency(total)}</div>
                  </div>
                  {Object.entries(byCategory).map(([cat, amt]) => (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12 }}>
                        <span style={{ color: 'var(--text2)' }}>{cat}</span>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(amt)}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--surface2)', marginBottom: 4 }}>
                        <div style={{ height: 4, borderRadius: 2, background: '#ef4444', width: `${total > 0 ? (amt/total*100) : 0}%`, opacity: 0.7 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
        )}

        {/* Balance Sheet */}
        {!loading && tab === 'balance' && balanceSheet && (
          <>
            <div style={{ marginBottom: 10, textAlign: 'right' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const content = `<table><tr><th colspan="2">Assets</th></tr><tr><td>Cash Balance</td><td>₹${balanceSheet.assets.cashBalance.toLocaleString('en-IN')}</td></tr><tr><td>Receivables (To-Pay LRs)</td><td>₹${balanceSheet.assets.receivables.toLocaleString('en-IN')}</td></tr><tr><td>Inventory Value</td><td>₹${balanceSheet.assets.inventoryValue.toLocaleString('en-IN')}</td></tr><tr class="total"><td>Total Assets</td><td>₹${balanceSheet.assets.total.toLocaleString('en-IN')}</td></tr><tr><th colspan="2">Liabilities</th></tr><tr><td>Loan Outstanding</td><td>₹${balanceSheet.liabilities.loanOutstanding.toLocaleString('en-IN')}</td></tr><tr class="total"><td>Total Liabilities</td><td>₹${balanceSheet.liabilities.total.toLocaleString('en-IN')}</td></tr><tr class="total"><td>Net Worth (Assets - Liabilities)</td><td>₹${(balanceSheet.assets.total - balanceSheet.liabilities.total).toLocaleString('en-IN')}</td></tr></table>`
                printReport('Balance Sheet', content)
              }}>Print</button>
            </div>

            {/* Assets */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Assets</div>
            <div className="card" style={{ borderTop: '2px solid #10b981', marginBottom: 14 }}>
              {[
                { label: 'Cash Balance (Accounts)', value: balanceSheet.assets.cashBalance },
                { label: 'Receivables (To-Pay LRs)', value: balanceSheet.assets.receivables },
                { label: 'Inventory Value', value: balanceSheet.assets.inventoryValue },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontWeight: 800, fontSize: 15 }}>
                <span>Total Assets</span><span style={{ color: '#10b981' }}>{formatCurrency(balanceSheet.assets.total)}</span>
              </div>
            </div>

            {/* Liabilities */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Liabilities</div>
            <div className="card" style={{ borderTop: '2px solid #ef4444', marginBottom: 14 }}>
              {[
                { label: 'Loan Outstanding (EMIs remaining)', value: balanceSheet.liabilities.loanOutstanding },
                { label: 'Unpaid Expenses', value: balanceSheet.liabilities.payables },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontWeight: 800, fontSize: 15 }}>
                <span>Total Liabilities</span><span style={{ color: '#ef4444' }}>{formatCurrency(balanceSheet.liabilities.total)}</span>
              </div>
            </div>

            {/* Net Worth */}
            <div className="card" style={{ textAlign: 'center', borderTop: `2px solid ${balanceSheet.assets.total >= balanceSheet.liabilities.total ? '#3b82f6' : '#ef4444'}` }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Net Worth (Assets − Liabilities)</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: balanceSheet.assets.total >= balanceSheet.liabilities.total ? '#3b82f6' : '#ef4444' }}>
                {formatCurrency(balanceSheet.assets.total - balanceSheet.liabilities.total)}
              </div>
            </div>

            {/* P&L Summary */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>All-Time P&L Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: t('Total Revenue'), value: formatCurrency(balanceSheet.summary.totalRevenue), color: '#10b981' },
                { label: t('Total Expenses'), value: formatCurrency(balanceSheet.summary.totalExpenses), color: '#ef4444' },
                { label: balanceSheet.summary.netProfit >= 0 ? t('Net Profit') : 'Net Loss', value: formatCurrency(Math.abs(balanceSheet.summary.netProfit)), color: balanceSheet.summary.netProfit >= 0 ? '#10b981' : '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Cash Flow */}
        {!loading && tab === 'cashflow' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <select className="form-input" value={cfYear} onChange={e => setCfYear(Number(e.target.value))} style={{ flex: 1 }}>
                {[new Date().getFullYear(), new Date().getFullYear()-1, new Date().getFullYear()-2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Mini bars for each month */}
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 12 }}>Monthly Cash Flow — {cfYear}</div>
              <svg width="100%" viewBox="0 0 340 100" style={{ display: 'block' }}>
                {cashFlow.map((m, i) => {
                  const barW = 12
                  const x    = i * 28 + 6
                  const incH = maxCF > 0 ? (m.income / maxCF) * 70 : 2
                  const outH = maxCF > 0 ? (m.outgo  / maxCF) * 70 : 2
                  return (
                    <g key={i}>
                      <rect x={x}      y={80-incH} width={barW/2-1} height={incH} rx={2} fill="#10b981" opacity={0.8} />
                      <rect x={x+barW/2} y={80-outH} width={barW/2-1} height={outH} rx={2} fill="#ef4444" opacity={0.8} />
                      <text x={x+barW/2} y={92} textAnchor="middle" fontSize="6" fill="#94a3b8">{MONTH_SHORT[m.month-1]}</text>
                    </g>
                  )
                })}
              </svg>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text2)' }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }}/> Income</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text2)' }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }}/> Expenses</div>
              </div>
            </div>

            {/* Month list */}
            {cashFlow.filter(m => m.income > 0 || m.outgo > 0).map(m => (
              <div key={m.month} className="card" style={{ borderLeft: `3px solid ${m.net >= 0 ? '#10b981' : '#ef4444'}`, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{MONTH_SHORT[m.month-1]} {cfYear}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: m.net >= 0 ? '#10b981' : '#ef4444' }}>{m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: '#10b981' }}>In: {formatCurrency(m.income)}</div>
                  <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'right' }}>Out: {formatCurrency(m.outgo)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Outstanding Receivables */}
        {!loading && tab === 'outstanding' && (
          outstanding.length === 0
            ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-title">No outstanding receivables</div></div>
            : <>
              <div className="card" style={{ marginBottom: 14, textAlign: 'center', borderTop: '2px solid #f59e0b' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Total Outstanding</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(outstanding.reduce((s,l) => s+(l.freight||0), 0))}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{outstanding.length} pending LRs</div>
              </div>
              {outstanding.map(lr => {
                const today = new Date()
                const lrDate = new Date(lr.date)
                const ageDays = Math.floor((today - lrDate) / (1000*60*60*24))
                const ageColor = ageDays > 60 ? '#ef4444' : ageDays > 30 ? '#f59e0b' : '#94a3b8'
                return (
                  <div key={lr.id} className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{lr.lr_no}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{lr.consignor} → {lr.consignee}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: 'var(--text2)' }}>{formatDate(lr.date)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: ageColor }}>{ageDays} days old</span>
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#f59e0b' }}>{formatCurrency(lr.freight)}</div>
                    </div>
                  </div>
                )
              })}
            </>
        )}

        {/* Aging Report */}
        {!loading && tab === 'aging' && aging && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: '0-30 Days', key: '0-30', color: '#10b981' },
                { label: '31-60 Days', key: '31-60', color: '#f59e0b' },
                { label: '61-90 Days', key: '61-90', color: '#f97316' },
                { label: '90+ Days', key: '90+', color: '#ef4444' },
              ].map(b => (
                <div key={b.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${b.color}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: b.color }}>{aging[b.key].length}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{formatCurrency(aging[b.key].reduce((s,l)=>s+(l.freight||0),0))}</div>
                  <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{b.label}</div>
                </div>
              ))}
            </div>
            {[
              { label: '90+ Days (Critical)', key: '90+', color: '#ef4444' },
              { label: '61-90 Days', key: '61-90', color: '#f97316' },
              { label: '31-60 Days', key: '31-60', color: '#f59e0b' },
              { label: '0-30 Days', key: '0-30', color: '#10b981' },
            ].map(b => aging[b.key].length > 0 && (
              <div key={b.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: b.color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{b.label} — {aging[b.key].length} LRs</div>
                {aging[b.key].map(lr => (
                  <div key={lr.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${b.color}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{lr.lr_no}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{lr.consignor} → {lr.consignee}</div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{formatDate(lr.date)}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: b.color }}>{formatCurrency(lr.freight)}</div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const rows = ['0-30','31-60','61-90','90+'].flatMap(b => (aging[b]||[]).map(lr =>
                  `<tr><td>${lr.lr_no}</td><td>${lr.consignor}</td><td>${lr.consignee}</td><td>${formatDate(lr.date)}</td><td>₹${(lr.freight||0).toLocaleString('en-IN')}</td><td>${b} days</td></tr>`
                )).join('')
                printReport('Aging Report', `<table><tr><th>LR No</th><th>Consignor</th><th>Consignee</th><th>Date</th><th>Amount</th><th>Age</th></tr>${rows}</table>`)
              }}>Print Aging Report</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

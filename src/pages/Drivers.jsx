import React, { useState, useEffect, useCallback } from 'react'
import { getAll, add, update, remove } from '../services/driverService.js'
import { getByDriver, markAttendance, getMonthlySummary, addSalary, getAllSalaries, addAdvance, getAdvances } from '../services/attendanceService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, daysUntil, getErrorMsg, getInitials, monthStr } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const DRIVER_STATUSES = ['Active', 'On Trip', 'Inactive']

function DriverForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const blank = { name: '', phone: '', license_no: '', license_expiry: '', address: '', join_date: todayStr(), status: 'Active' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) { setForm(editing ? { ...blank, ...editing } : blank); setErrors({}) }
  }, [open, editing])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.phone.trim()) e.phone = 'Phone required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) { await update(editing.id, form); show('Driver updated!', 'success') }
      else         { await add(form); show('Driver added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const inp = (key, label, opts = {}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={form[key] || ''} onChange={e => f(key, e.target.value)} style={errors[key] ? { borderColor: '#ef4444' } : {}} {...opts} />
      {errors[key] && <div className="form-error">{errors[key]}</div>}
    </div>
  )

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit Driver' : 'Add Driver'}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? 'Update' : 'Add Driver'}
          </button>
        </>
      }
    >
      {inp('name', 'Full Name', { placeholder: 'Driver full name' })}
      {inp('phone', 'Phone Number', { type: 'tel', placeholder: '10-digit phone' })}
      {inp('license_no', 'License Number', { placeholder: 'DL Number' })}
      <div className="form-group"><label className="form-label">License Expiry</label><input className="form-input" type="date" value={form.license_expiry || ''} onChange={e => f('license_expiry', e.target.value)} /></div>
      {inp('address', 'Address', { placeholder: 'Home address' })}
      <div className="form-group"><label className="form-label">Join Date</label><input className="form-input" type="date" value={form.join_date || ''} onChange={e => f('join_date', e.target.value)} /></div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
          {DRIVER_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </Modal>
  )
}

function AttendanceView({ driver, onBack }) {
  const { show } = useToast()
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [month, setMonth] = useState(() => monthStr())

  const load = useCallback(async () => {
    const [y, m] = month.split('-').map(Number)
    const recs   = await getByDriver(driver.id)
    const monthRecs = recs.filter(r => r.date?.startsWith(month))
    setRecords(monthRecs)
    setSummary(await getMonthlySummary(driver.id, y, m))
  }, [driver.id, month])

  useEffect(() => { load() }, [load])

  const daysInMonth = () => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m, 0).getDate()
  }

  const handleMark = async (day, status) => {
    const date = `${month}-${String(day).padStart(2,'0')}`
    try { await markAttendance(driver.id, date, status); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const getStatus = (day) => {
    const date = `${month}-${String(day).padStart(2,'0')}`
    return records.find(r => r.date === date)?.status || null
  }

  const statusColors = { Present: '#10b981', Absent: '#ef4444', Leave: '#f59e0b' }

  return (
    <>
      <Header title={`${driver.name} — Attendance`} onBack={onBack} />
      <div className="page">
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <input className="form-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ flex: 1 }} />
        </div>

        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Present', value: summary.present, color: '#10b981' },
              { label: 'Absent', value: summary.absent, color: '#ef4444' },
              { label: 'Leave', value: summary.leave, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {['S','M','T','W','T','F','S'].map((d,i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text2)', paddingBottom: 4 }}>{d}</div>
          ))}
          {Array.from({ length: daysInMonth() }, (_, i) => i+1).map(day => {
            const st = getStatus(day)
            const bg = st ? `${statusColors[st]}18` : 'var(--surface2)'
            const color = st ? statusColors[st] : 'var(--text2)'
            return (
              <button key={day} onClick={() => {
                const options = ['Present', 'Absent', 'Leave']
                const currentIdx = st ? options.indexOf(st) : -1
                const next = options[(currentIdx + 1) % options.length]
                handleMark(day, next)
              }} style={{ height: 40, borderRadius: 8, background: bg, border: `1px solid ${st ? `${statusColors[st]}40` : 'var(--border)'}`, color, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {day}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(statusColors).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
              {s}
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 'auto' }}>Tap to cycle</div>
        </div>
      </div>
    </>
  )
}

function SalaryView({ driver, onBack }) {
  const { show } = useToast()
  const [salaries, setSalaries] = useState([])
  const [advances, setAdvances] = useState([])
  const [salModal, setSalModal] = useState(false)
  const [advModal, setAdvModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const curMonth = new Date()
  const [salForm, setSalForm] = useState({
    month: String(curMonth.getMonth() + 1).padStart(2, '0'),
    year: String(curMonth.getFullYear()),
    basic: '',
    allowance: '',
    advance_deducted: '',
  })
  const [advForm, setAdvForm] = useState({ date: todayStr(), amount: '', notes: '' })

  const load = useCallback(async () => {
    const [sal, adv] = await Promise.all([getAllSalaries(), getAdvances(driver.id)])
    setSalaries(sal.filter(s => s.driver_id === driver.id))
    setAdvances(adv)
  }, [driver.id])

  useEffect(() => { load() }, [load])

  const basic = Number(salForm.basic) || 0
  const allowance = Number(salForm.allowance) || 0
  const advance = Number(salForm.advance_deducted) || 0
  const netSalary = basic + allowance - advance

  const handleSaveSalary = async () => {
    if (!basic) { show('Basic salary required', 'error'); return }
    setSaving(true)
    try {
      await addSalary({ driver_id: driver.id, month: salForm.month, year: salForm.year, basic, allowance, advance_deducted: advance, net_paid: netSalary })
      show('Salary saved!', 'success'); setSalModal(false); load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const handleSaveAdvance = async () => {
    if (!advForm.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await addAdvance({ driver_id: driver.id, ...advForm, amount: Number(advForm.amount), recovered: 0 })
      show('Advance recorded!', 'success'); setAdvModal(false); load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const totalAdvance = advances.reduce((s, a) => s + (a.amount || 0), 0)

  return (
    <>
      <Header title={`${driver.name} — Salary`} onBack={onBack}
        rightAction={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setAdvModal(true)}>+ Advance</button>
            <button className="btn btn-primary btn-sm" onClick={() => setSalModal(true)}>+ Salary</button>
          </div>
        }
      />
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total Salary Paid', value: formatCurrency(salaries.reduce((s,sal) => s+(sal.net_paid||0),0)), color: '#10b981' },
            { label: 'Total Advances', value: formatCurrency(totalAdvance), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Salary History</div>
        {salaries.length === 0 ? (
          <div className="empty"><div className="empty-icon">💰</div><div className="empty-title">No salary records</div><div className="empty-desc">Add first salary entry</div></div>
        ) : salaries.map(s => (
          <div key={s.id} className="card" style={{ borderLeft: '3px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.month}/{s.year}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>{formatCurrency(s.net_paid)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'Basic', value: formatCurrency(s.basic) },
                { label: 'Allowance', value: formatCurrency(s.allowance) },
                { label: 'Advance Ded.', value: formatCurrency(s.advance_deducted) },
              ].map(r => (
                <div key={r.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase' }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {advances.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 6 }}>Advances</div>
            {advances.map(a => (
              <div key={a.id} className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(a.date)}</div>
                    {a.notes && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{a.notes}</div>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b' }}>{formatCurrency(a.amount)}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Salary Modal */}
      <Modal isOpen={salModal} onClose={() => setSalModal(false)} title="Add Salary"
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setSalModal(false)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={handleSaveSalary} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Save Salary'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-input" value={salForm.month} onChange={e => setSalForm(p => ({ ...p, month: e.target.value }))}>
              {Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <input className="form-input" type="number" value={salForm.year} onChange={e => setSalForm(p => ({ ...p, year: e.target.value }))} />
          </div>
        </div>
        <div className="form-group"><label className="form-label">Basic ₹</label><input className="form-input" type="number" value={salForm.basic} onChange={e => setSalForm(p => ({ ...p, basic: e.target.value }))} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Allowance ₹</label><input className="form-input" type="number" value={salForm.allowance} onChange={e => setSalForm(p => ({ ...p, allowance: e.target.value }))} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Advance Deducted ₹</label><input className="form-input" type="number" value={salForm.advance_deducted} onChange={e => setSalForm(p => ({ ...p, advance_deducted: e.target.value }))} placeholder="0" /></div>
        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text2)', fontSize: 13 }}>Net Payable</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#10b981' }}>{formatCurrency(netSalary)}</span>
        </div>
      </Modal>

      {/* Advance Modal */}
      <Modal isOpen={advModal} onClose={() => setAdvModal(false)} title="Record Advance"
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setAdvModal(false)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={handleSaveAdvance} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Save'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={advForm.amount} onChange={e => setAdvForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
          <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={advForm.date} onChange={e => setAdvForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={advForm.notes} onChange={e => setAdvForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reason for advance" /></div>
      </Modal>
    </>
  )
}

export default function Drivers() {
  const { show } = useToast()
  const [mainTab, setMainTab] = useState('drivers')
  const [drivers, setDrivers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [viewAttendance, setViewAttendance] = useState(null)
  const [viewSalary, setViewSalary] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDrivers(await getAll()) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete driver "${d.name}"?`)) return
    try { await remove(d.id); show('Driver deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  if (viewAttendance) return <AttendanceView driver={viewAttendance} onBack={() => setViewAttendance(null)} />
  if (viewSalary) return <SalaryView driver={viewSalary} onBack={() => setViewSalary(null)} />

  const filtered = drivers.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search)
  )

  const statusColor = s => s === 'Active' ? '#10b981' : s === 'On Trip' ? '#3b82f6' : '#94a3b8'

  return (
    <>
      <Header title="Drivers"
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        }
      />
      <div className="page">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total', value: drivers.length, color: '#3b82f6' },
            { label: 'Active', value: drivers.filter(d => d.status === 'Active').length, color: '#10b981' },
            { label: 'On Trip', value: drivers.filter(d => d.status === 'On Trip').length, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${mainTab === 'drivers' ? ' active' : ''}`} onClick={() => setMainTab('drivers')}>Drivers</button>
          <button className={`tab${mainTab === 'attendance' ? ' active' : ''}`} onClick={() => setMainTab('attendance')}>Attendance</button>
          <button className={`tab${mainTab === 'salary' ? ' active' : ''}`} onClick={() => setMainTab('salary')}>Salary</button>
        </div>

        {mainTab === 'drivers' && (
          <>
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading && <div className="loading"><span className="spinner" />Loading…</div>}
            {!loading && filtered.length === 0 && (
              <div className="empty">
                <div className="empty-icon">👤</div>
                <div className="empty-title">No drivers found</div>
                <div className="empty-desc">Add your first driver</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditing(null); setModalOpen(true) }}>+ Add Driver</button>
              </div>
            )}

            {!loading && filtered.map((d, idx) => {
              const sc      = statusColor(d.status)
              const licDays  = daysUntil(d.license_expiry)
              const licColor = licDays == null ? 'var(--text2)' : licDays < 0 ? '#ef4444' : licDays <= 30 ? '#f59e0b' : '#10b981'
              const licBg    = licDays == null ? 'var(--surface2)' : licDays < 0 ? 'rgba(239,68,68,0.12)' : licDays <= 30 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'
              const licLabel = licDays == null ? 'No Expiry' : licDays < 0 ? `Expired ${Math.abs(licDays)}d ago` : licDays === 0 ? 'Expires Today' : `${licDays}d left`
              return (
                <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, marginBottom: 12, overflow: 'hidden', animation: `fadeUp 0.3s ease ${idx*0.04}s both` }}>
                  {/* Top accent bar */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${sc}, ${sc}66)` }} />

                  {/* Main content */}
                  <div style={{ padding: '16px 16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: `${sc}20`, border: `2px solid ${sc}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: sc, flexShrink: 0 }}>
                        {getInitials(d.name)}
                      </div>

                      {/* Name + status */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: -0.3 }}>{d.name}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: `${sc}20`, color: sc, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.status}</span>
                        </div>
                        {d.experience != null && (
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{d.experience} yrs experience</div>
                        )}
                      </div>
                    </div>

                    {/* Info rows */}
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Phone */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.59 9.79 19.79 19.79 0 01.5 1.18 2 2 0 012.5 0h3a2 2 0 012 1.72c.127.96.36 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.45a16 16 0 006.63 6.63l1.21-1.21a2 2 0 012.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Phone</div>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{d.phone || '—'}</div>
                        </div>
                      </div>

                      {/* License */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>License No</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{d.license_no || '—'}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: licBg, color: licColor }}>{licLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Address (if available) */}
                      {d.address && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Address</div>
                            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>{d.address}</div>
                          </div>
                        </div>
                      )}

                      {/* Salary */}
                      {d.salary != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Monthly Salary</div>
                            <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>₹{Number(d.salary).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: '1px solid var(--border)' }}>
                    {[
                      { label: 'Attendance', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, action: () => setViewAttendance(d) },
                      { label: 'Salary', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, action: () => setViewSalary(d) },
                      { label: 'Edit', color: 'var(--text2)', bg: 'transparent', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, action: () => { setEditing(d); setModalOpen(true) } },
                      { label: 'Delete', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>, action: () => handleDelete(d) },
                    ].map((btn, i) => (
                      <button key={btn.label} onClick={btn.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 4px', border: 'none', borderLeft: i > 0 ? '1px solid var(--border)' : 'none', background: btn.bg, color: btn.color, cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        {btn.icon}
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {mainTab === 'attendance' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '20px 0 12px', fontWeight: 600 }}>Select a driver to view attendance</div>
            {drivers.map(d => {
              const sc = statusColor(d.status)
              return (
                <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => setViewAttendance(d)}
                  onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${sc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: sc, flexShrink: 0 }}>{getInitials(d.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{d.phone}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              )
            })}
          </div>
        )}

        {mainTab === 'salary' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '20px 0 12px', fontWeight: 600 }}>Select a driver to manage salary</div>
            {drivers.map(d => {
              const sc = statusColor(d.status)
              return (
                <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => setViewSalary(d)}
                  onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${sc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: sc, flexShrink: 0 }}>{getInitials(d.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{d.phone}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DriverForm open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editing={editing} />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  )
}

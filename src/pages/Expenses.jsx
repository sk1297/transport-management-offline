import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, update, remove } from '../services/expenseService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { getAll as getTrips } from '../services/tripService.js'
import { getAll as getVendors } from '../services/vendorService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const CATEGORIES = ['Diesel', 'Toll', 'Tyre', 'Repair', 'Driver Salary', 'Cleaning', 'Parking', 'Miscellaneous']

function categoryColor(cat) {
  const m = { Diesel: '#f59e0b', Toll: '#3b82f6', Tyre: '#8b5cf6', Repair: '#ef4444', 'Driver Salary': '#10b981', Cleaning: '#06b6d4', Parking: '#ec4899', Miscellaneous: '#94a3b8' }
  return m[cat] || '#94a3b8'
}

function ExpenseForm({ open, onClose, onSaved, editing, vehicles, trips, vendors }) {
  const { show } = useToast()
  const blank = { category: 'Miscellaneous', amount: '', date: todayStr(), vehicle_id: '', trip_id: '', vendor_id: '', notes: '', receipt_photo: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(editing ? { ...blank, ...editing, vehicle_id: String(editing.vehicle_id||''), trip_id: String(editing.trip_id||''), vendor_id: String(editing.vendor_id||'') } : blank)
  }, [open, editing])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount)||0, vehicle_id: Number(form.vehicle_id)||null, trip_id: Number(form.trip_id)||null, vendor_id: Number(form.vendor_id)||null }
      if (editing) { await update(editing.id, payload); show('Expense updated!', 'success') }
      else         { await add(payload); show('Expense added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit Expense' : 'Add Expense'}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? 'Update' : 'Save Expense'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input" value={form.category} onChange={e => f('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={form.amount||''} onChange={e => f('amount', e.target.value)} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date||''} onChange={e => f('date', e.target.value)} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Vehicle (Optional)</label>
        <select className="form-input" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
          <option value="">— Select —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Trip (Optional)</label>
        <select className="form-input" value={form.trip_id} onChange={e => f('trip_id', e.target.value)}>
          <option value="">— Select —</option>
          {trips.map(t => <option key={t.id} value={t.id}>{t.from_loc} → {t.to_loc}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Vendor (Optional)</label>
        <select className="form-input" value={form.vendor_id} onChange={e => f('vendor_id', e.target.value)}>
          <option value="">— Select —</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes||''} onChange={e => f('notes', e.target.value)} placeholder="Optional notes" /></div>
      <div className="form-group">
        <label className="form-label">Receipt Photo (Optional)</label>
        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} id="exp-receipt-input"
          onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = ev => f('receipt_photo', ev.target.result)
            reader.readAsDataURL(file)
          }}
        />
        {form.receipt_photo ? (
          <div style={{ position: 'relative', marginTop: 4 }}>
            <img src={form.receipt_photo} alt="Receipt" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
            <button type="button" onClick={() => f('receipt_photo', '')} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✕</button>
          </div>
        ) : (
          <button type="button" onClick={() => document.getElementById('exp-receipt-input').click()} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Capture Receipt
          </button>
        )}
      </div>
    </Modal>
  )
}

export default function Expenses() {
  const navigate  = useNavigate()
  const { show }  = useToast()
  const [expenses,  setExpenses]  = useState([])
  const [vehicles,  setVehicles]  = useState([])
  const [trips,     setTrips]     = useState([])
  const [vendors,   setVendors]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [e, v, t, vend] = await Promise.all([getAll(), getVehicles(), getTrips(), getVendors()])
      setExpenses(e); setVehicles(v); setTrips(t); setVendors(vend)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (exp) => {
    if (!window.confirm('Delete this expense?')) return
    try { await remove(exp.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const filtered = filter === 'All' ? expenses : expenses.filter(e => e.category === filter)
  const totalAmt = filtered.reduce((s, e) => s + (e.amount||0), 0)

  // Group by date
  const grouped = {}
  for (const e of filtered) {
    const d = e.date || 'Unknown'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(e)
  }
  const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a))

  return (
    <>
      <Header title="Expenses" onBack={() => navigate('/more')}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        }
      />
      <div className="page">
        {/* Summary */}
        <div className="card" style={{ textAlign: 'center', borderTop: '2px solid var(--red)', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Total ({filter})</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>{formatCurrency(totalAmt)}</div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat} className={`filter-chip${filter === cat ? ' active' : ''}`} onClick={() => setFilter(cat)}
              style={filter === cat ? { background: categoryColor(cat), borderColor: categoryColor(cat), color: '#fff' } : {}}>
              {cat}
            </button>
          ))}
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty"><div className="empty-icon">💸</div><div className="empty-title">No expenses</div><div className="empty-desc">Log your first expense</div></div>
        )}

        {!loading && sortedDates.map(date => (
          <div key={date}>
            <div className="expense-date-group">{formatDate(date)}</div>
            {grouped[date].map(exp => {
              const cc = categoryColor(exp.category)
              return (
                <div key={exp.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${cc}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cc, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                    {exp.category.substring(0,3).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{exp.category}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.notes || '—'}</div>
                    {exp.receipt_photo && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>📷 Receipt</span>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--red)' }}>{formatCurrency(exp.amount)}</div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => { setEditing(exp); setModalOpen(true) }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-icon" style={{ width: 26, height: 26, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(exp)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <ExpenseForm open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editing={editing} vehicles={vehicles} trips={trips} vendors={vendors} />
    </>
  )
}

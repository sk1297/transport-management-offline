import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, update, remove } from '../services/vehicleService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, daysUntil, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const VEHICLE_TYPES   = ['Truck', 'Tempo', 'Pickup', 'Bus', 'Mini Truck']
const VEHICLE_STATUSES = ['Active', 'In Trip', 'Under Repair', 'Inactive']

function ExpiryBadge({ label, dateStr }) {
  const days = daysUntil(dateStr)
  if (days == null) return null
  let color = '#10b981', bg = 'rgba(16,185,129,0.12)'
  if (days < 0)  { color = '#ef4444'; bg = 'rgba(239,68,68,0.12)' }
  else if (days <= 30) { color = '#f59e0b'; bg = 'rgba(245,158,11,0.12)' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: bg, color, marginRight: 4 }}>
      {label}: {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
    </span>
  )
}

function statusColor(s) {
  if (s === 'Active') return '#10b981'
  if (s === 'In Trip') return '#3b82f6'
  if (s === 'Under Repair') return '#f59e0b'
  return '#94a3b8'
}

function typeColor(t) {
  if (t === 'Truck') return '#3b82f6'
  if (t === 'Tempo') return '#8b5cf6'
  if (t === 'Pickup') return '#f97316'
  if (t === 'Bus') return '#10b981'
  return '#64748b'
}

function VehicleForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const blank = { name: '', type: 'Truck', reg_no: '', owner: '', insurance_expiry: '', puc_expiry: '', next_service_km: '', current_km: '', status: 'Active' }
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
    if (!form.reg_no.trim()) e.reg_no = 'Registration number required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) { await update(editing.id, form); show('Vehicle updated!', 'success') }
      else         { await add(form); show('Vehicle added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const inp = (key, label, opts = {}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className={`form-input${errors[key] ? ' border-red-500' : ''}`} value={form[key] || ''} onChange={e => f(key, e.target.value)} style={errors[key] ? { borderColor: '#ef4444' } : {}} {...opts} />
      {errors[key] && <div className="form-error">{errors[key]}</div>}
    </div>
  )

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? 'Update' : 'Add Vehicle'}
          </button>
        </>
      }
    >
      {inp('name', 'Vehicle Name', { placeholder: 'e.g. Tata 407' })}
      <div className="form-group">
        <label className="form-label">Type</label>
        <select className="form-input" value={form.type} onChange={e => f('type', e.target.value)}>
          {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      {inp('reg_no', 'Registration No.', { placeholder: 'MH 12 AB 1234' })}
      {inp('owner', 'Owner Name', { placeholder: 'Owner name' })}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Insurance Expiry</label>
          <input className="form-input" type="date" value={form.insurance_expiry || ''} onChange={e => f('insurance_expiry', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">PUC Expiry</label>
          <input className="form-input" type="date" value={form.puc_expiry || ''} onChange={e => f('puc_expiry', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('current_km', 'Current KM', { type: 'number', placeholder: '0' })}
        {inp('next_service_km', 'Next Service KM', { type: 'number', placeholder: '0' })}
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
          {VEHICLE_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </Modal>
  )
}

export default function Vehicles() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setVehicles(await getAll()) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (v) => {
    if (!window.confirm(`Delete "${v.name}"?`)) return
    try { await remove(v.id); show('Vehicle deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const filtered = vehicles.filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.reg_no?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title="Vehicles"
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        }
      />
      <div className="page">
        {/* Stats */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Total', value: vehicles.length, color: '#3b82f6' },
              { label: 'Active', value: vehicles.filter(v => v.status === 'Active').length, color: '#10b981' },
              { label: 'In Trip', value: vehicles.filter(v => v.status === 'In Trip').length, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="search-input" placeholder="Search by name or reg no…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🚛</div>
            <div className="empty-title">No vehicles found</div>
            <div className="empty-desc">{search ? `No results for "${search}"` : 'Add your first vehicle'}</div>
          </div>
        )}

        {!loading && filtered.map((v, idx) => {
          const sc = statusColor(v.status)
          const tc = typeColor(v.type)
          return (
            <div key={v.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, animation: `fadeUp 0.3s ease ${idx * 0.04}s both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${tc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc, flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v3h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{v.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${sc}18`, color: sc, textTransform: 'uppercase' }}>{v.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{v.reg_no} · {v.type}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <ExpiryBadge label="Ins" dateStr={v.insurance_expiry} />
                    <ExpiryBadge label="PUC" dateStr={v.puc_expiry} />
                    {v.current_km && v.next_service_km && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', padding: '2px 7px', borderRadius: 5, background: 'var(--surface2)' }}>
                        {v.current_km?.toLocaleString()} / {v.next_service_km?.toLocaleString()} km
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => { setEditing(v); setModalOpen(true) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(v)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <VehicleForm open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editing={editing} />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  )
}

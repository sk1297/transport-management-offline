import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getAll, add, update, remove } from '../services/vehicleService.js'
import { getByVehicle as getDocs, add as addDoc, remove as removeDoc, DOC_TYPES } from '../services/vehicleDocService.js'
import { getByVehicle as getKmLogs, add as addKmLog, remove as removeKmLog, PURPOSES } from '../services/kmLogService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, daysUntil, getErrorMsg, formatCurrency } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const VEHICLE_TYPES    = ['Truck', 'Tempo', 'Pickup', 'Bus', 'Mini Truck']
const VEHICLE_STATUSES = ['Active', 'In Trip', 'Under Repair', 'Inactive']

function ExpiryBadge({ label, dateStr }) {
  const days = daysUntil(dateStr)
  if (days == null) return null
  let color = '#10b981', bg = 'rgba(16,185,129,0.12)'
  if (days < 0)       { color = '#ef4444'; bg = 'rgba(239,68,68,0.12)' }
  else if (days <= 30){ color = '#f59e0b'; bg = 'rgba(245,158,11,0.12)' }
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
  const { t } = useT()
  const blank = { name: '', type: 'Truck', reg_no: '', owner: '', insurance_expiry: '', puc_expiry: '', next_service_km: '', current_km: '', status: 'Active', fitness_expiry: '', national_permit_expiry: '', state_permit_expiry: '', capacity_kg: '' }
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
      <input className="form-input" value={form[key] || ''} onChange={e => f(key, e.target.value)} style={errors[key] ? { borderColor: '#ef4444' } : {}} {...opts} />
      {errors[key] && <div className="form-error">{errors[key]}</div>}
    </div>
  )

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit Vehicle') : t('Add Vehicle')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? t('Update') : t('Add Vehicle')}
          </button>
        </>
      }
    >
      {inp('name', t('Vehicle'), { placeholder: 'e.g. Tata 407' })}
      <div className="form-group">
        <label className="form-label">{t('Vehicle Type')}</label>
        <select className="form-input" value={form.type} onChange={e => f('type', e.target.value)}>
          {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      {inp('reg_no', t('Registration No'), { placeholder: 'MH 12 AB 1234' })}
      {inp('owner', t('Owner Name'), { placeholder: 'Owner name' })}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">{t('Insurance Expiry')}</label><input className="form-input" type="date" value={form.insurance_expiry || ''} onChange={e => f('insurance_expiry', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">{t('PUC Expiry')}</label><input className="form-input" type="date" value={form.puc_expiry || ''} onChange={e => f('puc_expiry', e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 4, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('Fitness & Permits')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">{t('Fitness Expiry')}</label><input className="form-input" type="date" value={form.fitness_expiry || ''} onChange={e => f('fitness_expiry', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">{t('National Permit')}</label><input className="form-input" type="date" value={form.national_permit_expiry || ''} onChange={e => f('national_permit_expiry', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">{t('State Permit')}</label><input className="form-input" type="date" value={form.state_permit_expiry || ''} onChange={e => f('state_permit_expiry', e.target.value)} /></div>
          {inp('capacity_kg', t('Capacity (kg)'), { type: 'number', placeholder: '0' })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('current_km', t('Current KM'), { type: 'number', placeholder: '0' })}
        {inp('next_service_km', t('Next Service KM'), { type: 'number', placeholder: '0' })}
      </div>
      <div className="form-group">
        <label className="form-label">{t('Status')}</label>
        <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
          {VEHICLE_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </Modal>
  )
}

function VehicleDetail({ vehicle, onBack, onRefresh }) {
  const { show } = useToast()
  const { t } = useT()
  const [tab, setTab]       = useState('docs')
  const [docs, setDocs]     = useState([])
  const [kmLogs, setKmLogs] = useState([])
  const [docModal, setDocModal] = useState(false)
  const [kmModal, setKmModal]   = useState(false)
  const [docForm, setDocForm] = useState({ doc_type: 'RC Book', notes: '', file_data: '' })
  const [kmForm, setKmForm]   = useState({ date: new Date().toISOString().split('T')[0], km_reading: '', purpose: 'Trip', notes: '' })
  const [saving, setSaving] = useState(false)

  const loadDocs  = useCallback(async () => { setDocs(await getDocs(vehicle.id)) }, [vehicle.id])
  const loadKmLogs = useCallback(async () => { const l = await getKmLogs(vehicle.id); setKmLogs(l.reverse()) }, [vehicle.id])

  useEffect(() => { loadDocs(); loadKmLogs() }, [loadDocs, loadKmLogs])

  const handleAddDoc = async () => {
    if (!docForm.doc_type) { show('Document type required', 'error'); return }
    setSaving(true)
    try {
      await addDoc({ vehicle_id: vehicle.id, ...docForm })
      show('Document saved!', 'success'); setDocModal(false); loadDocs()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const handleAddKm = async () => {
    if (!kmForm.km_reading) { show('KM reading required', 'error'); return }
    setSaving(true)
    try {
      await addKmLog({ vehicle_id: vehicle.id, ...kmForm, km_reading: Number(kmForm.km_reading) })
      show('KM log added!', 'success'); setKmModal(false); loadKmLogs()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const handlePhotoCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => { setDocForm(p => ({ ...p, file_data: ev.target.result })) }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const sc = statusColor(vehicle.status)

  return (
    <>
      <Header title={vehicle.name} onBack={onBack}
        rightAction={
          <div style={{ display: 'flex', gap: 6 }}>
            {tab === 'docs' && <button className="btn btn-primary btn-sm" onClick={() => setDocModal(true)}>+ Doc</button>}
            {tab === 'km'   && <button className="btn btn-primary btn-sm" onClick={() => setKmModal(true)}>+ KM Log</button>}
          </div>
        }
      />
      <div className="page">
        {/* Vehicle Summary */}
        <div className="card" style={{ borderLeft: `3px solid ${sc}`, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{vehicle.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{vehicle.reg_no} · {vehicle.type}</div>
              {vehicle.owner && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Owner: {vehicle.owner}</div>}
              {vehicle.capacity_kg && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Capacity: {vehicle.capacity_kg} kg</div>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: `${sc}18`, color: sc, textTransform: 'uppercase' }}>{vehicle.status}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            <ExpiryBadge label="Insurance" dateStr={vehicle.insurance_expiry} />
            <ExpiryBadge label="PUC" dateStr={vehicle.puc_expiry} />
            <ExpiryBadge label="Fitness" dateStr={vehicle.fitness_expiry} />
            <ExpiryBadge label="Nat.Permit" dateStr={vehicle.national_permit_expiry} />
            <ExpiryBadge label="St.Permit" dateStr={vehicle.state_permit_expiry} />
          </div>
          {vehicle.current_km && vehicle.next_service_km && (
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Service Due at <strong>{Number(vehicle.next_service_km).toLocaleString('en-IN')} km</strong></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: (vehicle.next_service_km - vehicle.current_km) <= 2000 ? '#ef4444' : '#10b981' }}>
                {(vehicle.next_service_km - vehicle.current_km).toLocaleString('en-IN')} km left
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab${tab === 'docs' ? ' active' : ''}`} onClick={() => setTab('docs')}>{t('Documents')}</button>
          <button className={`tab${tab === 'km' ? ' active' : ''}`} onClick={() => setTab('km')}>{t('KM Logs')}</button>
        </div>

        {/* Documents Tab */}
        {tab === 'docs' && (
          <>
            {docs.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📄</div>
                <div className="empty-title">{t('No documents yet')}</div>
                <div className="empty-desc">{t('Store RC, Insurance, PUC certificates here')}</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setDocModal(true)}>+ {t('Add Document')}</button>
              </div>
            ) : docs.map(doc => (
              <div key={doc.id} className="card" style={{ borderLeft: '3px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{doc.doc_type}</div>
                    {doc.notes && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{doc.notes}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>Added: {formatDate(doc.uploaded_date)}</div>
                    {doc.file_data && (
                      <img src={doc.file_data} alt={doc.doc_type}
                        style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, marginTop: 8, border: '1px solid var(--border)' }}
                        onClick={() => { const w = window.open(''); w.document.write(`<img src="${doc.file_data}" style="max-width:100%" />`); w.document.close() }}
                      />
                    )}
                  </div>
                  <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', flexShrink: 0, marginLeft: 8 }}
                    onClick={async () => { if (!window.confirm('Delete document?')) return; await removeDoc(doc.id); loadDocs() }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* KM Log Tab */}
        {tab === 'km' && (
          <>
            {kmLogs.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🛣️</div>
                <div className="empty-title">{t('No KM logs yet')}</div>
                <div className="empty-desc">{t('Track odometer readings to monitor usage')}</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setKmModal(true)}>+ {t('Log KM')}</button>
              </div>
            ) : (
              <div>
                {kmLogs.map((log, i) => {
                  const prev = kmLogs[i + 1]
                  const diff = prev ? log.km_reading - prev.km_reading : null
                  return (
                    <div key={log.id} className="card" style={{ borderLeft: '3px solid #8b5cf6', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{Number(log.km_reading).toLocaleString('en-IN')} km</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{formatDate(log.date)} · {log.purpose}</div>
                          {log.notes && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{log.notes}</div>}
                          {diff !== null && diff > 0 && <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>+{diff.toLocaleString('en-IN')} km from last entry</div>}
                        </div>
                        <button className="btn-icon" style={{ width: 26, height: 26, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }}
                          onClick={async () => { await removeKmLog(log.id); loadKmLogs() }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Document Modal */}
      <Modal isOpen={docModal} onClose={() => setDocModal(false)} title={t('Add Document')}
        footer={<>
          <button className="btn btn-secondary flex-1" onClick={() => setDocModal(false)}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleAddDoc} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">{t('Document Type')}</label>
          <select className="form-input" value={docForm.doc_type} onChange={e => setDocForm(p => ({ ...p, doc_type: e.target.value }))}>
            {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">{t('Notes (Optional)')}</label><input className="form-input" value={docForm.notes} onChange={e => setDocForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Valid until Dec 2025" /></div>
        <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 10 }} onClick={handlePhotoCapture}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          {docForm.file_data ? 'Change Photo' : 'Capture / Upload Photo'}
        </button>
        {docForm.file_data && (
          <img src={docForm.file_data} alt="Preview" style={{ width: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
        )}
      </Modal>

      {/* KM Modal */}
      <Modal isOpen={kmModal} onClose={() => setKmModal(false)} title={t('Log KM Reading')}
        footer={<>
          <button className="btn btn-secondary flex-1" onClick={() => setKmModal(false)}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleAddKm} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">{t('KM Reading')}</label><input className="form-input" type="number" value={kmForm.km_reading} onChange={e => setKmForm(p => ({ ...p, km_reading: e.target.value }))} placeholder="e.g. 82500" /></div>
          <div className="form-group"><label className="form-label">{t('Date')}</label><input className="form-input" type="date" value={kmForm.date} onChange={e => setKmForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">{t('Purpose')}</label>
          <select className="form-input" value={kmForm.purpose} onChange={e => setKmForm(p => ({ ...p, purpose: e.target.value }))}>
            {PURPOSES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">{t('Notes')}</label><input className="form-input" value={kmForm.notes} onChange={e => setKmForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></div>
      </Modal>
    </>
  )
}

export default function Vehicles() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [detail, setDetail]       = useState(null)

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

  if (detail) return <VehicleDetail vehicle={detail} onBack={() => { setDetail(null); load() }} onRefresh={load} />

  const filtered = vehicles.filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.reg_no?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title={t('Vehicle')}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('Add')}
          </button>
        }
      />
      <div className="page">
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
            <div className="empty-title">{t('No vehicles found')}</div>
            <div className="empty-desc">{search ? `No results for "${search}"` : t('Add your first vehicle')}</div>
          </div>
        )}

        {!loading && filtered.map((v, idx) => {
          const sc = statusColor(v.status)
          const tc = typeColor(v.type)
          return (
            <div key={v.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer', animation: `fadeUp 0.3s ease ${idx * 0.04}s both` }}
              onClick={() => setDetail(v)}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
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
                        {Number(v.current_km).toLocaleString('en-IN')} / {Number(v.next_service_km).toLocaleString('en-IN')} km
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => { setEditing(v); setModalOpen(true) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(v)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
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

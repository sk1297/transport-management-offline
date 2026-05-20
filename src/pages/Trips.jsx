import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll as getTrips, add as addTrip, update as updateTrip, remove as removeTrip, getWithLRs } from '../services/tripService.js'
import { getAll as getLRs, add as addLR, update as updateLR, remove as removeLR, autoLRNumber, getByTrip } from '../services/lrService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { getAll as getDrivers } from '../services/driverService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const TRIP_STATUSES = ['Planned', 'Active', 'Completed']
const LR_PAY_TYPES  = ['Paid', 'To-Pay', 'To-Be-Billed']
const LR_STATUSES   = ['Created', 'In Transit', 'Delivered']

function statusColor(s) {
  if (s === 'Active' || s === 'In Transit') return '#3b82f6'
  if (s === 'Completed' || s === 'Delivered') return '#10b981'
  if (s === 'Planned' || s === 'Created') return '#f59e0b'
  return '#94a3b8'
}

function payTypeColor(t) {
  if (t === 'Paid') return '#10b981'
  if (t === 'To-Pay') return '#f59e0b'
  return '#3b82f6'
}

function TripForm({ open, onClose, onSaved, editing, vehicles, drivers }) {
  const { show } = useToast()
  const blank = { vehicle_id: '', driver_id: '', from_loc: '', to_loc: '', start_date: todayStr(), end_date: '', status: 'Planned', notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(editing ? { ...blank, ...editing, vehicle_id: String(editing.vehicle_id||''), driver_id: String(editing.driver_id||'') } : blank)
  }, [open, editing])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.from_loc || !form.to_loc) { show('From/To required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, vehicle_id: Number(form.vehicle_id) || null, driver_id: Number(form.driver_id) || null }
      if (editing) { await updateTrip(editing.id, payload); show('Trip updated!', 'success') }
      else         { await addTrip(payload); show('Trip added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit Trip' : 'New Trip'}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? 'Update' : 'Create Trip'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Vehicle</label>
        <select className="form-input" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
          <option value="">— Select Vehicle —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Driver</label>
        <select className="form-input" value={form.driver_id} onChange={e => f('driver_id', e.target.value)}>
          <option value="">— Select Driver —</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">From</label><input className="form-input" value={form.from_loc} onChange={e => f('from_loc', e.target.value)} placeholder="Origin" /></div>
        <div className="form-group"><label className="form-label">To</label><input className="form-input" value={form.to_loc} onChange={e => f('to_loc', e.target.value)} placeholder="Destination" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">End Date</label><input className="form-input" type="date" value={form.end_date || ''} onChange={e => f('end_date', e.target.value)} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
          {TRIP_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes || ''} onChange={e => f('notes', e.target.value)} placeholder="Optional notes" /></div>
    </Modal>
  )
}

function LRForm({ open, onClose, onSaved, editing, tripId, trips }) {
  const { show } = useToast()
  const blank = { lr_no: '', date: todayStr(), consignor: '', consignee: '', from: '', to: '', goods_desc: '', weight: '', packages: '', freight: '', pay_type: 'To-Pay', status: 'Created', trip_id: tripId || '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...blank, ...editing, trip_id: String(editing.trip_id || '') })
      } else {
        autoLRNumber().then(no => setForm({ ...blank, lr_no: no, trip_id: tripId ? String(tripId) : '' }))
      }
    }
  }, [open, editing, tripId])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.consignor || !form.consignee) { show('Consignor/Consignee required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, trip_id: Number(form.trip_id) || null, freight: Number(form.freight)||0, weight: Number(form.weight)||0, packages: Number(form.packages)||0 }
      if (editing) { await updateLR(editing.id, payload); show('LR updated!', 'success') }
      else         { await addLR(payload); show('LR created!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit LR / Bilty' : 'Create LR / Bilty'}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? 'Update' : 'Create LR'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">LR No.</label><input className="form-input" value={form.lr_no || ''} onChange={e => f('lr_no', e.target.value)} placeholder="LR-2026-001" /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date || ''} onChange={e => f('date', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Consignor (Sender)</label><input className="form-input" value={form.consignor || ''} onChange={e => f('consignor', e.target.value)} placeholder="Sender name" /></div>
      <div className="form-group"><label className="form-label">Consignee (Receiver)</label><input className="form-input" value={form.consignee || ''} onChange={e => f('consignee', e.target.value)} placeholder="Receiver name" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">From</label><input className="form-input" value={form.from || ''} onChange={e => f('from', e.target.value)} placeholder="Origin" /></div>
        <div className="form-group"><label className="form-label">To</label><input className="form-input" value={form.to || ''} onChange={e => f('to', e.target.value)} placeholder="Destination" /></div>
      </div>
      <div className="form-group"><label className="form-label">Goods Description</label><input className="form-input" value={form.goods_desc || ''} onChange={e => f('goods_desc', e.target.value)} placeholder="Description of goods" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" value={form.weight || ''} onChange={e => f('weight', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Packages</label><input className="form-input" type="number" value={form.packages || ''} onChange={e => f('packages', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Freight ₹</label><input className="form-input" type="number" value={form.freight || ''} onChange={e => f('freight', e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Pay Type</label>
          <select className="form-input" value={form.pay_type} onChange={e => f('pay_type', e.target.value)}>
            {LR_PAY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
            {LR_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {trips && trips.length > 0 && (
        <div className="form-group">
          <label className="form-label">Assign to Trip (Optional)</label>
          <select className="form-input" value={form.trip_id} onChange={e => f('trip_id', e.target.value)}>
            <option value="">— No Trip —</option>
            {trips.map(t => <option key={t.id} value={t.id}>{t.from_loc} → {t.to_loc} ({t.status})</option>)}
          </select>
        </div>
      )}
    </Modal>
  )
}

function TripDetail({ trip, vehicles, drivers, trips, onBack, onRefresh }) {
  const { show } = useToast()
  const [detail, setDetail] = useState(null)
  const [lrModal, setLrModal] = useState(false)
  const [editingLR, setEditingLR] = useState(null)
  const [editTripModal, setEditTripModal] = useState(false)

  const loadDetail = useCallback(async () => {
    const d = await getWithLRs(trip.id)
    setDetail(d)
  }, [trip.id])

  useEffect(() => { loadDetail() }, [loadDetail])

  const handleDeleteLR = async (lr) => {
    if (!window.confirm('Delete this LR?')) return
    try { await removeLR(lr.id); show('LR deleted', 'success'); loadDetail() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const vehicle = vehicles.find(v => v.id === trip.vehicle_id)
  const driver  = drivers.find(d => d.id === trip.driver_id)
  const sc      = statusColor(trip.status)

  return (
    <>
      <Header title={`${trip.from_loc} → ${trip.to_loc}`} onBack={onBack}
        rightAction={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditTripModal(true)}>Edit</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingLR(null); setLrModal(true) }}>+ LR</button>
          </div>
        }
      />
      <div className="page">
        <div className="card" style={{ borderLeft: `3px solid ${sc}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{trip.from_loc} → {trip.to_loc}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{vehicle?.name || 'N/A'} · {driver?.name || 'N/A'}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{formatDate(trip.start_date)}{trip.end_date ? ` — ${formatDate(trip.end_date)}` : ''}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: `${sc}18`, color: sc, textTransform: 'uppercase' }}>{trip.status}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
            {[
              { label: 'Revenue', value: formatCurrency(detail?.totalFreight || 0), color: 'var(--green)' },
              { label: 'Expenses', value: formatCurrency(detail?.totalExpenses || 0), color: 'var(--red)' },
              { label: 'P&L', value: formatCurrency(detail?.profit || 0), color: (detail?.profit || 0) >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'LRs', value: detail?.lrs?.length || 0, color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>LR / Bilty List</div>

        {(!detail?.lrs || detail.lrs.length === 0) ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No LRs yet</div>
            <div className="empty-desc">Add LRs to this trip</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditingLR(null); setLrModal(true) }}>+ Create LR</button>
          </div>
        ) : detail.lrs.map((lr) => {
          const payColor = payTypeColor(lr.pay_type)
          return (
            <div key={lr.id} className="card" style={{ borderLeft: `3px solid ${payColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>{lr.lr_no}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>{lr.consignor} → {lr.consignee}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{lr.from} → {lr.to}{lr.goods_desc ? ` · ${lr.goods_desc}` : ''}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${payColor}18`, color: payColor, textTransform: 'uppercase' }}>{lr.pay_type}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${statusColor(lr.status)}18`, color: statusColor(lr.status), textTransform: 'uppercase' }}>{lr.status}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{formatCurrency(lr.freight)}</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditingLR(lr); setLrModal(true) }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDeleteLR(lr)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <LRForm open={lrModal} onClose={() => setLrModal(false)} onSaved={loadDetail} editing={editingLR} tripId={trip.id} trips={trips} />
      <TripForm open={editTripModal} onClose={() => setEditTripModal(false)} onSaved={() => { onRefresh(); onBack() }} editing={trip} vehicles={vehicles} drivers={drivers} />
    </>
  )
}

export default function Trips() {
  const { show } = useToast()
  const [mainTab, setMainTab] = useState('trips')
  const [trips, setTrips]     = useState([])
  const [allLRs, setAllLRs]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [lrFilter, setLrFilter] = useState('All')
  const [search, setSearch]     = useState('')
  const [tripModal, setTripModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [lrModal, setLrModal] = useState(false)
  const [editingLR, setEditingLR] = useState(null)
  const [selectedTrip, setSelectedTrip] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, v, d, lrs] = await Promise.all([getTrips(), getVehicles(), getDrivers(), getLRs()])
      setTrips(t); setVehicles(v); setDrivers(d); setAllLRs(lrs)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDeleteTrip = async (t) => {
    if (!window.confirm(`Delete trip "${t.from_loc} → ${t.to_loc}"?`)) return
    try { await removeTrip(t.id); show('Trip deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const handleDeleteLR = async (lr) => {
    if (!window.confirm('Delete this LR?')) return
    try { await removeLR(lr.id); show('LR deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const filteredTrips = trips.filter(t => {
    if (filter !== 'All' && t.status !== filter) return false
    if (search && !t.from_loc?.toLowerCase().includes(search.toLowerCase()) && !t.to_loc?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredLRs = allLRs.filter(lr => {
    if (lrFilter !== 'All' && lr.pay_type !== lrFilter && lr.status !== lrFilter) return false
    if (search && !lr.lr_no?.toLowerCase().includes(search.toLowerCase()) && !lr.consignor?.toLowerCase().includes(search.toLowerCase()) && !lr.consignee?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (selectedTrip) {
    return <TripDetail trip={selectedTrip} vehicles={vehicles} drivers={drivers} trips={trips} onBack={() => { setSelectedTrip(null); load() }} onRefresh={load} />
  }

  return (
    <>
      <Header title="Trips & LR / Bilty"
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => {
            if (mainTab === 'trips') { setEditingTrip(null); setTripModal(true) }
            else { setEditingLR(null); setLrModal(true) }
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        }
      />
      <div className="page">
        {/* Main tabs */}
        <div className="tabs">
          <button className={`tab${mainTab === 'trips' ? ' active' : ''}`} onClick={() => setMainTab('trips')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Trips
          </button>
          <button className={`tab${mainTab === 'lr' ? ' active' : ''}`} onClick={() => setMainTab('lr')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg>
            LR / Bilty
          </button>
        </div>

        {/* TRIPS TAB */}
        {mainTab === 'trips' && (
          <>
            {/* Stats */}
            {!loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { label: 'Total', value: trips.length, color: '#94a3b8' },
                  { label: 'Planned', value: trips.filter(t => t.status === 'Planned').length, color: '#f59e0b' },
                  { label: 'Active', value: trips.filter(t => t.status === 'Active').length, color: '#3b82f6' },
                  { label: 'Done', value: trips.filter(t => t.status === 'Completed').length, color: '#10b981' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['All', 'Planned', 'Active', 'Completed'].map(f => (
                <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>

            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search from/to…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading && <div className="loading"><span className="spinner" />Loading…</div>}
            {!loading && filteredTrips.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🚚</div>
                <div className="empty-title">No trips found</div>
                <div className="empty-desc">{search || filter !== 'All' ? 'No results for current filter' : 'Start by creating a new trip'}</div>
                {!search && filter === 'All' && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditingTrip(null); setTripModal(true) }}>+ New Trip</button>}
              </div>
            )}

            {!loading && filteredTrips.map((t, idx) => {
              const sc      = statusColor(t.status)
              const vehicle = vehicles.find(v => v.id === t.vehicle_id)
              const driver  = drivers.find(d => d.id === t.driver_id)
              return (
                <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer', animation: `fadeUp 0.3s ease ${idx*0.04}s both` }}
                  onClick={() => setSelectedTrip(t)}
                  onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{t.from_loc} → {t.to_loc}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${sc}18`, color: sc, textTransform: 'uppercase' }}>{t.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>
                        {vehicle?.name || 'N/A'} ({vehicle?.reg_no || ''}) · {driver?.name || 'No driver'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                        {formatDate(t.start_date)}{t.end_date ? ` → ${formatDate(t.end_date)}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => { setEditingTrip(t); setTripModal(true) }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-icon" style={{ width: 30, height: 30, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDeleteTrip(t)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* LR / BILTY TAB */}
        {mainTab === 'lr' && (
          <>
            {/* Summary */}
            {!loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Total LRs', value: allLRs.length, color: '#3b82f6' },
                  { label: 'To-Pay', value: allLRs.filter(l => l.pay_type === 'To-Pay').length, color: '#f59e0b' },
                  { label: 'Delivered', value: allLRs.filter(l => l.status === 'Delivered').length, color: '#10b981' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['All', 'Paid', 'To-Pay', 'To-Be-Billed', 'Delivered'].map(f => (
                <button key={f} className={`filter-chip${lrFilter === f ? ' active' : ''}`} onClick={() => setLrFilter(f)}>{f}</button>
              ))}
            </div>

            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search LR no, consignor…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading && <div className="loading"><span className="spinner" />Loading…</div>}
            {!loading && filteredLRs.length === 0 && (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No LRs found</div>
                <div className="empty-desc">Create your first LR / Bilty</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditingLR(null); setLrModal(true) }}>+ Create LR</button>
              </div>
            )}

            {!loading && filteredLRs.map((lr, idx) => {
              const payColor = payTypeColor(lr.pay_type)
              const trip = trips.find(t => t.id === lr.trip_id)
              return (
                <div key={lr.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${payColor}`, borderRadius: 12, padding: '14px', marginBottom: 10, animation: `fadeUp 0.3s ease ${idx*0.04}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{lr.lr_no}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${payColor}18`, color: payColor, textTransform: 'uppercase' }}>{lr.pay_type}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${statusColor(lr.status)}18`, color: statusColor(lr.status), textTransform: 'uppercase' }}>{lr.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{lr.consignor} → {lr.consignee}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{lr.from} → {lr.to} · {formatDate(lr.date)}</div>
                      {trip && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>Trip: {trip.from_loc} → {trip.to_loc}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{formatCurrency(lr.freight)}</div>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditingLR(lr); setLrModal(true) }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDeleteLR(lr)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      <TripForm open={tripModal} onClose={() => setTripModal(false)} onSaved={load} editing={editingTrip} vehicles={vehicles} drivers={drivers} />
      <LRForm open={lrModal} onClose={() => setLrModal(false)} onSaved={load} editing={editingLR} tripId={null} trips={trips} />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share } from '@capacitor/share'
import { getAll as getTrips, add as addTrip, update as updateTrip, remove as removeTrip, getWithLRs } from '../services/tripService.js'
import { getAll as getLRs, add as addLR, update as updateLR, remove as removeLR, autoLRNumber, getByTrip } from '../services/lrService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { getAll as getDrivers } from '../services/driverService.js'
import { getByTrip as getMilestones, add as addMilestone, remove as removeMilestone, STAGES } from '../services/milestoneService.js'
import { getByTrip as getChecklist, upsert as upsertChecklist, addItem as addChecklistItem, remove as removeChecklistItem } from '../services/checklistService.js'
import { getDistanceKm } from '../services/apiUtils.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const DEFAULT_CHECKLIST = ['Tyres checked', 'Documents verified', 'Goods loaded & sealed', 'Driver license valid', 'Vehicle fitness valid', 'Toll Fastag active', 'Emergency kit present']

function printLR(lr, tripInfo) {
  const s = (() => { try { return JSON.parse(localStorage.getItem('transportSettings') || '{}') } catch { return {} } })()
  const company = s.companyName || 'Transport Company'
  const address = [s.address, s.city, s.state].filter(Boolean).join(', ')
  const phone   = s.phone || ''
  const gstin   = s.gstin || ''

  const html = `<!DOCTYPE html><html><head><title>LR - ${lr.lr_no}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}body{padding:20px;color:#000;font-size:13px}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px}.company{font-size:20px;font-weight:bold;margin-bottom:4px}.sub{font-size:11px;color:#555;margin:2px 0}.title-badge{display:inline-block;background:#000;color:#fff;font-size:13px;font-weight:bold;padding:4px 20px;margin:8px 0}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #ccc;margin:10px 0}.field{padding:8px 10px;border-right:1px solid #ccc;border-bottom:1px solid #ccc}.field:nth-child(even){border-right:none}.label{font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;letter-spacing:.5px}.value{font-size:13px;font-weight:600;margin-top:3px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#f0f0f0;border:1px solid #000;padding:6px 8px;font-size:11px;text-align:left}td{border:1px solid #ccc;padding:6px 8px;font-size:12px}.footer{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}.sign-block{text-align:center}.sign-line{border-top:1px solid #000;margin-top:50px;padding-top:5px;font-size:10px;color:#555}.note{font-size:9px;color:#999;text-align:center;margin-top:14px}@media print{body{padding:8px}button{display:none}}</style></head>
  <body>
  <div class="header">
    <div class="company">${company}</div>
    ${address ? `<div class="sub">${address}</div>` : ''}
    ${phone ? `<div class="sub">Phone: ${phone}</div>` : ''}
    ${gstin ? `<div class="sub">GSTIN: ${gstin}</div>` : ''}
    <div class="title-badge">LORRY RECEIPT / BILTY</div>
  </div>
  <div class="grid2">
    <div class="field"><div class="label">LR Number</div><div class="value">${lr.lr_no}</div></div>
    <div class="field"><div class="label">Date</div><div class="value">${lr.date || ''}</div></div>
    <div class="field"><div class="label">Consignor (Sender)</div><div class="value">${lr.consignor}</div></div>
    <div class="field"><div class="label">Consignee (Receiver)</div><div class="value">${lr.consignee}</div></div>
    <div class="field"><div class="label">From</div><div class="value">${lr.from || ''}</div></div>
    <div class="field"><div class="label">To</div><div class="value">${lr.to || ''}</div></div>
  </div>
  <table>
    <tr><th>Goods Description</th><th>Weight (kg)</th><th>Packages</th><th>Freight (₹)</th><th>Pay Type</th></tr>
    <tr><td>${lr.goods_desc || '—'}</td><td>${lr.weight || 0}</td><td>${lr.packages || 0}</td><td><strong>₹${(lr.freight || 0).toLocaleString('en-IN')}</strong></td><td>${lr.pay_type}</td></tr>
  </table>
  ${tripInfo ? `<div style="border:1px solid #ccc;padding:6px 10px;margin:6px 0;font-size:11px"><span style="color:#888;font-size:9px;text-transform:uppercase;font-weight:bold">Vehicle / Trip: </span>${tripInfo}</div>` : ''}
  <div style="border:1px solid #ccc;padding:6px 10px;margin:6px 0;font-size:11px"><span style="color:#888;font-size:9px;text-transform:uppercase;font-weight:bold">Status: </span>${lr.status}</div>
  <div class="footer">
    <div class="sign-block"><div class="sign-line">Consignor Signature & Stamp</div></div>
    <div class="sign-block"><div class="sign-line">Transporter Signature & Stamp</div></div>
  </div>
  <div class="note">This is a computer generated document — ${company}</div>
  </body></html>`

  const w = window.open('', '_blank', 'width=820,height=680')
  if (!w) { alert('Please allow popups to print LR'); return }
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}

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
  const blank = { vehicle_id: '', driver_id: '', from_loc: '', to_loc: '', start_date: todayStr(), end_date: '', status: 'Planned', notes: '', est_freight: '', est_diesel: '', est_toll: '', est_bata: '', est_other: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [showEstimator, setShowEstimator] = useState(false)

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

      {/* Profit Estimator */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
        <button type="button" onClick={() => setShowEstimator(s => !s)}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6"/><path d="M15 19V9a2 2 0 00-2-2H9a2 2 0 00-2 2"/><path d="M21 19V3"/></svg>
          {showEstimator ? 'Hide Estimator' : 'Profit Estimator'}
        </button>
        {showEstimator && (() => {
          const freight = Number(form.est_freight) || 0
          const costs = (Number(form.est_diesel) || 0) + (Number(form.est_toll) || 0) + (Number(form.est_bata) || 0) + (Number(form.est_other) || 0)
          const profit = freight - costs
          return (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group"><label className="form-label">Expected Freight ₹</label><input className="form-input" type="number" value={form.est_freight} onChange={e => f('est_freight', e.target.value)} placeholder="0"/></div>
                <div className="form-group"><label className="form-label">Est. Diesel ₹</label><input className="form-input" type="number" value={form.est_diesel} onChange={e => f('est_diesel', e.target.value)} placeholder="0"/></div>
                <div className="form-group"><label className="form-label">Est. Toll ₹</label><input className="form-input" type="number" value={form.est_toll} onChange={e => f('est_toll', e.target.value)} placeholder="0"/></div>
                <div className="form-group"><label className="form-label">Driver Bata ₹</label><input className="form-input" type="number" value={form.est_bata} onChange={e => f('est_bata', e.target.value)} placeholder="0"/></div>
              </div>
              <div className="form-group"><label className="form-label">Other Costs ₹</label><input className="form-input" type="number" value={form.est_other} onChange={e => f('est_other', e.target.value)} placeholder="0"/></div>
              <div style={{ background: profit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${profit >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Freight {formatCurrency(freight)} − Costs {formatCurrency(costs)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Margin: {freight > 0 ? Math.round((profit/freight)*100) + '%' : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'right' }}>Est. Profit</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: profit >= 0 ? '#10b981' : '#ef4444' }}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </Modal>
  )
}

function LRForm({ open, onClose, onSaved, editing, tripId, trips }) {
  const { show } = useToast()
  const blank = { lr_no: '', date: todayStr(), consignor: '', consignee: '', from: '', to: '', goods_desc: '', weight: '', packages: '', freight: '', pay_type: 'To-Pay', status: 'Created', trip_id: tripId || '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [distLoading, setDistLoading] = useState(false)
  const [distKm, setDistKm] = useState(null)

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
        <div className="form-group"><label className="form-label">From</label><input className="form-input" value={form.from || ''} onChange={e => { f('from', e.target.value); setDistKm(null) }} placeholder="Origin" /></div>
        <div className="form-group"><label className="form-label">To</label><input className="form-input" value={form.to || ''} onChange={e => { f('to', e.target.value); setDistKm(null) }} placeholder="Destination" /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: -4 }}>
        <button type="button" disabled={distLoading || !form.from || !form.to}
          onClick={async () => {
            setDistLoading(true); setDistKm(null)
            const km = await getDistanceKm(form.from, form.to)
            setDistLoading(false)
            if (km) setDistKm(km)
            else show('Could not calculate distance (network needed)', 'error')
          }}
          style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
          {distLoading ? <span className="spinner spinner-sm"/> : '📍 Get Distance'}
        </button>
        {distKm && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>~{distKm} km via road</span>}
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
  const [milestones, setMilestones] = useState([])
  const [mlModal, setMlModal] = useState(false)
  const [mlForm, setMlForm] = useState({ stage: 'Departed', location: '', notes: '', km_reading: '' })
  const [detailTab, setDetailTab] = useState('lrs')
  const [checklist, setChecklist] = useState([])
  const [newCheckItem, setNewCheckItem] = useState('')

  const loadChecklist = useCallback(async () => {
    const existing = await getChecklist(trip.id)
    // Merge with defaults — add any missing default items
    const existingItems = new Set(existing.map(c => c.item))
    const missing = DEFAULT_CHECKLIST.filter(i => !existingItems.has(i))
    for (const item of missing) await upsertChecklist(trip.id, item, false)
    setChecklist(await getChecklist(trip.id))
  }, [trip.id])

  const loadMilestones = useCallback(async () => {
    const ml = await getMilestones(trip.id)
    setMilestones(ml)
  }, [trip.id])

  const loadDetail = useCallback(async () => {
    const d = await getWithLRs(trip.id)
    setDetail(d)
    loadMilestones()
    loadChecklist()
  }, [trip.id, loadMilestones, loadChecklist])

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

        {/* Detail Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'lrs', label: `LRs (${detail?.lrs?.length || 0})` },
            { id: 'milestones', label: 'Milestones' },
            { id: 'checklist', label: `Checklist (${checklist.filter(c=>c.checked).length}/${checklist.length})` },
            { id: 'load', label: 'Load Plan' },
          ].map(t => (
            <button key={t.id} className={`filter-chip${detailTab===t.id?' active':''}`} onClick={() => setDetailTab(t.id)} style={{ whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>

        {detailTab === 'lrs' && (!detail?.lrs || detail.lrs.length === 0) && (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No LRs yet</div>
            <div className="empty-desc">Add LRs to this trip</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditingLR(null); setLrModal(true) }}>+ Create LR</button>
          </div>
        )}
        {detailTab === 'lrs' && detail?.lrs?.map((lr) => {
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
                    <button className="btn-icon" title="Print LR" style={{ width: 28, height: 28, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: 'none' }}
                      onClick={() => {
                        const tripInfo = vehicle && driver ? `${vehicle.name} (${vehicle.reg_no}) · ${driver.name}` : ''
                        printLR(lr, tripInfo)
                      }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    </button>
                    <button className="btn-icon" title="Share LR" style={{ width: 28, height: 28, color: '#25D366', background: 'rgba(37,211,102,0.1)', border: 'none' }}
                      onClick={async () => {
                        const text = `*LR No: ${lr.lr_no}*\nFrom: ${lr.from_loc} → ${lr.to_loc}\nConsignor: ${lr.consignor}\nConsignee: ${lr.consignee}\nGoods: ${lr.goods_desc||'-'}\nWeight: ${lr.weight||0} kg\nFreight: ₹${(lr.freight||0).toLocaleString('en-IN')}\nPay Type: ${lr.pay_type}\nStatus: ${lr.status}`
                        try { await Share.share({ text, dialogTitle: 'Share LR' }) } catch {}
                      }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 0C5.149 0 0 5.148 0 11.5c0 2.004.521 3.882 1.432 5.51L.035 23.2l6.354-1.666A11.445 11.445 0 0011.5 23C17.851 23 23 17.851 23 11.5S17.851 0 11.5 0zm0 21.077a9.546 9.546 0 01-4.863-1.327l-.349-.207-3.614.948.965-3.524-.228-.362A9.537 9.537 0 012 11.5C2 6.262 6.262 2 11.5 2S21 6.262 21 11.5 16.738 21.077 11.5 21.077z"/></svg>
                    </button>
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

        {/* Milestones Tab */}
        {detailTab === 'milestones' && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['Departed','Reached','Delivered'].map(stage => (
                <button key={stage} className="btn btn-secondary btn-sm" onClick={async () => {
                  await addMilestone({ trip_id: trip.id, stage, datetime: new Date().toISOString() })
                  loadMilestones(); show(`Marked: ${stage}`, 'success')
                }}>+ {stage}</button>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => setMlModal(true)}>+ Custom</button>
            </div>
            {milestones.length > 0 ? (
              <div style={{ position: 'relative', paddingLeft: 22 }}>
                <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)', borderRadius: 2 }} />
                {milestones.map((ml) => (
                  <div key={ml.id} style={{ position: 'relative', marginBottom: 10, paddingLeft: 16 }}>
                    <div style={{ position: 'absolute', left: -13, top: 6, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }} />
                    <div className="card" style={{ padding: '8px 12px', margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{ml.stage}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--text2)' }}>{ml.datetime ? new Date(ml.datetime).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}</div>
                          <button className="btn-icon" style={{ width: 22, height: 22, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={async () => { await removeMilestone(ml.id); loadMilestones() }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </div>
                      {ml.location && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{ml.location}</div>}
                      {ml.notes && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{ml.notes}</div>}
                      {ml.km_reading ? <div style={{ fontSize: 10, color: 'var(--text2)' }}>KM: {ml.km_reading}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '20px 0' }}>No milestones yet</div>
            )}
          </>
        )}

        {/* Checklist Tab */}
        {detailTab === 'checklist' && (
          <>
            <div style={{ marginBottom: 12 }}>
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6, cursor: 'pointer' }}
                  onClick={async () => { await upsertChecklist(trip.id, item.item, !item.checked); loadChecklist() }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.checked ? '#10b981' : 'var(--border)'}`, background: item.checked ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {item.checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.checked ? 'var(--text2)' : 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none', flex: 1 }}>{item.item}</span>
                  <button style={{ width: 20, height: 20, border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={async e => { e.stopPropagation(); await removeChecklistItem(item.id); loadChecklist() }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} placeholder="Add custom item..." style={{ flex: 1 }}
                onKeyDown={async e => { if (e.key === 'Enter' && newCheckItem.trim()) { await addChecklistItem(trip.id, newCheckItem.trim()); setNewCheckItem(''); loadChecklist() } }} />
              <button className="btn btn-primary btn-sm" onClick={async () => { if (newCheckItem.trim()) { await addChecklistItem(trip.id, newCheckItem.trim()); setNewCheckItem(''); loadChecklist() } }}>Add</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 10, textAlign: 'center' }}>
              {checklist.filter(c => c.checked).length} of {checklist.length} items completed
            </div>
          </>
        )}

        {/* Load Planning Tab */}
        {detailTab === 'load' && (
          <>
            {(() => {
              const totalWeight = (detail?.lrs || []).reduce((s, l) => s + (Number(l.weight) || 0), 0)
              const capacity = Number(vehicle?.capacity_kg) || 0
              const pct = capacity > 0 ? Math.min(100, Math.round((totalWeight / capacity) * 100)) : 0
              const overloaded = capacity > 0 && totalWeight > capacity
              return (
                <>
                  {capacity > 0 && (
                    <div className="card" style={{ marginBottom: 14, borderTop: `2px solid ${overloaded ? '#ef4444' : '#10b981'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Load: {totalWeight} kg</span>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Capacity: {capacity} kg</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--surface2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 5, background: overloaded ? '#ef4444' : '#10b981', width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: 11, marginTop: 6, color: overloaded ? '#ef4444' : 'var(--text2)', fontWeight: overloaded ? 700 : 400 }}>
                        {overloaded ? `⚠ Overloaded by ${totalWeight - capacity} kg` : `${capacity - totalWeight} kg remaining capacity (${pct}% used)`}
                      </div>
                    </div>
                  )}
                  {!capacity && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Set vehicle capacity in Vehicles to see load bar</div>}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>LR Weight Breakdown</div>
                  {(detail?.lrs || []).map(lr => (
                    <div key={lr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{lr.lr_no}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{lr.goods_desc || '—'} · {lr.packages || 0} pkgs</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{lr.weight || 0} kg</div>
                    </div>
                  ))}
                  <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text2)', fontSize: 12 }}>Total Load</span>
                    <span style={{ color: 'var(--text)', fontSize: 14 }}>{totalWeight} kg</span>
                  </div>
                </>
              )
            })()}
          </>
        )}
      </div>

      <LRForm open={lrModal} onClose={() => setLrModal(false)} onSaved={loadDetail} editing={editingLR} tripId={trip.id} trips={trips} />
      <TripForm open={editTripModal} onClose={() => setEditTripModal(false)} onSaved={() => { onRefresh(); onBack() }} editing={trip} vehicles={vehicles} drivers={drivers} />
      <Modal isOpen={mlModal} onClose={() => setMlModal(false)} title="Add Milestone"
        footer={<>
          <button className="btn btn-secondary flex-1" onClick={() => setMlModal(false)}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={async () => {
            await addMilestone({ trip_id: trip.id, ...mlForm, km_reading: Number(mlForm.km_reading) || 0 })
            show('Milestone added!', 'success'); setMlModal(false); loadMilestones()
          }}>Add</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Stage</label>
          <select className="form-input" value={mlForm.stage} onChange={e => setMlForm(p => ({ ...p, stage: e.target.value }))}>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Location (Optional)</label><input className="form-input" value={mlForm.location} onChange={e => setMlForm(p => ({ ...p, location: e.target.value }))} placeholder="City or place name" /></div>
        <div className="form-group"><label className="form-label">KM Reading (Optional)</label><input className="form-input" type="number" value={mlForm.km_reading} onChange={e => setMlForm(p => ({ ...p, km_reading: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={mlForm.notes} onChange={e => setMlForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes" /></div>
      </Modal>
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
